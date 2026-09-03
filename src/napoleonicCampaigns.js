const route = (id, side, title, description, start, end, coordinates) => ({
  type: "Feature",
  properties: { id, side, title, description, start, end },
  geometry: { type: "LineString", coordinates },
});

const toMonthIndex = (month) => {
  const [year, value] = month.split("-").map(Number);
  return year * 12 + value - 1;
};

const getRouteProgress = (selectedMonth, start, end) => {
  const startIndex = toMonthIndex(start);
  const duration = Math.max(1, toMonthIndex(end) - startIndex + 1);
  return Math.min(1, Math.max(0.12, (toMonthIndex(selectedMonth) - startIndex + 1) / duration));
};

const revealRoute = (feature, selectedMonth) => {
  const coordinates = feature.geometry.coordinates;
  const segmentLengths = coordinates.slice(1).map(([longitude, latitude], index) => {
    const [previousLongitude, previousLatitude] = coordinates[index];
    const longitudeScale = Math.cos(((latitude + previousLatitude) / 2) * Math.PI / 180);
    return Math.hypot((longitude - previousLongitude) * longitudeScale, latitude - previousLatitude);
  });
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  let remainingLength = totalLength * getRouteProgress(
    selectedMonth,
    feature.properties.start,
    feature.properties.end,
  );
  const visibleCoordinates = [coordinates[0]];

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    const start = coordinates[index];
    const end = coordinates[index + 1];
    if (remainingLength >= segmentLength) {
      visibleCoordinates.push(end);
      remainingLength -= segmentLength;
      continue;
    }
    const progress = segmentLength ? remainingLength / segmentLength : 1;
    visibleCoordinates.push([
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ]);
    break;
  }

  return { ...feature, geometry: { ...feature.geometry, coordinates: visibleCoordinates } };
};

// Schematyczne kierunki najważniejszych kampanii wojen napoleońskich.
export const napoleonicCampaignRoutes = {
  type: "FeatureCollection",
  features: [
    route("hanover", "france", "Zajęcie Hanoweru", "Francuskie wojska wkroczyły do Hanoweru, umacniając pozycję Napoleona w północnych Niemczech.", "1803-05", "1803-12", [[2.3,48.9],[6.8,50.9],[9.7,52.4]]),
    route("boulogne", "france", "Obóz pod Boulogne", "Napoleon skoncentrował Armię Anglii nad kanałem La Manche, przygotowując plan inwazji na Wyspy Brytyjskie.", "1804-01", "1805-08", [[2.3,48.9],[1.6,50.7]]),
    route("ulm", "france", "Kampania ulmska", "Wielka Armia oskrzydliła wojska austriackie i zmusiła je do kapitulacji pod Ulm.", "1805-08", "1805-12", [[2.3,48.9],[7.5,49.2],[10.0,48.4]]),
    route("austerlitz", "france", "Marsz na Austerlitz", "Po zajęciu Wiednia Napoleon ruszył na armię rosyjsko-austriacką i zwyciężył pod Austerlitz.", "1805-08", "1805-12", [[10.0,48.4],[16.4,48.2],[16.8,49.1]]),
    route("trafalgar", "coalition", "Kampania morska i Trafalgar", "Flota brytyjska przechwyciła połączoną flotę francusko-hiszpańską u wybrzeży Hiszpanii.", "1805-05", "1805-12", [[-4.2,48.0],[-9.0,43.0],[-6.3,36.2]]),
    route("jena", "france", "Kampania pruska", "Wielka Armia wkroczyła do Prus i rozbiła ich główne siły pod Jeną i Auerstedt.", "1806-08", "1806-12", [[6.8,49.5],[10.9,50.9],[13.7,52.5]]),
    route("poland-1807", "france", "Kampania polska", "Napoleon ścigał wojska rosyjskie przez ziemie polskie, kończąc kampanię zwycięstwem pod Frydlandem.", "1806-11", "1807-07", [[13.7,52.5],[21.0,52.2],[20.5,54.4]]),
    route("eylau", "coalition", "Iława Pruska", "Armia rosyjska zatrzymała Napoleona w krwawej, nierozstrzygniętej bitwie zimowej.", "1807-01", "1807-04", [[27.6,53.9],[20.5,54.4]]),
    route("friedland", "france", "Frydland", "Zwycięstwo Francuzów nad armią rosyjską doprowadziło do pokoju w Tylży.", "1807-03", "1807-07", [[21.0,52.2],[20.5,54.4]]),
    route("peninsular", "france", "Inwazja na Półwysep Iberyjski", "Wojska francuskie wkroczyły do Hiszpanii i Portugalii; rozpoczęła się długotrwała wojna półwyspowa.", "1807-09", "1808-12", [[2.3,48.9],[-1.0,42.5],[-3.7,40.4],[-9.1,38.7]]),
    route("iberian-resistance", "coalition", "Wojna półwyspowa", "Hiszpańskie powstanie i brytyjska interwencja związały znaczne siły francuskie na Półwyspie Iberyjskim.", "1808-05", "1814-04", [[-9.1,38.7],[-7.9,40.6],[-3.7,40.4],[-1.6,42.8]]),
    route("corunna", "coalition", "Kampania sir Johna Moore’a", "Brytyjska armia wycofała się przez północną Hiszpanię i ewakuowała z portu A Coruña.", "1808-09", "1809-01", [[-3.7,40.4],[-5.7,42.6],[-8.4,43.4]]),
    route("wagram", "france", "Kampania 1809 roku", "Francuzi przeszli przez Bawarię do Wiednia i pokonali Austriaków pod Wagram.", "1809-03", "1809-07", [[2.3,48.9],[11.6,48.1],[16.4,48.2],[16.6,48.3]]),
    route("aspern", "coalition", "Aspern–Essling", "Austriacy zatrzymali Napoleona nad Dunajem, zadając mu pierwszą poważną klęskę w polu.", "1809-03", "1809-07", [[16.4,48.2],[16.5,48.2]]),
    route("russia", "france", "Inwazja Napoleona na Rosję", "Wielka Armia ruszyła znad Niemna przez Wilno i Smoleńsk. Po krwawej bitwie pod Borodino Napoleon zajął opuszczoną Moskwę.", "1812-05", "1812-09", [[24.0,54.9],[27.6,53.9],[32.0,54.8],[35.4,55.5],[37.6,55.8]]),
    route("russia-retreat", "coalition", "Odwrót spod Moskwy", "Po opuszczeniu Moskwy Wielka Armia cofała się przez Smoleńsk i przeprawiła przez Berezynę, naciskana przez wojska rosyjskie.", "1812-10", "1813-01", [[37.6,55.8],[32.0,54.8],[28.4,54.3],[27.6,53.9],[24.0,54.9]]),
    route("spring-1813", "france", "Wiosenna kampania 1813", "Napoleon odbudował armię i zwyciężył pod Lützen oraz Budziszynem, ale nie rozbił koalicji.", "1813-03", "1813-07", [[12.4,51.3],[14.4,51.2]]),
    route("germany-1813", "coalition", "Bitwa Narodów pod Lipskiem", "Wojska VI koalicji skoncentrowały się przeciw Napoleonowi i odcięły mu drogę utrzymania Niemiec.", "1813-07", "1813-11", [[16.4,48.2],[14.4,50.1],[12.4,51.3]]),
    route("vitoria", "coalition", "Vitoria i wyparcie Francuzów", "Armia Wellingtona rozbiła Francuzów pod Vitorią i przeniosła działania ku Pirenejom.", "1813-04", "1813-08", [[-7.9,40.6],[-3.7,42.8],[-1.6,43.0]]),
    route("france-1814", "coalition", "Inwazja na Francję", "Armie koalicji przekroczyły Ren i wkroczyły do Paryża, doprowadzając do abdykacji Napoleona.", "1813-12", "1814-04", [[13.4,52.5],[7.6,49.0],[2.3,48.9]]),
    route("six-days", "france", "Kampania sześciodniowa", "Napoleon odniósł serię szybkich zwycięstw nad rozdzielonymi korpusami koalicji na wschód od Paryża.", "1814-01", "1814-04", [[4.9,48.9],[3.4,48.9],[2.8,48.8]]),
    route("return-elba", "france", "Powrót z Elby", "Napoleon wylądował na południu Francji i bez większego oporu dotarł do Paryża, rozpoczynając Sto dni.", "1815-02", "1815-06", [[8.8,42.8],[6.0,43.1],[5.7,45.2],[2.3,48.9]]),
    route("waterloo-france", "france", "Sto dni – marsz do Belgii", "Napoleon ruszył na północ, próbując rozdzielić armie Wellingtona i Blüchera.", "1815-03", "1815-06", [[2.3,48.9],[4.4,50.4],[4.4,50.7]]),
    route("waterloo-coalition", "coalition", "Waterloo", "Siły brytyjsko-niderlandzkie i pruskie połączyły się przeciw armii Napoleona.", "1815-03", "1815-06", [[4.7,52.1],[4.4,50.7]]),
  ],
};

export const getActiveNapoleonicRoutes = (selectedMonth) => ({
  type: "FeatureCollection",
  features: selectedMonth
    ? napoleonicCampaignRoutes.features.filter(({ properties }) => (
      selectedMonth >= properties.start && selectedMonth <= properties.end
    )).map((feature) => revealRoute(feature, selectedMonth))
    : [],
});

export const getNapoleonicArrowheads = (selectedMonth) => (
  getActiveNapoleonicRoutes(selectedMonth).features.map((feature) => ({
    ...feature.properties,
    coordinates: feature.geometry.coordinates.at(-1),
    previousCoordinates: feature.geometry.coordinates.at(-2),
  }))
);
