# React + Vite

## Uruchamianie aplikacji

Wymagania: zainstalowane środowisko [Node.js](https://nodejs.org/) wraz z npm.

1. Otwórz terminal w katalogu projektu.
2. Zainstaluj zależności (wystarczy zrobić to przy pierwszym uruchomieniu lub po ich zmianie):

   ```bash
   npm install
   ```

3. Utwórz bazę PostgreSQL z PostGIS i zastosuj schemat:

   ```bash
   psql -d chronomap -f database/schema.sql
   ```

4. Skopiuj `.env.example` do `.env` i uzupełnij `DATABASE_URL`. Aplikacja odczytuje
   wydarzenia z PostgreSQL. Stała kopia obecnego zestawu 333 wydarzeń ze źródłami
   znajduje się w `database/events.snapshot.json`.

5. W pustej bazie odtwórz zapisany zestaw wydarzeń (bez dostępu do Wikidata):

   ```bash
   npm run restore:events
   ```

   Odtwarzanie obsługuje bieżący schemat i starszą bazę po `npm run migrate:legacy`.
   Jeśli tabela wydarzeń zawiera dane, polecenie przerywa pracę bez ich zmiany.
   Cały zapis jest wykonywany w jednej transakcji. Treść, daty, współrzędne,
   kategorie i źródła pochodzą z eksportu; techniczne identyfikatory są nadawane
   ponownie. Eksport nie obejmuje kont użytkowników ani ich powiązań autorstwa.
   Pola starszego schematu zachowywane są, jeśli istnieją w docelowej bazie.

   `npm run export:events` tworzy taką kopię bieżącej bazy i odmawia nadpisania
   istniejącego `database/events.snapshot.json`. Zachowaj ten plik w repozytorium.
   Jest to kopia aktualnego zestawu, a nie odzyskany eksport z wcześniejszych wersji.
   Nie uzupełnia brakujących lat z `coverage-events.sql`.

   `npm run import:events` pozostaje osobnym, opcjonalnym importem aktualnych
   danych Wikidata. Nie używaj go do odtwarzania stałego zestawu: może dopisać
   inne wydarzenia. Aplikacja nie uruchamia go automatycznie.
   W okresach wojen mapa pokazuje tylko wydarzenia z wybranego miesiąca.

6. Przygotuj tabele kont i postępów (także po aktualizacji starszej bazy):

   ```bash
   npm run db:auth
   npm run db:progress
   ```

   Następnie w dwóch terminalach uruchom API i frontend:

   ```bash
   npm run dev:api
   npm run dev
   ```

7. Otwórz w przeglądarce adres wyświetlony w terminalu, domyślnie:

   http://localhost:5173/

Serwer można zatrzymać skrótem `Ctrl+C` w terminalu.

## Lekcje historii

Sekcja „Lekcje” (`#lekcje`) zawiera siedem lekcji XIX–XXI wieku, filtr wieku,
omówienia wydarzeń, najważniejsze daty i quiz po każdym temacie. Przycisk na końcu
materiału otwiera przypisany quiz z trzema pytaniami, wyjaśnieniami i wynikiem.
Po quizie można powtórzyć próbę, wrócić do materiału lub przejść do następnej lekcji.

Treść i pytania znajdują się w `src/historyLessons.js`, a interfejs w
`src/LessonsModule.jsx`. Quizy lekcji korzystają z komponentu `QuizModule` w trybie
lokalnym: same pytania nie wymagają API. Quizy kategorii pobierają pytania z PostgreSQL.

## Twoje postępy

Sekcja `#postepy` zastępuje kafelki zapowiedzi modułów. Po zalogowaniu ukończenie
quizu lekcji lub quizu kategorii zapisuje próbę w `learning_attempts`. Serwer
sam wylicza wynik z odpowiedzi i przypisuje go do konta z sesji. Ponowienie zapisu
tej samej próby nie zwiększa statystyk. Zmiana konta rozpoczyna nową sesję quizu.

Panel pokazuje ukończone lekcje (rozwiązany quiz, niezależnie od wyniku), liczbę
ukończonych prób obu rodzajów, odsetek poprawnych odpowiedzi ze wszystkich prób,
najlepszy wynik każdej lekcji i 10 ostatnich wyników. Czas liczony jest tylko
podczas quizu w aktywnej, widocznej karcie i zapisywany przy jego ukończeniu.
Materiały lekcji pozostają ścieżką nauki; nie ma osobnego modułu ścieżek.

Goście mogą ćwiczyć bez zapisu. Zaloguj się przed rozpoczęciem quizu. Starszych
wyników nie da się odtworzyć. Błąd zapisu pozostawia wynik na ekranie z przyciskiem
ponowienia. Odtworzenie eksportu wydarzeń nie odtwarza postępów kont.

Test integracyjny: `npm run test:progress` (wymaga przygotowanych tabel kont,
quizów i postępów). Sprawdza weryfikację odpowiedzi, zapis obu rodzajów quizów,
ponawianie żądań i izolację kont; po zakończeniu usuwa swoje konta testowe.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
