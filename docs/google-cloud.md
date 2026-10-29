# Wdrożenie na Google Cloud na 90 dni

## 1. Konto i serwer

Aktywuj promocję dopiero po przygotowaniu projektu. Dla uprawnionych nowych kont
Google daje 300 USD na 90 dni od aktywacji. To kredyt na zużycie, a nie darmowy
abonament bez limitu. Bez przejścia na konto płatne koniec promocji zatrzyma zasoby.
Trzy miesiące kalendarzowe mogą być dłuższe niż 90 dni.

W https://console.cloud.google.com/ utwórz projekt `chronomap`, powiąż konto
rozliczeniowe z promocją i włącz Compute Engine API. W Billing sprawdź datę końca
kredytu; ustaw alerty budżetu (np. 50 USD, progi 50%, 90%, 100%). Alert nie blokuje
wydatków; kontroluj też saldo kredytu. Ustaw przypomnienie przed 85. dniem.

W Compute Engine → VM instances → Create instance wybierz:

- nazwę `chronomap`, region `us-central1`, dostępną strefę;
- serię E2, **e2-small (2 GB RAM)**, standardowe udostępnianie, bez Spot;
- Ubuntu 24.04 LTS, x86/64, dysk **Standard persistent disk**, 30 GB;
- zezwól na HTTP i HTTPS (porty 80 i 443); nie otwieraj 3000 ani 5432;
- zewnętrzny IPv4; zachowaj stały adres, aby DNS nie zmienił się po zatrzymaniu VM.

Przed utworzeniem przeczytaj estymację kosztu w panelu. e2-small jest płatna,
ale kwalifikujące się koszty pokrywa aktywny kredyt. Nie dotyczy jej wcześniejszy
szacunek taniego wariantu e2-micro. Ma zapas pamięci na Node, PostgreSQL i haszowanie
haseł. e2-micro z 1 GB to ewentualna późniejsza optymalizacja po pomiarach.
Nie twórz Cloud SQL, load balancera ani Kubernetes — baza będzie na tej samej VM.

## 2. Docker i kod

Otwórz SSH przy maszynie w panelu. Zainstaluj Docker Engine i Compose plugin według
https://docs.docker.com/engine/install/ubuntu/ (oficjalne repozytorium apt).
W dalszych poleceniach używamy `sudo docker`, więc nie trzeba zmieniać grup konta.

Skopiuj bieżący projekt na VM (np. przez prywatne repozytorium Git z przygotowanymi
zmianami). Nie przesyłaj lokalnego `.env`, `node_modules` ani katalogu danych bazy.
Nie publikuj haseł ani eksportu kont w repozytorium. Wszystkie poniższe polecenia
wykonuj w katalogu projektu **na VM w terminalu Bash**.

```bash
cp deploy/.env.example .env.deploy
chmod 600 .env.deploy
openssl rand -hex 32
nano .env.deploy
```

Wstaw wygenerowany ciąg jako `DB_PASSWORD`. Ustaw `APP_DOMAIN` na swoją nazwę DNS
bez `https://`. Może to być bezpłatna subdomena dostawcy dynamicznego DNS albo własna
domena. Jej rekord A musi wskazywać publiczny IPv4 VM. Nie dodawaj rekordu AAAA bez
skonfigurowanego IPv6. HTTPS wymaga działającego DNS i portów 80/443.
Konfiguracja Caddy automatycznie uzyskuje i odnawia certyfikat.

```bash
sudo docker compose --env-file .env.deploy build
sudo docker compose --env-file .env.deploy up -d db
```

## 3. Dane — wybierz jedną ścieżkę

### A. Przeniesienie pełnej obecnej bazy (zalecane)

Z lokalnej bazy zrób eksport w formacie **Custom** za pomocą pgAdmin (Backup) lub
`pg_dump -Fc`. Eksport obejmuje też dane kont, więc trzymaj go prywatnie.
Sprawdź wersję źródłowego PostgreSQL: docelowy obraz w Compose to PostgreSQL 17.
Jeśli źródło jest nowsze lub zawiera dodatkowe rozszerzenia, dopasuj docelowy obraz
przed pierwszym uruchomieniem bazy; nie zmieniaj głównej wersji obrazu nad istniejącym
wolumenem. Bieżący schemat repozytorium nie wymaga PostGIS; starsza lokalna baza może
je zawierać. W takim przypadku potrzebny jest zgodny obraz z tym rozszerzeniem.

Prześlij eksport jako `chronomap.dump` do katalogu projektu na VM, a następnie:

```bash
sudo docker compose --env-file .env.deploy cp chronomap.dump db:/tmp/chronomap.dump
sudo docker compose --env-file .env.deploy exec -T db pg_restore \
  -U chronomap -d chronomap --no-owner --no-privileges \
  --exit-on-error --single-transaction /tmp/chronomap.dump
```

Odtwarzaj wyłącznie do pustej bazy. Jeśli wystąpi błąd, zatrzymaj się i sprawdź go;
nie dodawaj `--clean` i nie mieszaj tej ścieżki z inicjalizacją B.

### B. Nowa baza z wydarzeniami z repozytorium

Ta opcja nie przenosi istniejących kont, sesji ani postępów. Uruchom tylko dla pustej
bazy. Nie importuj dodatkowo `seed.sql` ani `coverage-events.sql`: stały zestaw
wydarzeń odtwarzamy z pliku snapshot.

```bash
sudo docker compose --env-file .env.deploy exec -T db psql -U chronomap -d chronomap -v ON_ERROR_STOP=1 < database/schema.sql
sudo docker compose --env-file .env.deploy exec -T db psql -U chronomap -d chronomap -v ON_ERROR_STOP=1 < database/countries.sql
sudo docker compose --env-file .env.deploy exec -T db psql -U chronomap -d chronomap -v ON_ERROR_STOP=1 < database/war-alignments.sql
sudo docker compose --env-file .env.deploy run --rm app npm run db:auth
sudo docker compose --env-file .env.deploy run --rm app npm run db:quizzes
sudo docker compose --env-file .env.deploy run --rm app npm run db:progress
sudo docker compose --env-file .env.deploy run --rm app npm run restore:events
```

## 4. Uruchomienie i odbiór

```bash
sudo docker compose --env-file .env.deploy up -d
sudo docker compose --env-file .env.deploy ps
sudo docker compose --env-file .env.deploy logs --tail=80 app proxy
```

Otwórz `https://TWOJA_DOMENA/api/health`: oczekiwane `{"status":"ok"}`.
Następnie sprawdź stronę, wydarzenia, wybór kraju, warstwy wojenne, rejestrację,
logowanie, quiz i zapis wyniku po ponownym zalogowaniu. Sprawdź też dostęp z telefonu
poza domowym Wi-Fi. Kontenery uruchamiają się ponownie po restarcie VM.

API i baza nie mają portów udostępnionych poza sieć kontenerów. Caddy jako jedyny
publiczny serwer przekazuje do Express adres klienta i informację o HTTPS.
`TRUST_PROXY=1` wolno używać przy takim układzie z jednym zaufanym proxy.

## 5. Kopie i aktualizacje

Wolumen PostgreSQL zachowuje dane przy wymianie kontenera, ale nie zastępuje kopii.
Przed aktualizacją i regularnie podczas użytkowania wykonuj:

```bash
mkdir -p backups
chmod 700 backups
sudo docker compose --env-file .env.deploy exec -T db pg_dump -U chronomap -d chronomap -Fc > "backups/chronomap-$(date +%Y%m%d-%H%M%S).dump"
```

Sprawdź powodzenie polecenia i pobierz kopię na swój komputer. Aby sprawdzić jej
odtwarzalność, użyj oddzielnej pustej bazy, nigdy działającej bazy użytkowników.
Kopie na tym samym dysku nie chronią przed usunięciem VM.

Po pobraniu nowej wersji kodu przebuduj aplikację:

```bash
sudo docker compose --env-file .env.deploy up -d --build
```

Nie używaj `docker compose down -v`: usuwa wolumen z danymi. Po zakończeniu projektu
najpierw pobierz i sprawdź kopię, potem usuń zbędne zasoby w Google Cloud, w tym
dysk oraz zarezerwowany IP. Samo zatrzymanie VM nie usuwa wszystkich opłat.

Źródła:
- https://cloud.google.com/signup-faqs
- https://docs.cloud.google.com/compute/docs/instances/create-start-instance
- https://docs.docker.com/engine/install/ubuntu/
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
