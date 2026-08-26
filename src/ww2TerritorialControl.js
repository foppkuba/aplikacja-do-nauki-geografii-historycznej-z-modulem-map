const toMonthIndex = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return year * 12 + month - 1;
};

// Schematyczne położenie frontu wschodniego (długości geograficzne)
// na pięciu równoleżnikach. Punkty pośrednie są interpolowane miesiąc po miesiącu.
const EASTERN_FRONT_KEYFRAMES = [
  ["1941-06", [24, 24, 24, 24, 24]],
  ["1941-12", [30, 33, 37.5, 37, 36]],
  ["1942-06", [30, 34, 39, 40, 41]],
  ["1942-11", [30, 34, 40, 43, 44.5]],
  ["1943-02", [29, 33, 39, 40, 40]],
  ["1943-08", [28, 31, 36, 36, 35]],
  ["1944-01", [27, 29, 33, 32, 31]],
  ["1944-06", [25, 27, 30, 29, 28]],
  ["1944-08", [22, 23, 24, 23, 22]],
  ["1945-01", [18, 19, 20, 19, 18]],
  ["1945-04", [13.5, 14, 14.5, 15, 16]],
].map(([month, longitudes]) => ({ month, index: toMonthIndex(month), longitudes }));

const FRONT_LATITUDES = [60, 56, 52, 48, 44];

const interpolateFront = (selectedMonth) => {
  const selectedIndex = toMonthIndex(selectedMonth);
  const nextIndex = EASTERN_FRONT_KEYFRAMES.findIndex((frame) => frame.index >= selectedIndex);
  if (nextIndex <= 0) return EASTERN_FRONT_KEYFRAMES[Math.max(0, nextIndex)].longitudes;
  if (nextIndex === -1) return EASTERN_FRONT_KEYFRAMES.at(-1).longitudes;

  const previous = EASTERN_FRONT_KEYFRAMES[nextIndex - 1];
  const next = EASTERN_FRONT_KEYFRAMES[nextIndex];
  const progress = (selectedIndex - previous.index) / (next.index - previous.index);
  return previous.longitudes.map((longitude, index) => (
    longitude + (next.longitudes[index] - longitude) * progress
  ));
};

export const getWw2TerritorialControl = (selectedMonth) => {
  if (!selectedMonth || selectedMonth < "1941-06" || selectedMonth > "1945-04") {
    return { type: "FeatureCollection", features: [] };
  }

  const front = interpolateFront(selectedMonth).map((longitude, index) => [longitude, FRONT_LATITUDES[index]]);
  const westernEdge = 20;
  const occupiedRing = [
    [westernEdge, FRONT_LATITUDES[0]],
    ...front.map(([longitude, latitude]) => [Math.max(westernEdge, longitude), latitude]),
    [westernEdge, FRONT_LATITUDES.at(-1)],
    [westernEdge, FRONT_LATITUDES[0]],
  ];

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "axis-control" },
        geometry: { type: "Polygon", coordinates: [occupiedRing] },
      },
      {
        type: "Feature",
        properties: { kind: "front-line" },
        geometry: { type: "LineString", coordinates: front },
      },
    ],
  };
};

const EASTERN_THEATER_COUNTRIES = new Set([
  "Poland", "USSR", "Soviet Union", "Estonia", "Latvia", "Lithuania", "Free City of Danzig",
]);
let historicalLandPromise;

const loadHistoricalLand = () => {
  if (!historicalLandPromise) {
    historicalLandPromise = fetch("/data/world-1938.geojson")
      .then((response) => {
        if (!response.ok) throw new Error(`Nie udało się pobrać granic historycznych (${response.status}).`);
        return response.json();
      })
      .then((collection) => collection.features);
  }
  return historicalLandPromise;
};

const isBetween = (month, start, end = "1945-05") => month >= start && month < end;

const getAxisOccupiedCountries = (month) => {
  const occupied = new Set(["Czechoslovakia", "Albania"]);
  if (isBetween(month, "1939-09", "1944-07")) occupied.add("Poland");
  if (isBetween(month, "1940-04")) occupied.add("Denmark").add("Norway");
  if (isBetween(month, "1940-05", "1944-09")) {
    occupied.add("Belgium").add("Netherlands").add("Luxembourg");
  }
  if (isBetween(month, "1940-06", "1944-08")) occupied.add("France");
  if (isBetween(month, "1941-04", "1944-10")) occupied.add("Yugoslavia").add("Greece");
  return occupied;
};

const countryName = (feature) => feature.properties?.NAME;

const clipFeature = (land, controlArea) => {
  try {
    const clipped = intersect(featureCollection([land, controlArea]));
    if (!clipped) return [];
    clipped.properties = { kind: "axis-control" };
    return [clipped];
  } catch (error) {
    console.warn("Nie udało się przyciąć fragmentu kontroli terytorium:", error);
    return [];
  }
};

export const getClippedWw2TerritorialControl = async (selectedMonth) => {
  const control = getWw2TerritorialControl(selectedMonth);
  const controlArea = control.features.find((feature) => feature.properties.kind === "axis-control");
  const frontLine = control.features.find((feature) => feature.properties.kind === "front-line");
  if (!selectedMonth) return control;

  const landFeatures = await loadHistoricalLand();
  const occupiedCountries = getAxisOccupiedCountries(selectedMonth);
  const occupiedAreas = landFeatures
    .filter((feature) => occupiedCountries.has(countryName(feature)))
    .map((feature) => ({ ...feature, properties: { kind: "axis-control" } }));

  const easternAreas = controlArea
    ? landFeatures
      .filter((feature) => (
        EASTERN_THEATER_COUNTRIES.has(feature.properties?.NAME)
        || EASTERN_THEATER_COUNTRIES.has(feature.properties?.SUBJECTO)
      ))
      .flatMap((land) => clipFeature(land, controlArea))
    : [];

  const northernItaly = {
    type: "Feature",
    properties: { kind: "axis-control" },
    geometry: {
      type: "Polygon",
      coordinates: [[[6, 43.4], [14, 43.4], [14, 47.5], [6, 47.5], [6, 43.4]]],
    },
  };
  const italyAreas = isBetween(selectedMonth, "1943-09", "1945-05")
    ? landFeatures.filter((feature) => countryName(feature) === "Italy")
      .flatMap((land) => clipFeature(land, northernItaly))
    : [];

  return featureCollection([
    ...occupiedAreas,
    ...easternAreas,
    ...italyAreas,
    ...(frontLine ? [frontLine] : []),
  ]);
};
import intersect from "@turf/intersect";
import { featureCollection } from "@turf/helpers";
