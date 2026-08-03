import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowRight, Check, ChevronDown, Clock3, Maximize2, Minus, Plus,
  Search, Sparkles,
} from "lucide-react";
import "./App.css";
import { events } from "./events";

const MIN_YEAR = 1800;
const MAX_YEAR = 2025;
const START_YEAR = 1939;
const OHM_STYLE = "https://www.openhistoricalmap.org/map-styles/main/main.json";

const TIMELINE_PERIODS = [
  { label: "XIX wiek", range: "1800–1913", start: 1800, end: 1913 },
  { label: "I wojna światowa", range: "1914–1918", start: 1914, end: 1918 },
  { label: "Dwudziestolecie", range: "1919–1938", start: 1919, end: 1938 },
  { label: "II wojna światowa", range: "1939–1945", start: 1939, end: 1945 },
  { label: "Zimna wojna", range: "1946–1991", start: 1946, end: 1991 },
  { label: "Współczesność", range: "1992–2025", start: 1992, end: 2025 },
];

const updateEventMarkers = (map, year, markerStore) => {
  markerStore.forEach((marker) => marker.remove());
  markerStore.length = 0;

  const visibleEvents = events.filter((event) => event.year === Number(year));
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
    const meta = document.createElement("p");
    meta.className = "event-popup__meta";
    meta.textContent = `${event.date} · ${event.place}`;
    const description = document.createElement("p");
    description.textContent = event.description;
    popupContent.append(category, title, meta, description);

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

const applyOhmYearFilter = (map, year, baseFilters) => {
  const yearStart = Number(year);
  const yearEnd = yearStart + 0.999999;

  map.getStyle().layers.forEach((layer) => {
    if (layer.source !== "ohm" || !layer["source-layer"]) return;

    if (!baseFilters.has(layer.id)) {
      baseFilters.set(layer.id, map.getFilter(layer.id) ?? null);
    }

    const originalFilter = baseFilters.get(layer.id);
    const dateFilter = [
      "all",
      ["any", ["!", ["has", "start_decdate"]], ["<=", ["get", "start_decdate"], yearEnd]],
      ["any", ["!", ["has", "end_decdate"]], [">=", ["get", "end_decdate"], yearStart]],
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

const modules = [
  ["QZ", "Quizy historyczne", "Sprawdzaj wiedzę na podstawie wydarzeń i miejsc widocznych na mapie."],
  ["PR", "Twoje postępy", "Obserwuj wyniki, ukończone epoki i czas poświęcony na naukę."],
  ["SN", "Ścieżki nauki", "Poznawaj historię krok po kroku dzięki uporządkowanym materiałom."],
];

function HistoryMap({ year }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const styleReadyRef = useRef(false);
  const baseFiltersRef = useRef(new Map());
  const yearRef = useRef(year);
  const eventMarkersRef = useRef([]);
  const [status, setStatus] = useState("loading");
  const [ohmStatus, setOhmStatus] = useState("connecting");
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    yearRef.current = year;
    const map = mapRef.current;
    if (map && styleReadyRef.current) {
      applyOhmYearFilter(map, year, baseFiltersRef.current);
      map.triggerRepaint();
    }
    if (map) setEventCount(updateEventMarkers(map, year, eventMarkersRef.current));
  }, [year]);

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
      attributionControl: false,
    });

    mapRef.current = map;
    setEventCount(updateEventMarkers(map, yearRef.current, eventMarkersRef.current));
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.once("style.load", () => {
      styleReady = true;
      styleReadyRef.current = true;
      window.clearTimeout(loadTimeout);
      try {
        addVisibleCountryBoundaries(map);
        applyOhmYearFilter(map, yearRef.current, baseFilters);
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
        aria-label={`Mapa historyczna dla roku ${year}`}
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
      <div className="events-badge">
        <span>{eventCount}</span>
        {eventCount === 1 ? "wydarzenie w tym roku" : "wydarzenia w tym roku"}
      </div>
      <div className="map-controls" aria-label="Sterowanie mapą">
        <button type="button" onClick={() => zoom(1)} aria-label="Przybliż mapę"><Plus size={19} /></button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Oddal mapę"><Minus size={19} /></button>
        <span />
        <button type="button" onClick={toggleFullscreen} aria-label="Pełny ekran"><Maximize2 size={18} /></button>
      </div>
      <div className="map-date-card">
        <Clock3 size={17} />
        <div><small>WYBRANY ROK</small><strong>{year}</strong></div>
      </div>
    </div>
  );
}

function Timeline({ year, setYear }) {
  const progress = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const quickYears = [1800, 1850, 1900, 1939, 1945, 2000, 2025];
  const activePeriod = TIMELINE_PERIODS.find((period) => year >= period.start && year <= period.end);

  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <span className="section-kicker">PODRÓŻ W CZASIE</span>
          <h2 id="timeline-title">Odkrywaj świat w wybranym roku</h2>
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
  const scrollToMap = () => document.querySelector("#mapa")?.scrollIntoView({ behavior: "smooth" });

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
            <div><span className="section-kicker">INTERAKTYWNA MAPA HISTORYCZNA</span><h2>Zobacz, jak zmieniał się świat</h2></div>
            <p>Mapa korzysta bezpośrednio z otwartych danych OpenHistoricalMap. Możesz ją przesuwać, przybliżać i filtrować według roku.</p>
          </div>
          <HistoryMap year={year} />
          <Timeline year={year} setYear={setYear} />
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
