import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  filterMapEvents, isEventInEurope, monthIndexFromKey, monthKeyFromIndex, formatMonthKey,
} from '../../src/mapFilters.js';
import {
  ww2CampaignRoutes, getActiveCampaignRoutes, getCampaignArrowheads,
} from '../../src/ww2Campaigns.js';
import {
  napoleonicCampaignRoutes, getActiveNapoleonicRoutes, getNapoleonicArrowheads,
} from '../../src/napoleonicCampaigns.js';
import {
  getWw2TerritorialControl, getClippedWw2TerritorialControl,
} from '../../src/ww2TerritorialControl.js';
import { getWw1TerritorialControl } from '../../src/ww1TerritorialControl.js';

// Mały zbiór danych pozwala od razu zobaczyć, jakie ID powinien zwrócić filtr.
const exampleEvents = [
  { id: 1, year: 1939, date: '1939-09-01', country: 'Polska', category: 'Wojna' },
  { id: 2, year: 1939, date: '1939-10-01', country: 'Polska', category: 'Polityka' },
  { id: 3, year: 1940, date: '1940-09-01', country: 'Francja', category: 'Wojna' },
  { id: 4, year: 1939, date: '1939-09-17', country: 'Francja', category: 'Wojna' },
];

// FILTROWANIE WYDARZEŃ I DATY

test('MAP-01 | Tryb roczny wybiera tylko wydarzenia z danego roku', () => {
  // Przygotowanie: interesuje nas cały rok 1939, bez wyboru miesiąca.
  const selectedYear = '1939';
  const selectedMonth = null;

  // Wykonanie: uruchamiamy rzeczywistą funkcję używaną przez mapę.
  const visibleEvents = filterMapEvents(exampleEvents, selectedYear, selectedMonth);
  const visibleIds = visibleEvents.map(event => event.id);

  // Sprawdzenie: wydarzenie nr 3 jest z 1940 roku, więc nie powinno być widoczne.
  assert.deepEqual(visibleIds, [1, 2, 4]);
});

test('MAP-02 | Tryb miesięczny wyklucza pozostałe miesiące i lata', () => {
  const visibleEvents = filterMapEvents(exampleEvents, 1939, '1939-09');
  const visibleIds = visibleEvents.map(event => event.id);

  assert.deepEqual(visibleIds, [1, 4]);
});

test('MAP-03 | Filtry państwa i kategorii działają łącznie', () => {
  const polishWarEvents = filterMapEvents(exampleEvents, 1939, null, {
    country: 'Polska',
    category: 'Wojna',
  });
  const frenchPoliticalEvents = filterMapEvents(exampleEvents, 1939, '1939-09', {
    country: 'Francja',
    category: 'Polityka',
  });

  assert.deepEqual(polishWarEvents.map(event => event.id), [1]);
  assert.deepEqual(frenchPoliticalEvents, []);
  assert.equal(exampleEvents.length, 4);
});

test('MAP-04 | Obszar Europy obejmuje krawędzie i odrzuca punkty poza zakresem', () => {
  const pointsInside = [[-25, 34], [45, 72], [21, 52]];
  const pointsOutside = [[-26, 50], [46, 50], [20, 33], [20, 73], [NaN, 52]];

  for (const coordinates of pointsInside) {
    assert.equal(isEventInEurope({ coordinates }), true);
  }

  for (const coordinates of pointsOutside) {
    assert.equal(isEventInEurope({ coordinates }), false);
  }
});

test('MAP-05 | Oś miesięczna zachowuje daty i przechodzi przez koniec roku', () => {
  const months = ['1803-05', '1914-07', '1918-11', '1939-09', '1945-05', '2025-12'];

  for (const month of months) {
    const monthIndex = monthIndexFromKey(month);
    const restoredMonth = monthKeyFromIndex(monthIndex);
    assert.equal(restoredMonth, month);
  }

  const decemberIndex = monthIndexFromKey('1939-12');
  const nextMonth = monthKeyFromIndex(decemberIndex + 1);

  assert.equal(nextMonth, '1940-01');
  assert.equal(formatMonthKey('1939-09'), 'wrzesień 1939');
});

// TRASY KAMPANII

test('MAP-06 | Trasy II wojny są widoczne w miesiącach granicznych', () => {
  function activeRouteIds(month) {
    const routes = getActiveCampaignRoutes(month);
    return routes.features.map(route => route.properties.id);
  }

  assert.ok(activeRouteIds('1939-09').includes('fall-weiss-west'));
  assert.ok(!activeRouteIds('1939-10').includes('fall-weiss-west'));
  assert.ok(activeRouteIds('1940-03').includes('winter-war'));
  assert.ok(!activeRouteIds('1940-04').includes('winter-war'));
  assert.deepEqual(activeRouteIds('1939-08'), []);
  assert.deepEqual(activeRouteIds(null), []);
  assert.deepEqual(activeRouteIds('1945-06'), []);
});

test('MAP-07 | Groty strzałek wskazują końce aktywnych tras II wojny', () => {
  const routes = getActiveCampaignRoutes('1944-06').features;
  const arrows = getCampaignArrowheads('1944-06');

  assert.equal(arrows.length, routes.length);

  for (const [index, route] of routes.entries()) {
    const lastPoint = route.geometry.coordinates.at(-1);
    const previousPoint = route.geometry.coordinates.at(-2);

    assert.deepEqual(arrows[index].coordinates, lastPoint);
    assert.deepEqual(arrows[index].previousCoordinates, previousPoint);
  }
});

test('MAP-08 | Kampania napoleońska rozwija się w czasie bez zmiany danych źródłowych', () => {
  const originalRoutes = structuredClone(napoleonicCampaignRoutes);

  function russianCampaign(month) {
    const routes = getActiveNapoleonicRoutes(month);
    return routes.features.find(route => route.properties.id === 'russia');
  }

  const earlyEndpoint = russianCampaign('1812-05').geometry.coordinates.at(-1);
  const finalEndpoint = russianCampaign('1812-09').geometry.coordinates.at(-1);
  const coordinateTolerance = 1e-9;

  assert.notDeepEqual(earlyEndpoint, finalEndpoint);
  assert.ok(Math.abs(finalEndpoint[0] - 37.6) < coordinateTolerance);
  assert.ok(Math.abs(finalEndpoint[1] - 55.8) < coordinateTolerance);
  assert.deepEqual(napoleonicCampaignRoutes, originalRoutes);
  assert.deepEqual(getActiveNapoleonicRoutes(null).features, []);
  assert.deepEqual(getActiveNapoleonicRoutes('1815-07').features, []);

  const arrows = getNapoleonicArrowheads('1812-06');
  for (const arrow of arrows) {
    assert.ok(arrow.coordinates.every(Number.isFinite));
    assert.ok(arrow.previousCoordinates.every(Number.isFinite));
  }
});

test('MAP-09 | Wszystkie trasy mają unikalne ID, poprawne daty i współrzędne', () => {
  const routeCollections = [ww2CampaignRoutes, napoleonicCampaignRoutes];

  for (const collection of routeCollections) {
    const routeIds = collection.features.map(route => route.properties.id);
    assert.equal(new Set(routeIds).size, collection.features.length);

    for (const route of collection.features) {
      assert.match(route.properties.start, /^\d{4}-(0[1-9]|1[0-2])$/);
      assert.ok(route.properties.start <= route.properties.end);
      assert.ok(route.geometry.coordinates.length >= 2);

      for (const [longitude, latitude] of route.geometry.coordinates) {
        const validLongitude = Number.isFinite(longitude) && Math.abs(longitude) <= 180;
        const validLatitude = Number.isFinite(latitude) && Math.abs(latitude) <= 90;

        assert.ok(validLongitude && validLatitude);
      }
    }
  }
});

// ZMIANY KONTROLI TERYTORIALNEJ

test('MAP-10 | Front II wojny jest pusty poza zakresem i interpoluje miesiące', () => {
  const monthsWithoutFront = [null, '1941-05', '1945-05'];

  for (const month of monthsWithoutFront) {
    const control = getWw2TerritorialControl(month);
    assert.deepEqual(control.features, []);
  }

  const septemberControl = getWw2TerritorialControl('1941-09');
  const actualLongitudes = frontLongitudes(septemberControl);

  assert.deepEqual(actualLongitudes, [27, 28.5, 30.75, 30.5, 30]);
});

// Funkcje mapy korzystają z fetch. W testach podajemy im lokalne pliki GeoJSON,
// aby nie potrzebowały przeglądarki ani zewnętrznego serwisu mapowego.
function mockLocalMapFiles(testContext) {
  testContext.mock.method(globalThis, 'fetch', async path => {
    const fileUrl = new URL(`../../public${path}`, import.meta.url);
    const fileContents = await readFile(fileUrl);
    return new Response(fileContents);
  });
}

const ww1Keyframes = [
  { month: '1914-07', frontLongitudes: [20, 20, 20, 20, 20, 20], occupiedCountries: [] },
  { month: '1914-09', frontLongitudes: [24, 24, 24, 24, 24, 24], occupiedCountries: ['Serbia'] },
];

function frontLongitudes(collection) {
  const frontLine = collection.features.find(feature => (
    feature.properties.kind === 'front-line'
  ));
  return frontLine.geometry.coordinates.map(coordinate => coordinate[0]);
}

test('MAP-11 | Front I wojny interpoluje miesiąc pośredni', async testContext => {
  mockLocalMapFiles(testContext);

  const middleMonth = await getWw1TerritorialControl('1914-08', ww1Keyframes);
  const noMonth = await getWw1TerritorialControl(null, ww1Keyframes);
  const noKeyframes = await getWw1TerritorialControl('1914-08', []);

  assert.deepEqual(frontLongitudes(middleMonth), [22, 22, 22, 22, 22, 22]);
  assert.deepEqual(noMonth.features, []);
  assert.deepEqual(noKeyframes.features, []);
});

test('MAP-12 | Data po ostatniej klatce I wojny zachowuje ostatni front', async testContext => {
  mockLocalMapFiles(testContext);

  const control = await getWw1TerritorialControl('1914-10', ww1Keyframes);

  assert.deepEqual(frontLongitudes(control), [24, 24, 24, 24, 24, 24]);
});

test('MAP-13 | Przycinanie kontroli II wojny korzysta z rzeczywistych granic GeoJSON', async testContext => {
  mockLocalMapFiles(testContext);

  const control = await getClippedWw2TerritorialControl('1941-09');
  const noMonth = await getClippedWw2TerritorialControl(null);

  assert.ok(control.features.some(feature => feature.properties.kind === 'axis-control'));
  assert.ok(control.features.some(feature => feature.properties.kind === 'front-line'));

  const allowedGeometryTypes = ['Polygon', 'MultiPolygon', 'LineString'];
  for (const feature of control.features) {
    assert.ok(allowedGeometryTypes.includes(feature.geometry.type));
  }

  assert.deepEqual(noMonth.features, []);
});
