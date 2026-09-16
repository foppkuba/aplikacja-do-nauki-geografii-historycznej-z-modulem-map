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

4. Skopiuj `.env.example` do `.env` i uzupełnij `DATABASE_URL`. Wydarzenia są
   przechowywane wyłącznie w tabeli `historical_events` i nie mają kopii w plikach
   źródłowych aplikacji.

5. W dwóch terminalach uruchom API i frontend:

   ```bash
   npm run dev:api
   npm run dev
   ```

6. Otwórz w przeglądarce adres wyświetlony w terminalu, domyślnie:

   http://localhost:5173/

Serwer można zatrzymać skrótem `Ctrl+C` w terminalu.

## Lekcje historii

Sekcja „Lekcje” (`#lekcje`) zawiera siedem lekcji XIX–XXI wieku, filtr wieku,
omówienia wydarzeń, najważniejsze daty i quiz po każdym temacie. Przycisk na końcu
materiału otwiera przypisany quiz z trzema pytaniami, wyjaśnieniami i wynikiem.
Po quizie można powtórzyć próbę, wrócić do materiału lub przejść do następnej lekcji.

Treść i pytania znajdują się w `src/historyLessons.js`, a interfejs w
`src/LessonsModule.jsx`. Quizy lekcji korzystają z komponentu `QuizModule` w trybie
lokalnym: nie wymagają migracji bazy ani uruchomionego API. Dotychczasowe quizy
kategorii nadal pobierają pytania z PostgreSQL. Wyniki lekcji nie są zapisywane
na koncie i znikają po opuszczeniu quizu lub odświeżeniu strony.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
