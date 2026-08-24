INSERT INTO historical_events (
    title,
    description,
    category_id,
    event_date,
    place,
    country,
    longitude,
    latitude
)
SELECT
    event.title,
    event.description,
    category.id,
    event.event_date,
    event.place,
    event.country,
    event.longitude,
    event.latitude
FROM (VALUES
    (
        'Bitwa pod Grunwaldem',
        'Jedna z największych bitew średniowiecznej Europy, zakończona zwycięstwem wojsk polsko-litewskich nad zakonem krzyżackim.',
        'Wojna',
        DATE '1410-07-15',
        'Grunwald',
        'Polska',
        20.1333,
        53.4833
    ),
    (
        'Uchwalenie Konstytucji 3 maja',
        'Sejm Czteroletni uchwalił pierwszą w Europie i drugą na świecie nowoczesną konstytucję.',
        'Polityka',
        DATE '1791-05-03',
        'Warszawa',
        'Polska',
        21.0122,
        52.2297
    ),
    (
        'Wybuch powstania listopadowego',
        'Rozpoczęcie polskiego powstania narodowego przeciwko Imperium Rosyjskiemu.',
        'Wojna',
        DATE '1830-11-29',
        'Warszawa',
        'Polska',
        21.0122,
        52.2297
    ),
    (
        'Zamach w Sarajewie',
        'Zabójstwo arcyksięcia Franciszka Ferdynanda stało się bezpośrednim impulsem do wybuchu I wojny światowej.',
        'Polityka',
        DATE '1914-06-28',
        'Sarajewo',
        'Bośnia i Hercegowina',
        18.4131,
        43.8563
    ),
    (
        'Wybuch II wojny światowej',
        'Atak Niemiec na Polskę rozpoczął II wojnę światową w Europie.',
        'Wojna',
        DATE '1939-09-01',
        'Westerplatte',
        'Polska',
        18.6716,
        54.4075
    ),
    (
        'Podpisanie traktatów rzymskich',
        'Sześć państw europejskich podpisało traktaty ustanawiające Europejską Wspólnotę Gospodarczą.',
        'Gospodarka',
        DATE '1957-03-25',
        'Rzym',
        'Włochy',
        12.4964,
        41.9028
    ),
    (
        'Upadek muru berlińskiego',
        'Otwarcie przejść granicznych w Berlinie stało się symbolem końca podziału Niemiec i zimnej wojny.',
        'Polityka',
        DATE '1989-11-09',
        'Berlin',
        'Niemcy',
        13.3777,
        52.5163
    )
) AS event(title, description, category_name, event_date, place, country, longitude, latitude)
JOIN event_categories category ON category.name = event.category_name
WHERE NOT EXISTS (
    SELECT 1
    FROM historical_events existing
    WHERE existing.title = event.title
      AND existing.event_date = event.event_date
);
