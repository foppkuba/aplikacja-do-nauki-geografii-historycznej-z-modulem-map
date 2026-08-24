# Baza danych Chronomap

## Sposób działania

Aplikacja korzysta z PostgreSQL. Frontend wysyła żądanie do serwera Express, a
serwer odczytuje dane z bazy i zwraca je jako JSON.

```text
Frontend React -> API Express -> PostgreSQL
```

Kod tworzący tabele znajduje się w
[`database/schema.sql`](../database/schema.sql).

## Diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "ma"
    USERS ||--o{ USER_EVENT_PROGRESS : "zapisuje"
    EVENT_CATEGORIES ||--o{ HISTORICAL_EVENTS : "określa kategorię"
    HISTORICAL_EVENTS ||--o{ EVENT_SOURCES : "ma źródła"
    HISTORICAL_EVENTS ||--o{ CAMPAIGN_ROUTES : "ma trasy"
    HISTORICAL_EVENTS ||--o{ USER_EVENT_PROGRESS : "ma postęp"

    USERS {
        bigint id PK
        varchar email UK
        text password_hash
        varchar display_name
    }

    SESSIONS {
        bigint id PK
        bigint user_id FK
        text token_hash UK
        timestamptz expires_at
    }

    EVENT_CATEGORIES {
        smallint id PK
        varchar name UK
        char color
    }

    HISTORICAL_EVENTS {
        bigint id PK
        varchar title
        text description
        smallint category_id FK
        date event_date
        varchar place
        varchar country
        double longitude
        double latitude
    }

    EVENT_SOURCES {
        bigint id PK
        bigint event_id FK
        text title
        text url
    }

    CAMPAIGN_ROUTES {
        bigint id PK
        bigint event_id FK
        varchar title
        jsonb path
    }

    USER_EVENT_PROGRESS {
        bigint user_id PK,FK
        bigint event_id PK,FK
        boolean is_favorite
        boolean is_completed
    }
```

## Znaczenie oznaczeń

- `PK` — identyfikator rekordu;
- `FK` — odwołanie do rekordu w innej tabeli;
- `UK` — wartość, która nie może się powtarzać.

## Tabele

### `users`

Podstawowe dane konta użytkownika:

- `id` — numer użytkownika;
- `email` — adres używany podczas logowania;
- `password_hash` — bezpieczny skrót hasła;
- `display_name` — nazwa wyświetlana w aplikacji.

### `sessions`

Informacja o zalogowaniu użytkownika:

- `id` — numer sesji;
- `user_id` — użytkownik, do którego należy sesja;
- `token_hash` — skrót tokenu logowania;
- `expires_at` — czas wygaśnięcia sesji.

### `event_categories`

Kategorie używane do grupowania i filtrowania wydarzeń:

- `id` — numer kategorii;
- `name` — nazwa, np. `Wojna`;
- `color` — kolor kategorii na mapie.

### `historical_events`

Dane wydarzenia wyświetlanego na mapie:

- `id` — numer wydarzenia;
- `title` — tytuł;
- `description` — opis;
- `category_id` — kategoria;
- `event_date` — data;
- `place` — nazwa miejsca;
- `country` — państwo;
- `longitude` — długość geograficzna;
- `latitude` — szerokość geograficzna.

Rok jest wyliczany z `event_date`, dlatego nie ma osobnej kolumny `year`.
`place` jest podpisem dla użytkownika, a `longitude` i `latitude` wskazują dokładne
miejsce znacznika na mapie.

### `event_sources`

Źródła potwierdzające informacje o wydarzeniu:

- `id` — numer źródła;
- `event_id` — wydarzenie;
- `title` — nazwa książki, artykułu lub strony;
- `url` — opcjonalny adres internetowy.

### `campaign_routes`

Trasy powiązane z wydarzeniem:

- `id` — numer trasy;
- `event_id` — powiązane wydarzenie;
- `title` — nazwa trasy;
- `path` — lista współrzędnych zapisana jako JSON.

Przykład pola `path`:

```json
[[21.01, 52.23], [19.94, 50.06]]
```

### `user_event_progress`

Postęp użytkownika dla wybranego wydarzenia:

- `user_id` — użytkownik;
- `event_id` — wydarzenie;
- `is_favorite` — informacja, czy wydarzenie jest ulubione;
- `is_completed` — informacja, czy materiał został ukończony.

## Ładowanie wydarzeń

Frontend wywołuje endpoint:

```http
GET /api/events
```

API pobiera rekordy z `historical_events`, dołącza nazwę kategorii i zwraca dane
w formacie wymaganym przez mapę:

```json
{
  "events": [
    {
      "id": 1,
      "year": 1410,
      "date": "1410-07-15",
      "title": "Bitwa pod Grunwaldem",
      "description": "Opis wydarzenia",
      "place": "Grunwald",
      "country": "Polska",
      "category": "Wojna",
      "type": "wydarzenie",
      "coordinates": [20.1333, 53.4833]
    }
  ]
}
```

Dostępne filtry:

```http
GET /api/events?from=1939-01-01
GET /api/events?to=1945-12-31
GET /api/events?category=Wojna
```

Endpoint `GET /api/health` sprawdza połączenie z bazą przez zapytanie `SELECT 1`.

## Usuwanie danych

- usunięcie użytkownika usuwa jego sesje i postęp;
- usunięcie wydarzenia usuwa jego źródła i postęp;
- usunięcie kategorii pozostawia wydarzenie bez kategorii;
- usunięcie wydarzenia pozostawia trasę bez przypisania.

## Uruchomienie

Po utworzeniu bazy `chronomap` schemat można wykonać poleceniem:

```bash
psql -d chronomap -f database/schema.sql
```

Konfiguracja backendu w pliku `.env`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chronomap
DATABASE_SSL=false
PORT=3000
```

Schemat dodaje trzy początkowe kategorie: `Wojna`, `Polityka` i `Gospodarka`.
Nie dodaje wydarzeń — rekordy `historical_events` trzeba wprowadzić osobno.

## Stan aplikacji

API odczytuje obecnie wydarzenia i sprawdza połączenie z bazą. Tabele użytkowników,
sesji, źródeł, tras i postępu są przygotowane, ale nie mają jeszcze własnych
endpointów API.
