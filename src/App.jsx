import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowRight, Check, ChevronDown, Clock3, Filter, Maximize2, Minus, Plus,
  Pause, Play, RotateCcw, Search, Sparkles,
} from "lucide-react";
import "./App.css";
import { fetchCountries, fetchEvents, fetchWarAlignments, fetchWarTerritorialKeyframes } from "./api/events";
import { getWw1TerritorialControl } from "./ww1TerritorialControl";
import { getActiveCampaignRoutes, getCampaignArrowheads } from "./ww2Campaigns";
import { getClippedWw2TerritorialControl } from "./ww2TerritorialControl";
import { getActiveNapoleonicRoutes, getNapoleonicArrowheads } from "./napoleonicCampaigns";
import QuizModule from "./QuizModule";
import AuthMenu from "./AuthMenu";

const MIN_YEAR = 1800;
const MAX_YEAR = 2025;
const START_YEAR = 1939;
const NAPOLEON_START_MONTH = 1803 * 12 + 4;
const NAPOLEON_END_MONTH = 1815 * 12 + 5;
const WW1_START_MONTH = 1914 * 12 + 6;
const WW1_END_MONTH = 1918 * 12 + 10;
const WW2_START_MONTH = 1939 * 12 + 8;
const WW2_END_MONTH = 1945 * 12 + 4;
const POLISH_MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const monthKeyFromIndex = (index) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
const monthIndexFromKey = (key) => {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + month - 1;
};
const formatMonthKey = (key) => {
  const [year, month] = key.split("-").map(Number);
  return `${POLISH_MONTHS[month - 1]} ${year}`;
};
const OHM_STYLE = "https://www.openhistoricalmap.org/map-styles/main/main.json";
const EUROPE_BOUNDS = [[-25, 34], [45, 72]];
const isEventInEurope = ({ coordinates: [longitude, latitude] }) => (
  longitude >= EUROPE_BOUNDS[0][0]
  && longitude <= EUROPE_BOUNDS[1][0]
  && latitude >= EUROPE_BOUNDS[0][1]
  && latitude <= EUROPE_BOUNDS[1][1]
);

const focusMapOnCountry = (map, events, country, countryDetails) => {
  if (!country) {
    map.fitBounds(EUROPE_BOUNDS, { padding: 36, duration: 700 });
    return;
  }

  const coordinates = events
    .filter((event) => event.country === country)
    .map((event) => event.coordinates)
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));

  if (coordinates.length === 0) {
    if (countryDetails) {
      map.easeTo({
        center: [Number(countryDetails.longitude), Number(countryDetails.latitude)],
        zoom: Number(countryDetails.zoom),
        duration: 700,
      });
    }
    return;
  }
  if (coordinates.length === 1) {
    map.easeTo({ center: coordinates[0], zoom: 5.5, duration: 700 });
    return;
  }

  const bounds = coordinates.reduce(
    (countryBounds, coordinate) => countryBounds.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );
  map.fitBounds(bounds, { padding: 90, maxZoom: 5.5, duration: 700 });
};
const TIMELINE_PERIODS = [
  { label: "Epoka napoleońska", range: "1803–1815", start: 1803, end: 1815 },
  { label: "XIX wiek", range: "1816–1913", start: 1816, end: 1913 },
  { label: "I wojna światowa", range: "1914–1918", start: 1914, end: 1918 },
  { label: "Dwudziestolecie", range: "1919–1938", start: 1919, end: 1938 },
  { label: "II wojna światowa", range: "1939–1945", start: 1939, end: 1945 },
  { label: "Zimna wojna", range: "1946–1991", start: 1946, end: 1991 },
  { label: "Współczesność", range: "1992–2025", start: 1992, end: 2025 },
];

const updateEventMarkers = (map, events, year, selectedMonth, markerStore, filters = {}) => {
  markerStore.forEach((marker) => marker.remove());
  markerStore.length = 0;

  const visibleEvents = events.filter((event) => (
    (selectedMonth ? event.date.startsWith(selectedMonth) : event.year === Number(year))
    && (!filters.country || event.country === filters.country)
    && (!filters.category || event.category === filters.category)
  ));
  visibleEvents.forEach((event) => {
    const markerElement = document.createElement("button");
    markerElement.type = "button";
    markerElement.className = `history-marker history-marker--${event.type}`;
    markerElement.setAttribute("aria-label", `${event.title}, ${event.place}`);
    markerElement.innerHTML = '<span class="history-marker__pulse"></span><span class="history-marker__icon"></span>';

    const popupContent = document.createElement("article");
    popupContent.className = "event-popup";
    const category = document.createElement("span");
    category.className = "event-popup__category";
    category.textContent = event.type === "bitwa" ? "BITWA" : "WYDARZENIE";
    const title = document.createElement("h3");
    title.textContent = event.title;
    const tags = document.createElement("div");
    tags.className = "event-popup__tags";
    const countryTag = document.createElement("span");
    countryTag.className = "event-popup__tag event-popup__tag--country";
    countryTag.textContent = `Państwo: ${event.country}`;
    const categoryTag = document.createElement("span");
    categoryTag.className = "event-popup__tag event-popup__tag--category";
    categoryTag.textContent = `Kategoria: ${event.category}`;
    tags.append(countryTag, categoryTag);
    const meta = document.createElement("p");
    meta.className = "event-popup__meta";
    meta.textContent = `${event.date} · ${event.place}`;
    const description = document.createElement("p");
    description.textContent = event.description;
    popupContent.append(category, title, tags, meta, description);

    const popup = new maplibregl.Popup({ offset: 22, maxWidth: "310px", closeButton: true })
      .setDOMContent(popupContent);
    const marker = new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
      .setLngLat(event.coordinates)
      .setPopup(popup)
      .addTo(map);
    markerStore.push(marker);
  });

  return visibleEvents.length;
};

const campaignColors = {
  axis: "#c94836", ussr: "#8e2635", allies: "#24649a",
  france: "#315f9a", coalition: "#c94836",
};
const COUNTRY_COLORS = ["#d7a56d", "#75a58d", "#7899bd", "#c78678", "#9b8ab7", "#b6a65d"];
const COUNTRY_COLOR_GROUPS = [
  ["Polska", "Poland", "Portugal", "Portugalia", "Norway", "Norwegia", "Greece", "Grecja", "Ireland", "Irlandia"],
  ["Germany", "Niemcy", "German Reich", "Deutsches Reich", "Spain", "Hiszpania", "Finland", "Finlandia", "Bulgaria", "Bułgaria"],
  ["France", "Francja", "Sweden", "Szwecja", "Romania", "Rumunia", "Netherlands", "Niderlandy", "Holandia"],
  ["Italy", "Włochy", "United Kingdom", "Wielka Brytania", "Hungary", "Węgry", "Belgium", "Belgia"],
  ["Soviet Union", "USSR", "ZSRR", "Russia", "Rosja", "Yugoslavia", "Jugosławia", "Denmark", "Dania"],
  ["Czechoslovakia", "Czechosłowacja", "Austria", "Switzerland", "Szwajcaria", "Albania", "Turkey", "Turcja"],
];
const AXIS_COUNTRIES = [
  "Germany", "Niemcy", "German Reich", "Deutsches Reich", "Italy", "Włochy",
  "Hungary", "Węgry", "Slovakia", "Słowacja", "Independent State of Croatia", "Chorwacja",
];
const ALLIED_COUNTRIES = [
  "Poland", "Polska", "United Kingdom", "Wielka Brytania", "France", "Francja",
  "Belgium", "Belgia", "Netherlands", "Niderlandy", "Holandia", "Norway", "Norwegia",
  "Greece", "Grecja", "Yugoslavia", "Jugosławia", "Czechoslovakia", "Czechosłowacja",
];

const countryNameExpression = [
  "coalesce",
  ["get", "SUBJECTO"], ["get", "NAME_EN"], ["get", "ADMIN"], ["get", "NAME"], ["get", "name:en"],
  ["get", "name_en"], ["get", "name"], ["get", "name:pl"],
];

const getCountryPolygonUrl = (selectedMonth) => {
  if (!selectedMonth) return "/data/countries.geojson";
  if (selectedMonth <= "1918-11") return "/data/world-1914.geojson";
  return selectedMonth >= "1945-05" ? "/data/world-1945.geojson" : "/data/world-1938.geojson";
};

const getCountryFillExpression = (selectedMonth, ww1Alignments = []) => {
  if (!selectedMonth) {
    return [
      "match", countryNameExpression,
      ...COUNTRY_COLOR_GROUPS.flatMap((countries, index) => [countries, COUNTRY_COLORS[index]]),
      "#c8b98f",
    ];
  }

  if (selectedMonth <= "1815-06") {
    const france = ["France", "Kingfom of Italy", "Italy", "Belgium"];
    const coalition = ["United Kingdom of Great Britain and Ireland", "Portugal"];
    if (selectedMonth <= "1808-04") france.push("Spain");
    else coalition.push("Spain");
    if (selectedMonth >= "1807-07" && selectedMonth <= "1814-01") {
      france.push("Denmark", "Norway");
    }
    if (selectedMonth >= "1806-07" && selectedMonth <= "1813-02") {
      france.push("German Empire", "Germany");
    }
    if (selectedMonth >= "1806-06" && selectedMonth <= "1813-11") france.push("Netherlands");
    if (selectedMonth >= "1812-06" && selectedMonth <= "1812-12") {
      france.push("Austro-Hungarian Empire", "Austria-Hungary", "Austria");
    }
    if ((selectedMonth >= "1805-08" && selectedMonth <= "1805-12")
      || (selectedMonth >= "1809-04" && selectedMonth <= "1809-10")
      || selectedMonth >= "1813-08") coalition.push("Austro-Hungarian Empire", "Austria-Hungary", "Austria");
    if ((selectedMonth >= "1805-08" && selectedMonth <= "1807-07") || selectedMonth >= "1812-06") {
      coalition.push("Russian Empire", "Russia");
    }
    if ((selectedMonth >= "1806-08" && selectedMonth <= "1807-07") || selectedMonth >= "1813-03") {
      coalition.push("German Empire", "Germany", "Prussia");
    }
    return ["match", countryNameExpression, france, "#315f9a", coalition, "#c94836", "#b9b7a8"];
  }

  if (selectedMonth >= "1914-07" && selectedMonth <= "1918-11") {
    const central = [...new Set(
      ww1Alignments.filter(({ side }) => side === "central").flatMap(({ mapNames }) => mapNames),
    )];
    const centralNames = new Set(central);
    const entente = [...new Set(
      ww1Alignments.filter(({ side }) => side === "entente").flatMap(({ mapNames }) => mapNames),
    )].filter((name) => !centralNames.has(name));
    if (central.length === 0 || entente.length === 0) return "#b9b7a8";
    return ["match", countryNameExpression, central, "#c94836", entente, "#24649a", "#b9b7a8"];
  }

  const axis = [...AXIS_COUNTRIES];
  const allies = [...ALLIED_COUNTRIES];
  if (selectedMonth < "1943-09") axis.push("Romania", "Rumunia", "Bulgaria", "Bułgaria");
  else allies.push("Italy", "Włochy");
  if (selectedMonth >= "1941-06") allies.push("Soviet Union", "USSR", "ZSRR", "Russia", "Rosja");
  if (selectedMonth >= "1941-06" && selectedMonth < "1944-09") axis.push("Finland", "Finlandia");
  if (selectedMonth >= "1944-08") allies.push("Romania", "Rumunia");
  if (selectedMonth >= "1944-09") allies.push("Bulgaria", "Bułgaria");
  allies.push("USA", "United States of America", "United States");

  return ["match", countryNameExpression, axis, "#c94836", allies, "#24649a", "#b9b7a8"];
};

const updateCountryColors = (map, selectedMonth, ww1Alignments) => {
  if (!map.getLayer("chronomap-country-fill")) return;
  const isWw1 = Boolean(selectedMonth && selectedMonth >= "1914-07" && selectedMonth <= "1918-11");
  map.getSource("country-polygons")?.setData(getCountryPolygonUrl(selectedMonth));
  map.setPaintProperty("chronomap-country-fill", "fill-color", getCountryFillExpression(selectedMonth, ww1Alignments));
  map.setPaintProperty("chronomap-country-fill", "fill-opacity", isWw1 && !ww1Alignments.length ? 0 : selectedMonth ? 0.34 : 0.25);
};

let ww1ControlRevision = 0;
const updateWw1TerritorialControl = (map, selectedMonth, keyframes) => {
  const revision = ++ww1ControlRevision;
  getWw1TerritorialControl(selectedMonth, keyframes).then((data) => {
    if (revision === ww1ControlRevision) map.getSource("ww1-territorial-control")?.setData(data);
  });
};

const addWw1TerritorialControlLayers = (map, selectedMonth, keyframes) => {
  map.addSource("ww1-territorial-control", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  map.addLayer({
    id: "ww1-central-controlled-area",
    type: "fill",
    source: "ww1-territorial-control",
    filter: ["==", ["get", "kind"], "central-control"],
    paint: { "fill-color": "#c94836", "fill-opacity": 0.5 },
  }, firstSymbolLayer);
  map.addLayer({
    id: "ww1-eastern-front",
    type: "line",
    source: "ww1-territorial-control",
    filter: ["==", ["get", "kind"], "front-line"],
    paint: {
      "line-color": "#7d211e",
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 7, 4],
      "line-opacity": 0.9,
    },
  }, firstSymbolLayer);
  updateWw1TerritorialControl(map, selectedMonth, keyframes);
};

const addWw2TerritorialControlLayers = (map, selectedMonth) => {
  if (map.getSource("ww2-territorial-control")) return;
  map.addSource("ww2-territorial-control", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  map.addLayer({
    id: "ww2-axis-controlled-area",
    type: "fill",
    source: "ww2-territorial-control",
    filter: ["==", ["get", "kind"], "axis-control"],
    paint: { "fill-color": "#c94836", "fill-opacity": 0.42 },
  }, firstSymbolLayer);
  map.addLayer({
    id: "ww2-eastern-front",
    type: "line",
    source: "ww2-territorial-control",
    filter: ["==", ["get", "kind"], "front-line"],
    paint: {
      "line-color": "#7d211e",
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 7, 4],
      "line-opacity": 0.9,
    },
  }, firstSymbolLayer);
  updateWw2TerritorialControl(map, selectedMonth);
};

let territorialControlRevision = 0;
const updateWw2TerritorialControl = (map, selectedMonth) => {
  const revision = ++territorialControlRevision;
  getClippedWw2TerritorialControl(selectedMonth)
    .then((data) => {
      if (revision !== territorialControlRevision) return;
      map.getSource("ww2-territorial-control")?.setData(data);
    })
    .catch((error) => console.warn("Nie udało się zaktualizować kontroli terytorium:", error));
};

const getActiveWarCampaignRoutes = (selectedMonth) => (
  selectedMonth && selectedMonth <= "1815-06"
    ? getActiveNapoleonicRoutes(selectedMonth)
    : getActiveCampaignRoutes(selectedMonth)
);

const getWarCampaignArrowheads = (selectedMonth) => (
  selectedMonth && selectedMonth <= "1815-06"
    ? getNapoleonicArrowheads(selectedMonth)
    : getCampaignArrowheads(selectedMonth)
);

const addWarCampaignLayers = (map, selectedMonth) => {
  if (map.getSource("ww2-campaigns")) return;
  map.addSource("ww2-campaigns", { type: "geojson", data: getActiveWarCampaignRoutes(selectedMonth) });
  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;

  Object.entries(campaignColors).forEach(([side, color]) => {
    map.addLayer({
      id: `ww2-campaign-${side}`,
      type: "line",
      source: "ww2-campaigns",
      filter: ["==", ["get", "side"], side],
      layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
      paint: {
        "line-color": color,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 7],
        "line-opacity": 0.88,
        "line-dasharray": side === "allies" ? [1.5, 1.1] : [2.3, 1.2],
      },
    }, firstSymbolLayer);
  });
};

const updateWarCampaignData = (map, selectedMonth) => {
  const source = map.getSource("ww2-campaigns");
  if (source) source.setData(getActiveWarCampaignRoutes(selectedMonth));
};

const updateCampaignArrowheads = (map, selectedMonth, markerStore) => {
  markerStore.forEach((marker) => marker.remove());
  markerStore.length = 0;
  if (!selectedMonth) return;

  getWarCampaignArrowheads(selectedMonth).forEach((arrow) => {
    const [lng, lat] = arrow.coordinates;
    const [previousLng, previousLat] = arrow.previousCoordinates;
    const longitudeScale = Math.cos(((lat + previousLat) / 2) * Math.PI / 180);
    const angle = Math.atan2(lat - previousLat, (lng - previousLng) * longitudeScale) * (180 / Math.PI);
    const element = document.createElement("button");
    element.type = "button";
    element.className = `campaign-arrow campaign-arrow--${arrow.side}`;
    element.setAttribute("aria-label", arrow.title);

    const popupContent = document.createElement("article");
    popupContent.className = "event-popup campaign-popup";
    const category = document.createElement("span");
    category.className = "event-popup__category";
    category.textContent = "DZIAŁANIA WOJENNE";
    const title = document.createElement("h3");
    title.textContent = arrow.title;
    const description = document.createElement("p");
    description.textContent = arrow.description;
    popupContent.append(category, title, description);

    const marker = new maplibregl.Marker({
      element,
      anchor: "center",
      rotation: -angle,
      rotationAlignment: "map",
    })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 18, maxWidth: "300px" }).setDOMContent(popupContent))
      .addTo(map);
    markerStore.push(marker);
  });
};

const getOhmDateRange = (year, selectedMonth) => {
  if (!selectedMonth) return { start: Number(year), end: Number(year) + 0.999999 };

  const [monthYear, month] = selectedMonth.split("-").map(Number);
  return {
    start: monthYear + (month - 1) / 12,
    end: monthYear + month / 12 - 0.000001,
  };
};

const applyOhmDateFilter = (map, year, selectedMonth, baseFilters) => {
  const { start, end } = getOhmDateRange(year, selectedMonth);

  map.getStyle().layers.forEach((layer) => {
    if (!["ohm", "ohmAdmin"].includes(layer.source) || !layer["source-layer"]) return;

    if (!baseFilters.has(layer.id)) {
      baseFilters.set(layer.id, map.getFilter(layer.id) ?? null);
    }

    const originalFilter = baseFilters.get(layer.id);
    const dateFilter = [
      "all",
      ["any", ["!", ["has", "start_decdate"]], ["<=", ["to-number", ["get", "start_decdate"]], end]],
      ["any", ["!", ["has", "end_decdate"]], [">=", ["to-number", ["get", "end_decdate"]], start]],
    ];

    map.setFilter(
      layer.id,
      originalFilter ? ["all", originalFilter, dateFilter] : dateFilter,
    );
  });
};

const addVisibleCountryBoundaries = (map, selectedMonth, ww1Alignments) => {
  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;

  map.addSource("country-polygons", {
    type: "geojson",
    data: getCountryPolygonUrl(selectedMonth),
    attribution: "Historical polygons: historical-basemaps (GPL-3.0)",
  });

  map.addLayer({
    id: "chronomap-country-fill",
    type: "fill",
    source: "country-polygons",
    paint: {
      "fill-color": getCountryFillExpression(selectedMonth, ww1Alignments),
      "fill-opacity": selectedMonth && selectedMonth >= "1914-07" && selectedMonth <= "1918-11" && !ww1Alignments.length ? 0 : selectedMonth ? 0.34 : 0.25,
    },
  }, firstSymbolLayer);
};

const localizeCountryLabels = (map) => {
  const polishName = [
    "coalesce",
    ["get", "name:pl"],
    ["get", "name_pl"],
    ["get", "name"],
    ["get", "name:en"],
    ["get", "name_en"],
  ];
  const countryLayerPattern = /country|countries|nation|admin(?:istrative)?[-_ ]?(?:0|1|2|label)|boundary.*label/i;

  map.getStyle().layers.forEach((layer) => {
    if (layer.type !== "symbol" || !layer.layout?.["text-field"]) return;

    const layerDescription = [
      layer.id,
      layer["source-layer"],
      JSON.stringify(layer.filter ?? ""),
    ].join(" ");
    if (!countryLayerPattern.test(layerDescription)) return;

    try {
      map.setLayoutProperty(layer.id, "text-field", polishName);
    } catch (error) {
      console.warn(`Nie udało się spolszczyć warstwy ${layer.id}:`, error);
    }
  });
};

const modules = [
  ["PR", "Twoje postępy", "Obserwuj wyniki, ukończone epoki i czas poświęcony na naukę."],
  ["SN", "Ścieżki nauki", "Poznawaj historię krok po kroku dzięki uporządkowanym materiałom."],
];

function EventFilters({ countries, categories, countryFilter, categoryFilter, setCountryFilter, setCategoryFilter }) {
  const hasActiveFilters = Boolean(countryFilter || categoryFilter);

  return (
    <div className="event-filters" aria-label="Filtry wydarzeń historycznych">
      <div className="event-filters__title">
        <span className="event-filters__icon"><Filter size={16} /></span>
        <div><strong>Filtruj wydarzenia</strong><small>Wybierz państwo lub kategorię</small></div>
      </div>
      <label className="event-filter-field">
        <span>PAŃSTWO</span>
        <span className="event-filter-select">
          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="">Wszystkie państwa</option>
            {countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </label>
      <label className="event-filter-field">
        <span>KATEGORIA</span>
        <span className="event-filter-select">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Wszystkie kategorie</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </label>
      <button
        className="event-filters__reset"
        type="button"
        disabled={!hasActiveFilters}
        onClick={() => {
          setCountryFilter("");
          setCategoryFilter("");
        }}
      >
        <RotateCcw size={14} /> Wyczyść
      </button>
    </div>
  );
}

function HistoryMap({ events, countries, ww1Alignments, ww1TerritorialKeyframes, year, selectedMonth, countryFilter, categoryFilter }) {
  const selectedWw2Month = selectedMonth && selectedMonth >= "1939-09" ? selectedMonth : null;
  const selectedWw1Month = selectedMonth && selectedMonth >= "1914-07" && selectedMonth <= "1918-11" ? selectedMonth : null;
  const selectedNapoleonicMonth = selectedMonth && selectedMonth <= "1815-06" ? selectedMonth : null;
  const selectedCampaignMonth = selectedNapoleonicMonth || selectedWw2Month;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const styleReadyRef = useRef(false);
  const baseFiltersRef = useRef(new Map());
  const yearRef = useRef(year);
  const selectedMonthRef = useRef(selectedMonth);
  const filtersRef = useRef({ country: countryFilter, category: categoryFilter });
  const eventsRef = useRef(events);
  const ww1AlignmentsRef = useRef(ww1Alignments);
  const ww1TerritorialKeyframesRef = useRef(ww1TerritorialKeyframes);
  const eventMarkersRef = useRef([]);
  const campaignMarkersRef = useRef([]);
  const [status, setStatus] = useState("loading");
  const [ohmStatus, setOhmStatus] = useState("connecting");

  useEffect(() => {
    const map = mapRef.current;
    const countryDetails = countries.find((country) => country.name === countryFilter);
    if (map) focusMapOnCountry(map, events, countryFilter, countryDetails);
  }, [countryFilter, countries, events]);

  useEffect(() => {
    eventsRef.current = events;
    ww1AlignmentsRef.current = ww1Alignments;
    ww1TerritorialKeyframesRef.current = ww1TerritorialKeyframes;
    yearRef.current = year;
    selectedMonthRef.current = selectedMonth;
    filtersRef.current = { country: countryFilter, category: categoryFilter };
    const map = mapRef.current;
    if (map && styleReadyRef.current) {
      applyOhmDateFilter(map, year, selectedMonth, baseFiltersRef.current);
      updateCountryColors(map, selectedMonth, ww1Alignments);
      updateWw1TerritorialControl(map, selectedWw1Month, ww1TerritorialKeyframes);
      updateWw2TerritorialControl(map, selectedWw2Month);
      updateWarCampaignData(map, selectedCampaignMonth);
      map.triggerRepaint();
    }
    if (map) {
      updateEventMarkers(map, events, year, selectedMonth, eventMarkersRef.current, filtersRef.current);
    }
    if (map) updateCampaignArrowheads(map, selectedCampaignMonth, campaignMarkersRef.current);
  }, [events, ww1Alignments, ww1TerritorialKeyframes, year, selectedMonth, selectedNapoleonicMonth, selectedWw1Month, selectedWw2Month, selectedCampaignMonth, countryFilter, categoryFilter]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const baseFilters = baseFiltersRef.current;
    let styleReady = false;
    const loadTimeout = window.setTimeout(() => {
      if (!styleReady) setStatus("error");
    }, 15000);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OHM_STYLE,
      center: [18.7, 52.1],
      zoom: 3,
      minZoom: 2,
      maxZoom: 16,
      maxBounds: EUROPE_BOUNDS,
      renderWorldCopies: false,
      attributionControl: false,
    });

    mapRef.current = map;
    if (filtersRef.current.country) {
      focusMapOnCountry(map, eventsRef.current, filtersRef.current.country);
    }
    updateEventMarkers(
      map,
      eventsRef.current,
      yearRef.current,
      selectedMonthRef.current,
      eventMarkersRef.current,
      filtersRef.current,
    );
    const initialCampaignMonth = selectedMonthRef.current && (selectedMonthRef.current <= "1815-06" || selectedMonthRef.current >= "1939-09")
      ? selectedMonthRef.current
      : null;
    updateCampaignArrowheads(map, initialCampaignMonth, campaignMarkersRef.current);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.once("style.load", () => {
      styleReady = true;
      styleReadyRef.current = true;
      window.clearTimeout(loadTimeout);
      try {
        const initialWw2Month = selectedMonthRef.current && selectedMonthRef.current >= "1939-09"
          ? selectedMonthRef.current
          : null;
        const initialMonth = selectedMonthRef.current;
        addVisibleCountryBoundaries(map, initialMonth, ww1AlignmentsRef.current);
        addWw1TerritorialControlLayers(map, initialMonth && initialMonth >= "1914-07" && initialMonth <= "1918-11" ? initialMonth : null, ww1TerritorialKeyframesRef.current);
        addWw2TerritorialControlLayers(map, initialWw2Month);
        localizeCountryLabels(map);
        addWarCampaignLayers(map, initialCampaignMonth);
        applyOhmDateFilter(map, yearRef.current, initialMonth, baseFilters);
        map.triggerRepaint();
      } catch (error) {
        console.warn("Nie udało się zastosować filtra daty OHM:", error);
      }
      setStatus("ready");
      setOhmStatus("connected");
    });
    map.on("error", (event) => {
      // MapLibre emituje ten event również dla pojedynczych brakujących
      // kafli, glifów i ikon. Nie zasłaniamy przez to całej działającej mapy.
      if (event?.error) console.warn("Błąd zasobu mapy:", event.error);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      eventMarkersRef.current.forEach((marker) => marker.remove());
      eventMarkersRef.current = [];
      campaignMarkersRef.current.forEach((marker) => marker.remove());
      campaignMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
      baseFilters.clear();
    };
  }, []);

  const zoom = (amount) => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() + amount, { duration: 350 });
  };

  const toggleFullscreen = () => {
    const element = containerRef.current?.closest(".map-shell");
    if (!element) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else element.requestFullscreen();
  };

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label={`Mapa historyczna dla ${selectedMonth ? formatMonthKey(selectedMonth) : `roku ${year}`}`}
      />
      {status === "loading" && (
        <div className="map-message">
          <span className="loader" />
          <strong>Wczytywanie OpenHistoricalMap…</strong>
          <small>Pobieramy styl i kafle wektorowe OHM</small>
        </div>
      )}
      {status === "error" && (
        <div className="map-message error-message">
          <strong className="error-code">OHM</strong>
          <strong>Nie udało się wczytać mapy</strong>
          <small>Sprawdź połączenie i odśwież stronę.</small>
        </div>
      )}
      <div className={`map-badge ${ohmStatus === "error" ? "is-blocked" : ""}`}>
        <span className="live-dot" />
        {ohmStatus === "connected" && "OpenHistoricalMap — połączono"}
        {ohmStatus === "connecting" && "Łączenie z OpenHistoricalMap…"}
        {ohmStatus === "error" && "Problem z połączeniem OHM"}
      </div>
      {selectedWw2Month && (
        <div className="campaign-legend" aria-label="Legenda działań II wojny światowej">
          <strong>II wojna światowa</strong>
          <span><i className="legend-swatch legend-swatch--axis" />Państwa Osi</span>
          <span><i className="legend-swatch legend-swatch--allies" />Alianci</span>
          <span><i className="legend-swatch legend-swatch--neutral" />Neutralne / pozostałe</span>
          {selectedWw2Month >= "1941-06" && selectedWw2Month <= "1945-04" && (
            <span><i className="legend-front" />Schematyczna linia frontu</span>
          )}
          <small>
            Kolor pokazuje kontrolę terytorium w Europie i zmienia się wraz z kampaniami;
            granice administracyjne pochodzą z historycznych wielokątów OpenHistoricalMap.
          </small>
        </div>
      )}
      {selectedNapoleonicMonth && (
        <div className="campaign-legend" aria-label="Legenda wojen napoleońskich">
          <strong>Wojny napoleońskie</strong>
          <span><i className="legend-swatch legend-swatch--france" />Francja, sojusznicy i kierunek ataku</span>
          <span><i className="legend-swatch legend-swatch--coalition" />Koalicja i kierunek kontrataku</span>
          <span><i className="legend-swatch legend-swatch--neutral" />Neutralne / pozostałe</span>
          <small>Sojusznicy Francji są oznaczeni tym samym niebieskim kolorem. Kierunki działań są schematyczne.</small>
        </div>
      )}
      {selectedWw1Month && (
        <div className="campaign-legend" aria-label="Legenda stron I wojny światowej">
          <strong>I wojna światowa</strong>
          <span><i className="legend-swatch legend-swatch--axis" />Państwa centralne</span>
          <span><i className="legend-swatch legend-swatch--allies" />Ententa i alianci</span>
          <span><i className="legend-swatch legend-swatch--neutral" />Neutralne / pozostałe</span>
          <span><i className="legend-front" />Linia frontu i kontrola państw centralnych</span>
          <small>Przynależność państw jest pobierana z bazy i zmienia się dla wybranego miesiąca.</small>
        </div>
      )}
      <div className="map-controls" aria-label="Sterowanie mapą">
        <button type="button" onClick={() => zoom(1)} aria-label="Przybliż mapę"><Plus size={19} /></button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Oddal mapę"><Minus size={19} /></button>
        <span />
        <button type="button" onClick={toggleFullscreen} aria-label="Pełny ekran"><Maximize2 size={18} /></button>
      </div>
      <div className="map-date-card">
        <Clock3 size={17} />
        <div><small>{selectedMonth ? "WYBRANY MIESIĄC" : "WYBRANY ROK"}</small><strong>{selectedMonth ? formatMonthKey(selectedMonth) : year}</strong></div>
      </div>
    </div>
  );
}

function Timeline({ year, setYear, selectedMonth, setSelectedMonth }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const progress = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const quickYears = [1800, 1805, 1812, 1914, 1939, 1945, 2000, 2025];
  const activePeriod = TIMELINE_PERIODS.find((period) => year >= period.start && year <= period.end);
  const isWar = Boolean(selectedMonth);
  const isNapoleonic = Boolean(selectedMonth && selectedMonth <= "1815-06");
  const isWw2 = Boolean(selectedMonth && selectedMonth >= "1939-09");
  const warStartMonth = isNapoleonic ? NAPOLEON_START_MONTH : isWw2 ? WW2_START_MONTH : WW1_START_MONTH;
  const warEndMonth = isNapoleonic ? NAPOLEON_END_MONTH : isWw2 ? WW2_END_MONTH : WW1_END_MONTH;
  const selectedMonthIndex = isWar ? monthIndexFromKey(selectedMonth) : warStartMonth;
  const selectedMonthNumber = selectedMonthIndex % 12;

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timeout = window.setTimeout(() => {
      if (selectedMonth) {
        if (selectedMonthIndex < warEndMonth) {
          const monthStep = isNapoleonic ? 4 : 1;
          setSelectedMonth(monthKeyFromIndex(Math.min(selectedMonthIndex + monthStep, warEndMonth)));
        } else if (year < MAX_YEAR) {
          setYear(year + 1);
        } else {
          setIsPlaying(false);
        }
      } else if (year < MAX_YEAR) {
        setYear(year + 1);
      } else {
        setIsPlaying(false);
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isPlaying, isNapoleonic, selectedMonth, selectedMonthIndex, setSelectedMonth, setYear, warEndMonth, year]);

  const stopAndSetYear = (nextYear) => {
    setIsPlaying(false);
    setYear(nextYear);
  };

  const stopAndSetMonth = (monthKey) => {
    setIsPlaying(false);
    setSelectedMonth(monthKey);
  };

  const togglePlayback = () => {
    if (!isPlaying && year >= MAX_YEAR) setYear(MIN_YEAR);
    setIsPlaying((playing) => !playing);
  };

  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <span className="section-kicker">PODRÓŻ W CZASIE</span>
          <h2 id="timeline-title">Odkrywaj świat w wybranym {isWar ? "miesiącu" : "roku"}</h2>
        </div>
        <div className="timeline-heading__controls">
          <button
            className={`timeline-playback ${isPlaying ? "is-playing" : ""}`}
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? "Zatrzymaj animację osi czasu" : "Uruchom animację osi czasu"}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{isPlaying ? "Pauza" : "Start"}</span>
          </button>
          <label className="year-field">
          <span>ROK</span>
          <input
            type="number" min={MIN_YEAR} max={MAX_YEAR} value={year}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= MIN_YEAR && value <= MAX_YEAR) stopAndSetYear(value);
            }}
          />
          </label>
        </div>
      </div>
      <div className="range-wrap" style={{ "--progress": `${progress}%` }}>
        <div className="range-track" />
        <input
          className="year-range" type="range" min={MIN_YEAR} max={MAX_YEAR}
          value={year} onChange={(event) => stopAndSetYear(Number(event.target.value))}
          aria-label="Wybierz rok mapy historycznej"
        />
      </div>
      {isWar && (
        <div className="ww2-month-timeline">
          <div className="ww2-month-timeline__heading">
            <strong>{POLISH_MONTHS[selectedMonthNumber]} {year}</strong>
            <span>{isNapoleonic ? "Wojny napoleońskie · krok co 4 miesiące" : `${isWw2 ? "II" : "I"} wojna światowa · dokładność miesięczna`}</span>
          </div>
          <input
            className="ww2-month-range"
            type="range"
            min={warStartMonth}
            max={warEndMonth}
            step={isNapoleonic ? 4 : 1}
            value={selectedMonthIndex}
            onChange={(event) => stopAndSetMonth(monthKeyFromIndex(Number(event.target.value)))}
            aria-label={isNapoleonic ? "Wybierz miesiąc wojen napoleońskich" : `Wybierz miesiąc ${isWw2 ? "II" : "I"} wojny światowej`}
          />
          <div className="ww2-month-timeline__scale">
            {isNapoleonic
              ? <><span>V 1803</span><span>1805</span><span>1812</span><span>VI 1815</span></>
              : isWw2
              ? <><span>IX 1939</span><span>1941</span><span>1943</span><span>V 1945</span></>
              : <><span>VII 1914</span><span>1916</span><span>1917</span><span>XI 1918</span></>}
          </div>
        </div>
      )}
      <div className="timeline-periods" aria-label="Okresy historyczne">
        {TIMELINE_PERIODS.map((period) => (
          <button
            type="button"
            key={period.label}
            className={activePeriod?.label === period.label ? "active" : ""}
            onClick={() => stopAndSetYear(period.start)}
            aria-pressed={activePeriod?.label === period.label}
          >
            <strong>{period.label}</strong>
            <span>{period.range}</span>
          </button>
        ))}
      </div>
      <div className="quick-years">
        {quickYears.map((item) => (
          <button type="button" key={item} className={item === year ? "active" : ""} onClick={() => stopAndSetYear(item)}>
            {item}
          </button>
        ))}
      </div>
      <p className="timeline-note">
        <Sparkles size={15} />
        Przesuń suwak, aby zobaczyć obiekty istniejące w danym okresie.
        Zakres danych zależy od zasobów OpenHistoricalMap.
      </p>
    </section>
  );
}

function App() {
  const [events, setEvents] = useState([]);
  const [countries, setCountries] = useState([]);
  const [eventsError, setEventsError] = useState("");
  const [countriesError, setCountriesError] = useState("");
  const [ww1Alignments, setWw1Alignments] = useState([]);
  const [ww1TerritorialKeyframes, setWw1TerritorialKeyframes] = useState([]);
  const [countriesRequestAttempt, setCountriesRequestAttempt] = useState(0);
  const [year, setYear] = useState(START_YEAR);
  const [napoleonicMonth, setNapoleonicMonth] = useState("1803-05");
  const [ww1Month, setWw1Month] = useState("1914-07");
  const [ww2Month, setWw2Month] = useState("1939-09");
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const europeanEvents = useMemo(() => events.filter(isEventInEurope), [events]);
  const eventCategories = useMemo(() => [...new Set(europeanEvents.map((event) => event.category).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, "pl")), [europeanEvents]);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = () => {
      fetchEvents({ signal: controller.signal })
        .then((loadedEvents) => {
          setEvents(loadedEvents);
          setEventsError("");
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error(error);
            setEventsError("Nie udało się wczytać wydarzeń z bazy danych.");
          }
        });
    };
    loadEvents();
    window.addEventListener("focus", loadEvents);
    return () => {
      controller.abort();
      window.removeEventListener("focus", loadEvents);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchWarTerritorialKeyframes("ww1", { signal: controller.signal })
      .then(setWw1TerritorialKeyframes)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let retryTimeout;
    fetchCountries(year, { signal: controller.signal })
      .then((loadedCountries) => {
        setCountries(loadedCountries);
        setCountriesError("");
        setCountryFilter((selectedCountry) => (
          selectedCountry && !loadedCountries.some((country) => country.name === selectedCountry)
            ? ""
            : selectedCountry
        ));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
          setCountriesError("Nie udało się wczytać państw. Ponawiam połączenie z bazą…");
          retryTimeout = window.setTimeout(
            () => setCountriesRequestAttempt((attempt) => attempt + 1),
            1500,
          );
        }
      });
    return () => {
      controller.abort();
      window.clearTimeout(retryTimeout);
    };
  }, [year, countriesRequestAttempt]);
  const scrollToMap = () => document.querySelector("#mapa")?.scrollIntoView({ behavior: "smooth" });
  const selectYear = (nextYear) => {
    setYear(nextYear);
    if (nextYear >= 1803 && nextYear <= 1815) {
      const currentMonth = Number(napoleonicMonth.slice(5));
      const month = nextYear === 1803 ? Math.max(5, currentMonth) : nextYear === 1815 ? Math.min(6, currentMonth) : currentMonth;
      setNapoleonicMonth(`${nextYear}-${String(month).padStart(2, "0")}`);
    } else if (nextYear >= 1914 && nextYear <= 1918) {
      const currentMonth = Number(ww1Month.slice(5));
      const month = nextYear === 1914 ? Math.max(7, currentMonth) : nextYear === 1918 ? Math.min(11, currentMonth) : currentMonth;
      setWw1Month(`${nextYear}-${String(month).padStart(2, "0")}`);
    } else if (nextYear >= 1939 && nextYear <= 1945) {
      const currentMonth = Number(ww2Month.slice(5));
      const month = nextYear === 1939 ? Math.max(9, currentMonth) : nextYear === 1945 ? Math.min(5, currentMonth) : currentMonth;
      setWw2Month(`${nextYear}-${String(month).padStart(2, "0")}`);
    }
  };
  const selectedMonth = year >= 1803 && year <= 1815
    ? napoleonicMonth
    : year >= 1914 && year <= 1918 ? ww1Month
    : year >= 1939 && year <= 1945 ? ww2Month : null;
  useEffect(() => {
    if (!selectedMonth || selectedMonth < "1914-07" || selectedMonth > "1918-11") {
      return undefined;
    }
    const controller = new AbortController();
    fetchWarAlignments("ww1", selectedMonth, { signal: controller.signal })
      .then(setWw1Alignments)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, [selectedMonth]);
  const selectWarMonth = (monthKey) => {
    if (monthKey <= "1815-06") setNapoleonicMonth(monthKey);
    else if (monthKey < "1939-09") setWw1Month(monthKey);
    else setWw2Month(monthKey);
    setYear(Number(monthKey.slice(0, 4)));
  };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#start" aria-label="Chronomap — strona główna">
          <span className="brand-mark">C</span>
          <span><strong>Chronomap</strong><small>HISTORIA NA MAPIE</small></span>
        </a>
        <nav aria-label="Główna nawigacja">
          <a className="active" href="#mapa">Mapa</a>
          <a href="#odkrywaj">Odkrywaj</a>
          <a href="#quizy">Quizy</a>
          <a href="#moduly">Postępy <span>WKRÓTCE</span></a>
        </nav>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={scrollToMap}><Search size={17} /> Przejdź do mapy</button>
          <AuthMenu />
        </div>
      </header>

      <main>
        <section className="hero" id="start">
          <div className="hero-copy">
            <h1>Historia nabiera<br /><em>kształtu na mapie.</em></h1>
            <p>
              Odkrywaj, jak zmieniały się granice, miasta i miejsca na przestrzeni lat.
              Przesuń oś czasu i zobacz przeszłość z nowej perspektywy.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={scrollToMap}>Otwórz mapę <ArrowRight size={18} /></button>
              <a href="#odkrywaj">Jak to działa?</a>
            </div>
            <div className="feature-row">
              <span><Check size={15} /> Interaktywna mapa</span>
              <span><Check size={15} /> Dane historyczne</span>
              <span><Check size={15} /> Oś czasu</span>
            </div>
          </div>
        </section>

        <section className="map-section" id="mapa">
          <div className="section-intro">
            <div><span className="section-kicker">INTERAKTYWNA MAPA HISTORYCZNA</span><h2>Zobacz, jak zmieniała się Europa</h2></div>
            <p>Mapa korzysta bezpośrednio z otwartych danych OpenHistoricalMap. Możesz ją przesuwać, przybliżać i filtrować według roku, państwa oraz kategorii.</p>
          </div>
          <EventFilters
            countries={countries.map((country) => country.name)}
            categories={eventCategories}
            countryFilter={countryFilter}
            categoryFilter={categoryFilter}
            setCountryFilter={setCountryFilter}
            setCategoryFilter={setCategoryFilter}
          />
          {eventsError && <p className="events-error" role="alert">{eventsError}</p>}
          {countriesError && <p className="events-error" role="status">{countriesError}</p>}
          <HistoryMap events={europeanEvents} countries={countries} ww1Alignments={ww1Alignments} ww1TerritorialKeyframes={ww1TerritorialKeyframes} year={year} selectedMonth={selectedMonth} countryFilter={countryFilter} categoryFilter={categoryFilter} />
          <Timeline year={year} setYear={selectYear} selectedMonth={selectedMonth} setSelectedMonth={selectWarMonth} />
        </section>

        <section className="how-it-works" id="odkrywaj">
          <div className="centered-heading">
            <span className="section-kicker">PROSTY POCZĄTEK</span>
            <h2>Jak działa prototyp?</h2>
            <p>Ta wersja skupia się na najważniejszym fundamencie przyszłej aplikacji.</p>
          </div>
          <div className="steps">
            <article><span>01</span><div className="step-index">I</div><h3>Wybierz rok</h3><p>Użyj suwaka pod mapą albo wybierz jedną z przygotowanych dat.</p></article>
            <article><span>02</span><div className="step-index">II</div><h3>Eksploruj mapę</h3><p>Przesuwaj widok i przybliżaj interesujące Cię regiony świata.</p></article>
            <article><span>03</span><div className="step-index">III</div><h3>Rozwijaj wiedzę</h3><p>W kolejnych etapach pojawią się wydarzenia, lekcje i quizy.</p></article>
          </div>
        </section>

        <QuizModule />

        <section className="future-modules" id="moduly">
          <div className="section-intro">
            <div><span className="section-kicker">KOLEJNE ETAPY</span><h2>Miejsce na dalszy rozwój</h2></div>
            <p>Moduły są już uwzględnione w strukturze interfejsu. Ich zawartość zostanie dodana w następnych iteracjach projektu.</p>
          </div>
          <div className="module-grid">
            {modules.map(([code, title, description]) => (
              <article key={title} className="module-card">
                <div className="module-code">{code}</div>
                <small>MODUŁ W PRZYGOTOWANIU</small>
                <h3>{title}</h3><p>{description}</p>
                <button type="button" disabled>Dostępne wkrótce <ChevronDown size={16} /></button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark">C</span>
          <span><strong>Chronomap</strong><small>PROJEKT INŻYNIERSKI</small></span>
        </div>
        <p>Aplikacja edukacyjna wspomagająca naukę historii i geografii na podstawie map historycznych.</p>
        <a href="https://www.openhistoricalmap.org/" target="_blank" rel="noreferrer">Dane mapowe: OpenHistoricalMap</a>
      </footer>
    </div>
  );
}

export default App;
