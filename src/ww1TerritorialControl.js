import intersect from "@turf/intersect";
import { featureCollection } from "@turf/helpers";

const FRONT_LATITUDES = [57, 55, 53, 51, 49, 47];
const toMonthIndex = (month) => {
  const [year, value] = month.split("-").map(Number);
  return year * 12 + value - 1;
};

let historicalLandPromise;
const loadHistoricalLand = () => {
  if (!historicalLandPromise) {
    historicalLandPromise = fetch("/data/world-1914.geojson")
      .then((response) => response.json())
      .then(({ features }) => features);
  }
  return historicalLandPromise;
};

const interpolateFrame = (month, keyframes) => {
  const frames = keyframes.map((frame) => ({ ...frame, index: toMonthIndex(frame.month) }));
  const selected = toMonthIndex(month);
  const nextIndex = frames.findIndex(({ index }) => index >= selected);
  if (nextIndex <= 0) return frames[Math.max(0, nextIndex)];
  if (nextIndex === -1) return frames.at(-1);
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  const progress = (selected - previous.index) / (next.index - previous.index);
  return {
    ...previous,
    frontLongitudes: previous.frontLongitudes.map((longitude, index) => (
      longitude + (next.frontLongitudes[index] - longitude) * progress
    )),
  };
};

const clip = (land, controlArea) => {
  try {
    const result = intersect(featureCollection([land, controlArea]));
    if (!result) return [];
    result.properties = { kind: "central-control" };
    return [result];
  } catch {
    return [];
  }
};

export const getWw1TerritorialControl = async (month, keyframes) => {
  if (!month || !keyframes.length) return featureCollection([]);
  const frame = interpolateFrame(month, keyframes);
  const front = frame.frontLongitudes.map((longitude, index) => [longitude, FRONT_LATITUDES[index]]);
  const controlArea = {
    type: "Feature",
    properties: { kind: "central-control" },
    geometry: {
      type: "Polygon",
      coordinates: [[[16, 57], ...front, [16, 47], [16, 57]]],
    },
  };
  const land = await loadHistoricalLand();
  const russianLand = land.filter(({ properties }) => (
    properties.NAME === "Russia" || properties.SUBJECTO === "Russia"
  ));
  const occupied = new Set(frame.occupiedCountries);
  const fullyOccupied = land
    .filter(({ properties }) => occupied.has(properties.NAME) || occupied.has(properties.SUBJECTO))
    .map((feature) => ({ ...feature, properties: { kind: "central-control" } }));

  return featureCollection([
    ...russianLand.flatMap((feature) => clip(feature, controlArea)),
    ...fullyOccupied,
    { type: "Feature", properties: { kind: "front-line" }, geometry: { type: "LineString", coordinates: front } },
  ]);
};
