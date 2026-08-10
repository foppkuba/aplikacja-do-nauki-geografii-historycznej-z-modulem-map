export const septemberCampaignRoutes = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { id: "north-warsaw", side: "germany", title: "Natarcie z Prus Wschodnich", description: "Uderzenie w kierunku Narwi, Modlina i Warszawy." }, geometry: { type: "LineString", coordinates: [[20.55, 54.15], [20.85, 53.35], [20.65, 52.62], [21.01, 52.23]] } },
    { type: "Feature", properties: { id: "pomerania", side: "germany", title: "Natarcie przez Pomorze", description: "Natarcie w kierunku Bydgoszczy, połączenia z Prusami Wschodnimi i środkowej Wisły." }, geometry: { type: "LineString", coordinates: [[16.55, 54.05], [17.55, 53.45], [18.05, 53.12], [18.75, 52.72], [20.25, 52.38]] } },
    { type: "Feature", properties: { id: "silesia-warsaw", side: "germany", title: "Główne uderzenie ze Śląska", description: "Natarcie przez rejon Częstochowy i Łodzi w stronę Warszawy." }, geometry: { type: "LineString", coordinates: [[16.35, 50.85], [18.05, 50.95], [19.12, 51.45], [19.46, 51.76], [21.01, 52.23]] } },
    { type: "Feature", properties: { id: "south-lwow", side: "germany", title: "Natarcie z południa", description: "Uderzenie ze Słowacji i południowego Śląska w kierunku Krakowa, Karpat i Lwowa." }, geometry: { type: "LineString", coordinates: [[18.75, 49.35], [19.95, 50.05], [21.15, 50.05], [22.15, 49.85], [24.03, 49.84]] } },
    { type: "Feature", properties: { id: "soviet-north", side: "ussr", title: "Agresja ZSRR — Front Białoruski", description: "Natarcie Armii Czerwonej od 17 września przez północno-wschodnie ziemie Polski." }, geometry: { type: "LineString", coordinates: [[25.45, 53.75], [24.35, 53.45], [23.35, 53.13], [23.15, 52.10]] } },
    { type: "Feature", properties: { id: "soviet-south", side: "ussr", title: "Agresja ZSRR — Front Ukraiński", description: "Natarcie Armii Czerwonej od 17 września w kierunku Lwowa i południowo-wschodniej Polski." }, geometry: { type: "LineString", coordinates: [[26.35, 50.45], [25.30, 50.15], [24.65, 49.95], [24.03, 49.84]] } },
    { type: "Feature", properties: { id: "bzura", side: "poland", title: "Polska kontrofensywa nad Bzurą", description: "Uderzenie armii „Poznań” i „Pomorze” na skrzydło niemieckiej 8. Armii, rozpoczęte 9 września." }, geometry: { type: "LineString", coordinates: [[19.18, 52.15], [19.30, 51.98], [19.55, 51.88], [19.72, 51.94]] } },
  ],
};

export const septemberCampaignArrowheads = septemberCampaignRoutes.features.map((feature) => ({
  id: feature.properties.id,
  side: feature.properties.side,
  title: feature.properties.title,
  description: feature.properties.description,
  coordinates: feature.geometry.coordinates.at(-1),
  previousCoordinates: feature.geometry.coordinates.at(-2),
}));
