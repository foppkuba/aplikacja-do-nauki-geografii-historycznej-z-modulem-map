const route = (id, side, title, description, start, end, coordinates) => ({
  type: "Feature",
  properties: { id, side, title, description, start, end },
  geometry: { type: "LineString", coordinates },
});

// Schematyczne kierunki najważniejszych operacji lądowych europejskiego teatru
// II wojny światowej. Daty mają dokładność miesięczną, zgodną z osią czasu UI.
export const ww2CampaignRoutes = {
  type: "FeatureCollection",
  features: [
    route("fall-weiss-north", "axis", "Fall Weiss – uderzenie z północy", "Niemieckie natarcie z Prus Wschodnich na Warszawę.", "1939-09", "1939-09", [[20.6,54.2],[20.8,53.3],[21.0,52.2]]),
    route("fall-weiss-west", "axis", "Fall Weiss – uderzenie z zachodu", "Główne niemieckie natarcie przez Wielkopolskę i Łódź.", "1939-09", "1939-09", [[15.3,52.2],[17.5,52.0],[19.5,51.8],[21.0,52.2]]),
    route("fall-weiss-south", "axis", "Fall Weiss – uderzenie z południa", "Natarcie ze Śląska i Słowacji w stronę Krakowa i Lwowa.", "1939-09", "1939-09", [[17.0,50.4],[19.9,50.1],[22.0,49.9],[24.0,49.8]]),
    route("soviet-poland-north", "ussr", "Agresja ZSRR – Front Białoruski", "Wkroczenie Armii Czerwonej do Polski od 17 września.", "1939-09", "1939-09", [[27.5,53.7],[25.0,53.2],[23.2,52.1]]),
    route("soviet-poland-south", "ussr", "Agresja ZSRR – Front Ukraiński", "Radzieckie natarcie na Lwów i południowo-wschodnią Polskę.", "1939-09", "1939-09", [[27.4,50.4],[25.6,50.1],[24.0,49.8]]),
    route("bzura", "allies", "Polska kontrofensywa nad Bzurą", "Uderzenie armii „Poznań” i „Pomorze” na skrzydło 8. Armii.", "1939-09", "1939-09", [[19.2,52.2],[19.4,52.0],[19.8,51.9]]),
    route("winter-war", "ussr", "Wojna zimowa", "Radzieckie natarcie na Finlandię i linię Mannerheima.", "1939-11", "1940-03", [[30.5,61.3],[29.3,60.8],[28.5,60.4]]),
    route("weserubung-denmark", "axis", "Operacja Weserübung – Dania", "Niemiecka inwazja na Danię.", "1940-04", "1940-04", [[10.0,54.8],[10.2,56.0]]),
    route("weserubung-norway", "axis", "Operacja Weserübung – Norwegia", "Desanty i natarcia na Oslo, Trondheim i Narwik.", "1940-04", "1940-06", [[10.5,57.0],[10.7,59.9],[10.4,63.4],[17.4,68.4]]),
    route("fall-gelb-ardennes", "axis", "Fall Gelb – uderzenie przez Ardeny", "Niemieckie wojska pancerne przecięły front aliantów i dotarły do kanału La Manche.", "1940-05", "1940-06", [[7.1,50.2],[4.8,49.8],[2.8,50.5],[1.6,50.9]]),
    route("fall-gelb-lowlands", "axis", "Fall Gelb – Niderlandy i Belgia", "Natarcie na Rotterdam, Brukselę i północną Francję.", "1940-05", "1940-06", [[7.0,51.3],[5.0,51.5],[4.4,50.8],[2.3,50.6]]),
    route("fall-rot", "axis", "Fall Rot – bitwa o Francję", "Natarcie znad Sommy w głąb Francji.", "1940-06", "1940-06", [[2.5,50.0],[2.3,48.9],[2.0,47.0],[1.5,45.5]]),
    route("battle-britain", "axis", "Bitwa o Anglię", "Główne kierunki niemieckiej ofensywy powietrznej nad południową Anglią.", "1940-07", "1940-10", [[3.5,50.8],[1.0,51.0],[-0.1,51.5]]),
    route("balkans-yugoslavia", "axis", "Inwazja na Jugosławię", "Natarcie państw Osi na Belgrad.", "1941-04", "1941-04", [[20.0,47.0],[20.4,45.8],[20.5,44.8]]),
    route("balkans-greece", "axis", "Operacja Marita", "Niemieckie natarcie przez Bałkany na Grecję.", "1941-04", "1941-05", [[23.3,42.7],[22.9,40.6],[23.7,38.0]]),
    route("barbarossa-north", "axis", "Barbarossa – Grupa Armii Północ", "Natarcie przez państwa bałtyckie na Leningrad.", "1941-06", "1941-12", [[20.5,54.5],[24.1,56.9],[27.0,59.9],[30.3,59.9]]),
    route("barbarossa-centre", "axis", "Barbarossa – Grupa Armii Środek", "Główne uderzenie przez Mińsk i Smoleńsk na Moskwę.", "1941-06", "1941-12", [[21.5,52.5],[27.6,53.9],[32.0,54.8],[37.6,55.8]]),
    route("barbarossa-south", "axis", "Barbarossa – Grupa Armii Południe", "Natarcie przez Ukrainę w stronę Kijowa i Donbasu.", "1941-06", "1941-12", [[22.5,50.5],[26.0,50.3],[30.5,50.4],[36.3,49.9]]),
    route("moscow-counteroffensive", "ussr", "Kontrofensywa pod Moskwą", "Armia Czerwona odrzuciła wojska niemieckie od stolicy.", "1941-12", "1942-01", [[38.8,55.3],[36.8,55.7],[34.8,55.4]]),
    route("case-blue-stalingrad", "axis", "Fall Blau – kierunek Stalingrad", "Niemieckie natarcie znad Donu ku Wołdze.", "1942-06", "1942-11", [[32.0,50.2],[36.0,49.5],[40.2,49.0],[44.5,48.7]]),
    route("case-blue-caucasus", "axis", "Fall Blau – kierunek Kaukaz", "Grupa Armii A ruszyła ku polom naftowym Kaukazu.", "1942-07", "1942-11", [[38.0,48.5],[39.7,46.7],[42.7,44.6],[44.7,43.0]]),
    route("uranus-north", "ussr", "Operacja Uran – północne kleszcze", "Radzieckie okrążenie wojsk Osi pod Stalingradem.", "1942-11", "1943-02", [[42.3,50.2],[43.2,49.3],[44.1,48.8]]),
    route("uranus-south", "ussr", "Operacja Uran – południowe kleszcze", "Południowe ramię okrążenia 6. Armii.", "1942-11", "1943-02", [[43.0,47.3],[43.5,48.1],[44.1,48.8]]),
    route("kursk-north", "axis", "Cytadela – północne uderzenie", "Niemieckie natarcie na północny skraj łuku kurskiego.", "1943-07", "1943-07", [[36.1,52.8],[36.2,51.8]]),
    route("kursk-south", "axis", "Cytadela – południowe uderzenie", "Natarcie 4. Armii Pancernej w stronę Prochorowki.", "1943-07", "1943-07", [[36.6,50.4],[36.8,51.0]]),
    route("kursk-counter", "ussr", "Radziecka kontrofensywa po Kursku", "Armia Czerwona przeszła do ofensywy na Charków i Dniepr.", "1943-08", "1943-11", [[36.2,51.7],[35.0,50.5],[32.0,49.5],[30.5,50.4]]),
    route("sicily", "allies", "Operacja Husky", "Alianckie lądowanie na Sycylii.", "1943-07", "1943-08", [[12.0,35.5],[13.0,37.0],[14.3,37.7]]),
    route("italy-mainland", "allies", "Kampania włoska", "Natarcie aliantów z Sycylii przez południowe i środkowe Włochy.", "1943-09", "1944-06", [[15.7,38.0],[15.6,40.6],[14.3,41.1],[13.1,43.0],[12.5,43.8]]),
    route("normandy", "allies", "Operacja Overlord", "Lądowanie w Normandii i rozwinięcie przyczółka.", "1944-06", "1944-07", [[-1.8,49.3],[-0.6,49.2],[0.2,49.0]]),
    route("cobra-paris", "allies", "Operacja Cobra i wyzwolenie Paryża", "Przełamanie z Normandii i marsz na Paryż.", "1944-07", "1944-08", [[-1.2,49.0],[-0.7,48.2],[1.0,48.5],[2.35,48.86]]),
    route("bagration", "ussr", "Operacja Bagration", "Rozbicie Grupy Armii Środek i marsz przez Białoruś ku Wiśle.", "1944-06", "1944-08", [[31.0,54.0],[27.6,53.9],[24.0,53.0],[21.0,52.2]]),
    route("lviv-sandomierz", "ussr", "Operacja lwowsko-sandomierska", "Radzieckie natarcie przez zachodnią Ukrainę ku Wiśle.", "1944-07", "1944-08", [[27.5,49.8],[24.0,49.8],[21.3,50.6]]),
    route("market-garden", "allies", "Operacja Market Garden", "Alianckie uderzenie przez Holandię w kierunku Renu.", "1944-09", "1944-09", [[4.8,51.6],[5.5,51.8],[5.9,52.0]]),
    route("ardennes", "axis", "Ofensywa w Ardenach", "Ostatnia wielka ofensywa niemiecka na Zachodzie.", "1944-12", "1945-01", [[6.2,50.2],[5.5,50.0],[5.0,50.1]]),
    route("vistula-oder", "ussr", "Operacja wiślańsko-odrzańska", "Armia Czerwona ruszyła znad Wisły ku Odrze.", "1945-01", "1945-02", [[21.3,51.8],[18.6,52.0],[15.0,52.2],[14.5,52.5]]),
    route("rhein", "allies", "Przekroczenie Renu", "Alianci zachodni wkroczyli w głąb Niemiec.", "1945-03", "1945-04", [[5.8,50.8],[7.1,51.0],[9.5,51.5],[11.5,51.2]]),
    route("berlin-east", "ussr", "Operacja berlińska", "Radzieckie uderzenie znad Odry na Berlin.", "1945-04", "1945-05", [[14.6,52.5],[13.9,52.5],[13.4,52.5]]),
    route("germany-west", "allies", "Natarcie aliantów w Niemczech", "Wojska zachodnich aliantów dotarły do Łaby.", "1945-04", "1945-05", [[8.0,50.5],[10.2,51.1],[12.0,51.5],[13.0,51.8]]),
    route("prague", "ussr", "Operacja praska", "Ostatnia wielka ofensywa Armii Czerwonej w Europie.", "1945-05", "1945-05", [[14.5,51.2],[14.4,50.1]]),
  ],
};

export const isRouteActive = (feature, selectedMonth) => (
  selectedMonth >= feature.properties.start && selectedMonth <= feature.properties.end
);

export const getActiveCampaignRoutes = (selectedMonth) => ({
  type: "FeatureCollection",
  features: ww2CampaignRoutes.features.filter((feature) => isRouteActive(feature, selectedMonth)),
});

export const getCampaignArrowheads = (selectedMonth) => getActiveCampaignRoutes(selectedMonth).features.map((feature) => ({
  ...feature.properties,
  coordinates: feature.geometry.coordinates.at(-1),
  previousCoordinates: feature.geometry.coordinates.at(-2),
}));
