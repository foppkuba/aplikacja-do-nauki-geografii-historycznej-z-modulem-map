export const EUROPE_BOUNDS = [[-25, 34], [45, 72]];
export const POLISH_MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];

export const monthKeyFromIndex = (index) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
export const monthIndexFromKey = (key) => {
  const [year, month] = key.split('-').map(Number);
  return year * 12 + month - 1;
};
export const formatMonthKey = (key) => {
  const [year, month] = key.split('-').map(Number);
  return `${POLISH_MONTHS[month - 1]} ${year}`;
};
export const isEventInEurope = ({ coordinates: [longitude, latitude] }) => (
  longitude >= EUROPE_BOUNDS[0][0] && longitude <= EUROPE_BOUNDS[1][0]
  && latitude >= EUROPE_BOUNDS[0][1] && latitude <= EUROPE_BOUNDS[1][1]
);
export const filterMapEvents = (events, year, selectedMonth, filters = {}) => events.filter((event) => (
  (selectedMonth ? event.date.startsWith(selectedMonth) : event.year === Number(year))
  && (!filters.country || event.country === filters.country)
  && (!filters.category || event.category === filters.category)
));
