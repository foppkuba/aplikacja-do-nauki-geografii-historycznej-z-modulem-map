import { useState, useEffect } from "react";

import map1939 from "./assets/europe-1939.jpg";
import map1940 from "./assets/europe-1940.jpg";
import map1941 from "./assets/europe-1941.jpg";
import map1942 from "./assets/europe-1942.jpg";
import map1943 from "./assets/europe-1943.jpg";
import map1944 from "./assets/europe-1944.jpg";
import map1945 from "./assets/europe-1945.jpg";

import { timelineData } from "./timelineData";

import "./App.css";

const years = [
  1939,
  1940,
  1941,
  1942,
  1943,
  1944,
  1945,
];

const maps = {
  1939: map1939,
  1940: map1940,
  1941: map1941,
  1942: map1942,
  1943: map1943,
  1944: map1944,
  1945: map1945,
};

function App() {
  const [yearIndex, setYearIndex] = useState(0);

  const year = years[yearIndex];

  const currentEvents = [...timelineData[year].events].sort(
    (a, b) => a.dateValue.localeCompare(b.dateValue)
  );

  const [selectedEvent, setSelectedEvent] = useState(
    currentEvents[0]
  );

  useEffect(() => {
    setSelectedEvent(
      [...timelineData[year].events].sort(
        (a, b) => a.dateValue.localeCompare(b.dateValue)
      )[0]
    );
  }, [year]);

  const mapImage = maps[year];

  return (
    <div className="container">
      <div className="header">
        <h1>NAUKA GEOGRAFII HISTORYCZNEJ</h1>

        <p>
          Interaktywna mapa wydarzeń historycznych
        </p>
      </div>

      <div className="content">
        <div className="map-area">
          <div className="map-wrapper">
            <img
              src={mapImage}
              alt={`Mapa Europy ${year}`}
              className="map"
            />

            {currentEvents.map((event) => (
              <div
                key={event.id}
                className={`marker ${
                  selectedEvent.id === event.id
                    ? "active"
                    : ""
                }`}
                style={{
                  left: event.x,
                  top: event.y,
                }}
                onClick={() =>
                  setSelectedEvent(event)
                }
              >
                <div className="marker-tooltip">
                  {event.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="events-panel">
          {currentEvents.map((event) => (
            <div
              key={event.id}
              className={`event-card ${
                selectedEvent.id === event.id
                  ? "active-card"
                  : ""
              }`}
              onClick={() =>
                setSelectedEvent(event)
              }
            >
              <h3>{event.title}</h3>

              <span className="card-date">
                📅 {event.date}
              </span>

              <p>
                {event.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-title">
          Oś czasu II wojny światowej
        </div>

        <div className="current-year">
          {year}
        </div>

        <input
          type="range"
          min="0"
          max={years.length - 1}
          step="1"
          value={yearIndex}
          onChange={(e) =>
            setYearIndex(
              Number(e.target.value)
            )
          }
          className="timeline-slider"
        />

        <div className="timeline-labels">
          {years.map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;