// Daty miesięczne odpowiadają zakresom obsługiwanym przez mapę.
export const lessonMapLinks = {
  napoleon: { years: [1803, 1815], stops: [
    { date: '1807-07', label: 'Europa w czasach Księstwa Warszawskiego' },
    { date: '1812-09', label: 'Wyprawa na Rosję' },
    { date: '1815-06', label: 'Koniec epoki napoleońskiej' },
  ] },
  'przemiany-xix-wieku': { years: [1815, 1900], stops: [
    { date: '1830', label: 'Europa w roku powstania listopadowego' },
    { date: '1848', label: 'Wiosna Ludów' },
    { date: '1871', label: 'Europa po zjednoczeniu Niemiec' },
  ] },
  'pierwsza-wojna': { years: [1914, 1918], stops: [
    { date: '1914-07', label: 'Początek I wojny światowej' },
    { date: '1917-04', label: 'Europa w 1917 roku' },
    { date: '1918-11', label: 'Koniec wojny i niepodległość Polski' },
  ] },
  miedzywojnie: { years: [1919, 1939], stops: [
    { date: '1919', label: 'Europa po I wojnie światowej' },
    { date: '1933', label: 'Dojście Hitlera do władzy' },
    { date: '1938', label: 'Europa przed wybuchem wojny' },
  ] },
  'druga-wojna': { years: [1939, 1945], stops: [
    { date: '1939-09', label: 'Agresje na Polskę' },
    { date: '1944-06', label: 'Lądowanie w Normandii' },
    { date: '1945-05', label: 'Koniec wojny w Europie' },
  ] },
  'zimna-wojna': { years: [1947, 1991], stops: [
    { date: '1949', label: 'Europa w roku powstania NATO' },
    { date: '1989', label: 'Przemiany w Europie' },
    { date: '1991', label: 'Koniec zimnej wojny' },
  ] },
  'xxi-wiek': { years: [2001, 2025], stops: [
    { date: '2004', label: 'Europa w roku wejścia Polski do UE' },
    { date: '2020', label: 'Europa w roku Brexitu' },
  ] },
};
