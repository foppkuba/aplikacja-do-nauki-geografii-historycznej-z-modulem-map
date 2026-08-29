BEGIN;

ALTER TABLE historical_events ADD COLUMN IF NOT EXISTS external_id varchar(40);
CREATE UNIQUE INDEX IF NOT EXISTS historical_events_external_id_idx
    ON historical_events (external_id) WHERE external_id IS NOT NULL;

WITH data(title, description, event_date, place, country, longitude, latitude, external_id, source_url) AS (VALUES
('Wybuch I wojny światowej', 'Austro-Węgry wypowiedziały wojnę Serbii, rozpoczynając I wojnę światową.', DATE '1914-07-28', 'Wiedeń', 'Austro-Węgry', 16.3738, 48.2082, 'coverage:ww1-outbreak', 'https://www.wikidata.org/wiki/Q361'),
('Podpisanie pokoju w Amiens', 'Francja i Wielka Brytania zawarły pokój kończący wojnę II koalicji.', DATE '1802-03-25', 'Amiens', 'Francja', 2.2950, 49.8941, 'coverage:1802', 'https://www.wikidata.org/wiki/Q1127852'),
('Zamieszki na Spa Fields', 'W Londynie odbyła się radykalna demonstracja domagająca się reform politycznych.', DATE '1816-12-02', 'Londyn', 'Wielka Brytania', -0.1050, 51.5250, 'coverage:1816', 'https://www.wikidata.org/wiki/Q7573836'),
('Kongres w Akwizgranie', 'Mocarstwa europejskie obradowały nad zakończeniem okupacji Francji i ładem po wojnach napoleońskich.', DATE '1818-09-29', 'Akwizgran', 'Królestwo Prus', 6.0839, 50.7753, 'coverage:1818', 'https://www.wikidata.org/wiki/Q697242'),
('Konwencja akermańska', 'Rosja i Imperium Osmańskie podpisały porozumienie dotyczące Bałkanów i żeglugi.', DATE '1826-10-07', 'Akerman', 'Imperium Osmańskie', 30.3500, 46.1833, 'coverage:1826', 'https://www.wikidata.org/wiki/Q416016'),
('Święto w Hambach', 'Masowa demonstracja w Hambach poparła jedność Niemiec, wolność i prawa obywatelskie.', DATE '1832-05-27', 'Hambach', 'Królestwo Bawarii', 8.1180, 49.3360, 'coverage:1832', 'https://www.wikidata.org/wiki/Q314791'),
('Zamach Fieschiego', 'Giuseppe Fieschi przeprowadził w Paryżu nieudany zamach na króla Ludwika Filipa I.', DATE '1835-07-28', 'Paryż', 'Francja', 2.3522, 48.8566, 'coverage:1835', 'https://www.wikidata.org/wiki/Q3071815'),
('Inauguracja Łuku Triumfalnego', 'W Paryżu ukończono i oficjalnie otwarto Łuk Triumfalny.', DATE '1836-07-29', 'Paryż', 'Francja', 2.2950, 48.8738, 'coverage:1836', 'https://www.wikidata.org/wiki/Q64436'),
('Powrót prochów Napoleona do Francji', 'Szczątki Napoleona sprowadzono z Wyspy Świętej Heleny i złożono w paryskim Kościele Inwalidów.', DATE '1840-12-15', 'Paryż', 'Francja', 2.3126, 48.8550, 'coverage:1840', 'https://www.wikidata.org/wiki/Q104783820'),
('Konwencja londyńska w sprawie cieśnin', 'Europejskie mocarstwa uzgodniły zasady zamknięcia cieśnin tureckich dla okrętów wojennych.', DATE '1841-07-13', 'Londyn', 'Wielka Brytania', -0.1276, 51.5072, 'coverage:1841', 'https://www.wikidata.org/wiki/Q325674'),
('Wybuch wojny Sonderbundu', 'W Szwajcarii rozpoczęła się krótka wojna domowa między kantonami.', DATE '1847-11-03', 'Fryburg', 'Szwajcaria', 7.1619, 46.8065, 'coverage:1847', 'https://www.wikidata.org/wiki/Q695333'),
('Podpisanie traktatu paryskiego', 'Traktat paryski zakończył wojnę krymską.', DATE '1856-03-30', 'Paryż', 'Francja', 2.3522, 48.8566, 'coverage:1856', 'https://www.wikidata.org/wiki/Q186550'),
('Ogłoszenie układu okresowego pierwiastków', 'Dmitrij Mendelejew przedstawił Rosyjskiemu Towarzystwu Chemicznemu układ okresowy pierwiastków.', DATE '1869-03-06', 'Petersburg', 'Rosja', 30.3351, 59.9343, 'coverage:1869', 'https://www.wikidata.org/wiki/Q10693'),
('Rozstrzygnięcie roszczeń Alabamy', 'Trybunał w Genewie rozstrzygnął spór między Stanami Zjednoczonymi a Wielką Brytanią.', DATE '1872-09-14', 'Genewa', 'Szwajcaria', 6.1432, 46.2044, 'coverage:1872', 'https://www.wikidata.org/wiki/Q2833441'),
('Krach giełdowy w Wiedniu', 'Załamanie giełdy wiedeńskiej zapoczątkowało europejską część kryzysu gospodarczego 1873 roku.', DATE '1873-05-09', 'Wiedeń', 'Austro-Węgry', 16.3738, 48.2082, 'coverage:1873', 'https://www.wikidata.org/wiki/Q1311125'),
('Zawarcie Trójprzymierza', 'Niemcy, Austro-Węgry i Włochy zawarły sojusz wojskowy.', DATE '1882-05-20', 'Wiedeń', 'Austro-Węgry', 16.3738, 48.2082, 'coverage:1882', 'https://www.wikidata.org/wiki/Q151635'),
('Zjednoczenie Bułgarii', 'Księstwo Bułgarii połączyło się z Rumelią Wschodnią.', DATE '1885-09-18', 'Płowdiw', 'Bułgaria', 24.7453, 42.1354, 'coverage:1885', 'https://www.wikidata.org/wiki/Q765036'),
('Podpisanie traktatu reasekuracyjnego', 'Niemcy i Rosja zawarły tajne porozumienie o wzajemnej neutralności.', DATE '1887-06-18', 'Berlin', 'Niemcy', 13.4050, 52.5200, 'coverage:1887', 'https://www.wikidata.org/wiki/Q159748'),
('Podpisanie konwencji haskiej', 'Pierwsza konferencja haska przyjęła konwencje dotyczące pokojowego rozstrzygania sporów i prawa wojennego.', DATE '1899-07-29', 'Haga', 'Holandia', 4.3007, 52.0705, 'coverage:1899', 'https://www.wikidata.org/wiki/Q1135352'),
('Śmierć królowej Wiktorii', 'Śmierć królowej Wiktorii zakończyła epokę wiktoriańską w Wielkiej Brytanii.', DATE '1901-01-22', 'Osborne House', 'Wielka Brytania', -1.2700, 50.7500, 'coverage:1901', 'https://www.wikidata.org/wiki/Q9439'),
('Bitwa pod Mont Sorrel', 'Wojska kanadyjskie i brytyjskie walczyły z armią niemiecką w rejonie Ypres.', DATE '1916-06-02', 'Mont Sorrel', 'Belgia', 2.9300, 50.8200, 'coverage:1916-06', 'https://www.wikidata.org/wiki/Q6907497'),
('Bitwa pod Le Transloy', 'Rozpoczęła się kolejna faza bitwy nad Sommą.', DATE '1916-10-01', 'Le Transloy', 'Francja', 2.8900, 50.0600, 'coverage:1916-10', 'https://www.wikidata.org/wiki/Q4878172'),
('Bitwa nad Ancre', 'Brytyjska ofensywa nad Ancre była ostatnią dużą fazą bitwy nad Sommą.', DATE '1916-11-13', 'Ancre', 'Francja', 2.6500, 50.0800, 'coverage:1916-11', 'https://www.wikidata.org/wiki/Q4877784'),
('Wznowienie nieograniczonej wojny podwodnej', 'Niemcy wznowiły nieograniczoną wojnę podwodną podczas I wojny światowej.', DATE '1917-02-01', 'Berlin', 'Niemcy', 13.4050, 52.5200, 'coverage:1917-02', 'https://www.wikidata.org/wiki/Q7895656'),
('Bitwa o wzgórze 70', 'Korpus Kanadyjski zaatakował pozycje niemieckie w pobliżu Lens.', DATE '1917-08-15', 'Lens', 'Francja', 2.8300, 50.4300, 'coverage:1917-08', 'https://www.wikidata.org/wiki/Q4877965'),
('Adlertag — początek głównego uderzenia Luftwaffe', 'Luftwaffe rozpoczęła wielką operację lotniczą w ramach bitwy o Anglię.', DATE '1940-08-13', 'Południowa Anglia', 'Wielka Brytania', -0.1276, 51.5072, 'coverage:1940-08', 'https://www.wikidata.org/wiki/Q468321'),
('Sheffield Blitz', 'Luftwaffe przeprowadziła ciężki nalot na przemysłowe miasto Sheffield.', DATE '1940-12-12', 'Sheffield', 'Wielka Brytania', -1.4701, 53.3811, 'coverage:1940-12', 'https://www.wikidata.org/wiki/Q7493764')
), inserted AS (
  INSERT INTO historical_events
    (title, description, category_id, event_date, place, country, longitude, latitude, external_id)
  SELECT data.title, data.description, category.id, data.event_date, data.place, data.country,
         data.longitude, data.latitude, data.external_id
  FROM data
  JOIN event_categories category ON category.name = CASE
    WHEN data.title ~* 'bitwa|wojn|Adlertag|Blitz' THEN 'Wojna' ELSE 'Polityka' END
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id, external_id
)
INSERT INTO event_sources (event_id, title, url)
SELECT inserted.id, 'Wikidata', data.source_url
FROM inserted JOIN data USING (external_id);

DELETE FROM historical_events
WHERE title = 'Zamach w Sarajewie'
  AND place = title;

UPDATE historical_events
SET country = 'Austro-Węgry'
WHERE title = 'Zamach w Sarajewie'
  AND event_date = DATE '1914-06-28';

COMMIT;
