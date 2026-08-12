import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowRight, Check, ChevronDown, Clock3, Filter, Maximize2, Minus, Plus,
  RotateCcw, Search, Sparkles,
} from "lucide-react";
import "./App.css";
import { events } from "./events";
import { getActiveCampaignRoutes, getCampaignArrowheads } from "./ww2Campaigns";

const MIN_YEAR = 1800;
const MAX_YEAR = 2025;
const START_YEAR = 1939;
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
const EUROPEAN_EVENTS = events.filter(isEventInEurope);
const EVENT_COUNTRIES = [...new Set(EUROPEAN_EVENTS.map((event) => event.country))]
  .sort((first, second) => first.localeCompare(second, "pl"));
const EVENT_CATEGORIES = [...new Set(EUROPEAN_EVENTS.map((event) => event.category))]
  .sort((first, second) => first.localeCompare(second, "pl"));

const TIMELINE_PERIODS = [
  { label: "XIX wiek", range: "1800–1913", start: 1800, end: 1913 },
  { label: "I wojna światowa", range: "1914–1918", start: 1914, end: 1918 },
  { label: "Dwudziestolecie", range: "1919–1938", start: 1919, end: 1938 },
  { label: "II wojna światowa", range: "1939–1945", start: 1939, end: 1945 },
  { label: "Zimna wojna", range: "1946–1991", start: 1946, end: 1991 },
  { label: "Współczesność", range: "1992–2025", start: 1992, end: 2025 },
];

const updateEventMarkers = (map, year, markerStore, filters = {}) => {
  markerStore.forEach((marker) => marker.remove());
  markerStore.length = 0;

  const visibleEvents = EUROPEAN_EVENTS.filter((event) => (
    event.year === Number(year)
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

const campaignColors = { axis: "#c94836", ussr: "#8e2635", allies: "#24649a" };

const addWw2CampaignLayers = (map, selectedMonth) => {
  if (map.getSource("ww2-campaigns")) return;
  map.addSource("ww2-campaigns", { type: "geojson", data: getActiveCampaignRoutes(selectedMonth) });
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

const updateWw2CampaignData = (map, selectedMonth) => {
  const source = map.getSource("ww2-campaigns");
  if (source) source.setData(getActiveCampaignRoutes(selectedMonth));
};

const updateCampaignArrowheads = (map, selectedMonth, markerStore) => {
  markerStore.forEach((marker) => marker.remove());
  markerStore.length = 0;
  if (!selectedMonth) return;

  getCampaignArrowheads(selectedMonth).forEach((arrow) => {
    const [lng, lat] = arrow.coordinates;
    const [previousLng, previousLat] = arrow.previousCoordinates;
    const angle = Math.atan2(lat - previousLat, lng - previousLng) * (180 / Math.PI);
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

const addVisibleCountryBoundaries = (map) => {
  const countryFilter = [
    "<=",
    ["to-number", ["get", "admin_level"], 99],
    2,
  ];
  const widthByZoom = [
    "interpolate",
    ["linear"],
    ["zoom"],
    2, 1.2,
    5, 2.1,
    8, 3.4,
  ];

  map.addSource("ohmAdmin", {
    type: "vector",
    url: "https://vtiles.openhistoricalmap.org/maps/ohm_admin.json",
    attribution: "OpenHistoricalMap",
  });

  map.addLayer({
    id: "chronomap-country-fill",
    type: "fill",
    source: "ohmAdmin",
    "source-layer": "boundaries",
    filter: countryFilter,
    paint: {
      "fill-color": "#d88a63",
      "fill-opacity": 0.1,
    },
  });

  map.addLayer({
    id: "chronomap-country-boundary-casing",
    type: "line",
    source: "ohmAdmin",
    "source-layer": "boundaries",
    filter: countryFilter,
    paint: {
      "line-color": "#fff9ed",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2, 3.2,
        5, 5,
        8, 7,
      ],
      "line-opacity": 0.92,
    },
  });

  map.addLayer({
    id: "chronomap-country-boundary",
    type: "line",
    source: "ohmAdmin",
    "source-layer": "boundaries",
    filter: countryFilter,
    paint: {
      "line-color": "#7c3029",
      "line-width": widthByZoom,
      "line-opacity": 0.95,
    },
  });
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
  ["QZ", "Quizy historyczne", "Sprawdzaj wiedzę na podstawie wydarzeń i miejsc widocznych na mapie."],
  ["PR", "Twoje postępy", "Obserwuj wyniki, ukończone epoki i czas poświęcony na naukę."],
  ["SN", "Ścieżki nauki", "Poznawaj historię krok po kroku dzięki uporządkowanym materiałom."],
];

function EventFilters({ countryFilter, categoryFilter, setCountryFilter, setCategoryFilter }) {
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
            {EVENT_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </label>
      <label className="event-filter-field">
        <span>KATEGORIA</span>
        <span className="event-filter-select">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Wszystkie kategorie</option>
            {EVENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
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

function HistoryMap({ year, selectedMonth, countryFilter, categoryFilter }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const styleReadyRef = useRef(false);
  const baseFiltersRef = useRef(new Map());
  const yearRef = useRef(year);
  const selectedMonthRef = useRef(selectedMonth);
  const filtersRef = useRef({ country: countryFilter, category: categoryFilter });
  const eventMarkersRef = useRef([]);
  const campaignMarkersRef = useRef([]);
  const [status, setStatus] = useState("loading");
  const [ohmStatus, setOhmStatus] = useState("connecting");
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    yearRef.current = year;
    selectedMonthRef.current = selectedMonth;
    filtersRef.current = { country: countryFilter, category: categoryFilter };
    const map = mapRef.current;
    if (map && styleReadyRef.current) {
      applyOhmDateFilter(map, year, selectedMonth, baseFiltersRef.current);
      updateWw2CampaignData(map, selectedMonth);
      map.triggerRepaint();
    }
    if (map) {
      setEventCount(updateEventMarkers(map, year, eventMarkersRef.current, filtersRef.current));
    }
    if (map) updateCampaignArrowheads(map, selectedMonth, campaignMarkersRef.current);
  }, [year, selectedMonth, countryFilter, categoryFilter]);

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
    setEventCount(updateEventMarkers(map, yearRef.current, eventMarkersRef.current, filtersRef.current));
    updateCampaignArrowheads(map, selectedMonthRef.current, campaignMarkersRef.current);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.once("style.load", () => {
      styleReady = true;
      styleReadyRef.current = true;
      window.clearTimeout(loadTimeout);
      try {
        addVisibleCountryBoundaries(map);
        localizeCountryLabels(map);
        addWw2CampaignLayers(map, selectedMonthRef.current);
        applyOhmDateFilter(map, yearRef.current, selectedMonthRef.current, baseFilters);
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
      <div className="events-badge" aria-live="polite">
        <span>{eventCount}</span>
        {eventCount === 1
          ? "wydarzenie w tym roku"
          : eventCount >= 2 && eventCount <= 4
            ? "wydarzenia w tym roku"
            : "wydarzeń w tym roku"}
      </div>
      {selectedMonth && (
        <div className="campaign-legend" aria-label="Legenda działań II wojny światowej">
          <strong>II wojna światowa</strong>
          <span><i className="legend-line legend-line--axis" />Państwa Osi</span>
          <span><i className="legend-line legend-line--ussr" />Armia Czerwona</span>
          <span><i className="legend-line legend-line--allies" />Alianci</span>
          <small>Kierunki działań w wybranym miesiącu</small>
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
  const progress = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const quickYears = [1800, 1850, 1900, 1939, 1945, 2000, 2025];
  const activePeriod = TIMELINE_PERIODS.find((period) => year >= period.start && year <= period.end);
  const isWw2 = Boolean(selectedMonth);
  const selectedMonthIndex = isWw2 ? monthIndexFromKey(selectedMonth) : WW2_START_MONTH;
  const selectedMonthNumber = selectedMonthIndex % 12;

  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <span className="section-kicker">PODRÓŻ W CZASIE</span>
          <h2 id="timeline-title">Odkrywaj świat w wybranym {isWw2 ? "miesiącu" : "roku"}</h2>
        </div>
        <label className="year-field">
          <span>ROK</span>
          <input
            type="number" min={MIN_YEAR} max={MAX_YEAR} value={year}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= MIN_YEAR && value <= MAX_YEAR) setYear(value);
            }}
          />
        </label>
      </div>
      <div className="range-wrap" style={{ "--progress": `${progress}%` }}>
        <div className="range-track" />
        <input
          className="year-range" type="range" min={MIN_YEAR} max={MAX_YEAR}
          value={year} onChange={(event) => setYear(Number(event.target.value))}
          aria-label="Wybierz rok mapy historycznej"
        />
      </div>
      {isWw2 && (
        <div className="ww2-month-timeline">
          <div className="ww2-month-timeline__heading">
            <strong>{POLISH_MONTHS[selectedMonthNumber]} {year}</strong>
            <span>II wojna światowa · dokładność miesięczna</span>
          </div>
          <input
            className="ww2-month-range"
            type="range"
            min={WW2_START_MONTH}
            max={WW2_END_MONTH}
            value={selectedMonthIndex}
            onChange={(event) => setSelectedMonth(monthKeyFromIndex(Number(event.target.value)))}
            aria-label="Wybierz miesiąc II wojny światowej"
          />
          <div className="ww2-month-timeline__scale"><span>IX 1939</span><span>1941</span><span>1943</span><span>V 1945</span></div>
        </div>
      )}
      <div className="timeline-periods" aria-label="Okresy historyczne">
        {TIMELINE_PERIODS.map((period) => (
          <button
            type="button"
            key={period.label}
            className={activePeriod?.label === period.label ? "active" : ""}
            onClick={() => setYear(period.start)}
            aria-pressed={activePeriod?.label === period.label}
          >
            <strong>{period.label}</strong>
            <span>{period.range}</span>
          </button>
        ))}
      </div>
      <div className="quick-years">
        {quickYears.map((item) => (
          <button type="button" key={item} className={item === year ? "active" : ""} onClick={() => setYear(item)}>
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
  const [year, setYear] = useState(START_YEAR);
  const [ww2Month, setWw2Month] = useState("1939-09");
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const scrollToMap = () => document.querySelector("#mapa")?.scrollIntoView({ behavior: "smooth" });
  const selectYear = (nextYear) => {
    setYear(nextYear);
    if (nextYear >= 1939 && nextYear <= 1945) {
      const currentMonth = Number(ww2Month.slice(5));
      const month = nextYear === 1939 ? Math.max(9, currentMonth) : nextYear === 1945 ? Math.min(5, currentMonth) : currentMonth;
      setWw2Month(`${nextYear}-${String(month).padStart(2, "0")}`);
    }
  };
  const selectedMonth = year >= 1939 && year <= 1945 ? ww2Month : null;
  const selectWw2Month = (monthKey) => {
    setWw2Month(monthKey);
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
          <a href="#moduly">Quizy <span>WKRÓTCE</span></a>
          <a href="#moduly">Postępy <span>WKRÓTCE</span></a>
        </nav>
        <button className="ghost-button" type="button" onClick={scrollToMap}><Search size={17} /> Przejdź do mapy</button>
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
            countryFilter={countryFilter}
            categoryFilter={categoryFilter}
            setCountryFilter={setCountryFilter}
            setCategoryFilter={setCategoryFilter}
          />
          <HistoryMap year={year} selectedMonth={selectedMonth} countryFilter={countryFilter} categoryFilter={categoryFilter} />
          <Timeline year={year} setYear={selectYear} selectedMonth={selectedMonth} setSelectedMonth={selectWw2Month} />
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
