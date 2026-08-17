# Propozycja bazy danych Chronomap

## Rekomendacja

PostgreSQL z rozszerzeniem PostGIS. PostgreSQL przechowa dane aplikacyjne i konta,
a PostGIS pozwoli zapisywać punkty wydarzeń oraz trasy kampanii jako prawdziwe dane
geograficzne. Backend powinien udostępniać frontendowi API; przeglądarka nie powinna
łączyć się bezpośrednio z bazą przy użyciu uprzywilejowanego konta.

Na start wystarczy jeden serwer aplikacji i jedna baza. Nie ma potrzeby tworzenia
osobnej bazy tylko dla logowania.

## Zakres MVP

```text
users 1---n sessions
  |
  +---n user_event_progress n---1 historical_events n---1 event_categories
                                     |
                                     +---n event_sources
                                     +---n campaign_routes
```

- `users` — konta i role (`user`, `editor`, `admin`),
- `sessions` — sesje logowania; w bazie znajduje się wyłącznie skrót tokenu,
- `historical_events` — wydarzenia, zakres dat, opis i punkt na mapie,
- `event_categories` — np. Wojna, Polityka, Gospodarka,
- `event_sources` — bibliografia i linki potwierdzające dane,
- `campaign_routes` — linie ofensyw/kampanii widoczne na mapie,
- `user_event_progress` — ulubione, obejrzane i ukończone wydarzenia.

Gotowy schemat znajduje się w `database/schema.sql`.

## Logowanie i hasła

Hasło nigdy nie może być zapisane jako zwykły tekst ani szyfrowane w sposób
odwracalny. Backend powinien tworzyć hash Argon2id (z indywidualną solą; biblioteka
zapisuje parametry i sól w wynikowym ciągu) i umieszczać go w `users.password_hash`.

Proponowany przepływ:

1. rejestracja: normalizacja e-maila, walidacja hasła, utworzenie hasha Argon2id;
2. logowanie: porównanie hasła przez bibliotekę Argon2, bez ręcznego porównywania;
3. po sukcesie: krótko żyjący token dostępu oraz losowy token odświeżający;
4. w `sessions` zapisujemy SHA-256 tokenu odświeżającego, nie sam token;
5. wylogowanie lub zmiana hasła unieważnia sesję (`revoked_at`);
6. endpointy edytorskie sprawdzają rolę po stronie backendu.

Reset hasła i weryfikację e-maila można dodać jako tabelę jednorazowych tokenów,
również przechowując wyłącznie ich hashe. Alternatywnie uwierzytelnianie może być
obsługiwane przez zewnętrznego dostawcę; wtedy `password_hash` pozostaje puste,
a konto identyfikuje para `auth_provider` + `auth_provider_subject`.

## Model wydarzenia

Obecne pola z `src/events.js` mapują się następująco:

| Obecne pole | Kolumna w bazie |
|---|---|
| `id` | `legacy_id` (tymczasowo podczas migracji) |
| `title` | `title` |
| `description` | `description` |
| `date` | `display_date` |
| `year` | wyliczany z `start_date` |
| `place` | `place_name` |
| `country` | `country_name` |
| `category` | `category_id` |
| `type` | `event_type` |
| `coordinates: [lng, lat]` | `location geography(Point, 4326)` |

`start_date` i `end_date` pozwalają opisać zarówno pojedynczy dzień, jak i bitwę
trwającą kilka miesięcy. `date_precision` obsługuje wydarzenia, dla których znamy
tylko rok lub miesiąc. `display_date` zachowuje poprawny podpis po polsku.

Status publikacji (`draft`, `published`, `archived`) umożliwia późniejsze dodanie
panelu redakcyjnego bez pokazywania użytkownikom niedokończonych wpisów. Pole
`version` pomoże zapobiegać przypadkowemu nadpisaniu równoległych zmian.

## API proponowane na pierwszy etap

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/events?from=1939-01-01&to=1939-12-31&category=wojna`
- `GET /api/events/:slug`
- `POST/PATCH /api/events` — tylko `editor` lub `admin`
- `PUT /api/me/events/:id/progress`

Zapytanie listujące wydarzenia powinno przyjmować zakres dat i opcjonalny obszar
mapy (`bbox`). Indeksy w schemacie obsługują oba rodzaje filtrowania.

## Kolejność wdrożenia

1. Uruchomić PostgreSQL/PostGIS i zastosować `database/schema.sql`.
2. Dodać backend (np. Node.js + Fastify/Express) i konfigurację przez zmienne
   środowiskowe; sekretów nie umieszczać w repozytorium.
3. Zaimplementować rejestrację, logowanie, odświeżanie i wylogowanie.
4. Napisać jednorazowy importer `events.js`, `timelineData.js` i tras kampanii.
5. Zastąpić import `events.js` wywołaniem API, zachowując dotychczasowy format DTO,
   aby ograniczyć zmiany w komponencie mapy.
6. Dodać panel redaktora i postęp użytkownika.

Quizy i lekcje warto dodać w drugiej migracji, gdy ich format w interfejsie będzie
już ustalony. Dzięki temu pierwszy schemat nie narzuci przedwcześnie złego modelu.
