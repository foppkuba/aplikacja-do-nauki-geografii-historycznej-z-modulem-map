BEGIN;

CREATE TABLE IF NOT EXISTS quiz_categories (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug varchar(60) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    name varchar(120) NOT NULL UNIQUE,
    description text NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id smallint NOT NULL REFERENCES quiz_categories(id) ON DELETE CASCADE,
    prompt text NOT NULL,
    explanation text NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0,
    UNIQUE (category_id, prompt)
);

CREATE TABLE IF NOT EXISTS quiz_answers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id bigint NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text text NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    sort_order smallint NOT NULL DEFAULT 0,
    UNIQUE (question_id, answer_text)
);

CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_one_correct_idx
    ON quiz_answers (question_id) WHERE is_correct;
CREATE INDEX IF NOT EXISTS quiz_questions_category_idx
    ON quiz_questions (category_id, sort_order);

INSERT INTO quiz_categories (slug, name, description, sort_order) VALUES
    ('epoka-napoleonska', 'Epoka napoleońska', 'Kampanie i bitwy widoczne na mapie Europy z lat 1803–1815.', 1),
    ('i-wojna-swiatowa', 'I wojna światowa', 'Strony konfliktu, fronty i wydarzenia z lat 1914–1918.', 3),
    ('ii-wojna-swiatowa', 'II wojna światowa', 'Najważniejsze operacje i kierunki działań wojennych w Europie.', 5),
    ('xix-wiek', 'XIX wiek', 'Rewolucje, zjednoczenia państw i przemiany Europy w XIX wieku.', 2),
    ('dwudziestolecie', 'Dwudziestolecie międzywojenne', 'Europa pomiędzy zakończeniem I wojny a wybuchem II wojny światowej.', 4),
    ('zimna-wojna', 'Zimna wojna', 'Podział Europy i najważniejsze wydarzenia rywalizacji Wschodu z Zachodem.', 6)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

WITH question_data(category_slug, prompt, explanation, sort_order, answers, correct_index) AS (VALUES
  ('epoka-napoleonska', 'Która bitwa zakończyła kampanię 1805 roku zwycięstwem Napoleona nad armią rosyjsko-austriacką?', 'Była to bitwa pod Austerlitz, nazywana bitwą trzech cesarzy.', 1, ARRAY['Trafalgar','Austerlitz','Waterloo','Lipsk'], 2),
  ('epoka-napoleonska', 'Dokąd dotarła Wielka Armia podczas inwazji na Rosję w 1812 roku?', 'Trasa kampanii na mapie prowadzi przez Wilno i Smoleńsk do Moskwy.', 2, ARRAY['Do Moskwy','Do Petersburga','Do Kijowa','Do Rygi'], 1),
  ('epoka-napoleonska', 'Na którym półwyspie toczyła się długotrwała wojna wiążąca znaczne siły francuskie?', 'Wojna półwyspowa toczyła się w Hiszpanii i Portugalii na Półwyspie Iberyjskim.', 3, ARRAY['Bałkańskim','Apenińskim','Iberyjskim','Skandynawskim'], 3),
  ('epoka-napoleonska', 'Która bitwa w 1815 roku zakończyła okres Stu dni?', 'Klęska Napoleona pod Waterloo zakończyła jego powrót do władzy.', 4, ARRAY['Borodino','Wagram','Jena','Waterloo'], 4),
  ('i-wojna-swiatowa', 'Które wydarzenie stało się bezpośrednim impulsem do wybuchu I wojny światowej?', 'Zamach na arcyksięcia Franciszka Ferdynanda w Sarajewie uruchomił kryzys lipcowy.', 1, ARRAY['Rewolucja lutowa','Zamach w Sarajewie','Bitwa nad Marną','Traktat brzeski'], 2),
  ('i-wojna-swiatowa', 'Do którego sojuszu należały Niemcy i Austro-Węgry?', 'Niemcy i Austro-Węgry stanowiły rdzeń państw centralnych.', 2, ARRAY['Ententy','Państw centralnych','Ligi Narodów','Aliantów zachodnich'], 2),
  ('i-wojna-swiatowa', 'W którym roku rozpoczęła się I wojna światowa?', 'Wojna rozpoczęła się latem 1914 roku.', 3, ARRAY['1912','1914','1916','1918'], 2),
  ('i-wojna-swiatowa', 'W którym roku zakończyły się działania I wojny światowej?', 'Rozejm w Compiègne wszedł w życie 11 listopada 1918 roku.', 4, ARRAY['1917','1918','1919','1920'], 2),
  ('ii-wojna-swiatowa', 'Która operacja oznaczała niemiecki atak na ZSRR w czerwcu 1941 roku?', 'Operacja Barbarossa rozpoczęła ofensywę trzech grup armii na wschodzie.', 1, ARRAY['Overlord','Barbarossa','Bagration','Husky'], 2),
  ('ii-wojna-swiatowa', 'Gdzie alianci wylądowali w ramach operacji Overlord?', 'Operacja Overlord rozpoczęła się lądowaniem w Normandii w czerwcu 1944 roku.', 2, ARRAY['Na Sycylii','W Normandii','W Norwegii','W Grecji'], 2),
  ('ii-wojna-swiatowa', 'Która operacja doprowadziła do rozbicia niemieckiej Grupy Armii Środek w 1944 roku?', 'Operacja Bagration była wielką ofensywą Armii Czerwonej na Białorusi.', 3, ARRAY['Market Garden','Cytadela','Bagration','Fall Gelb'], 3),
  ('ii-wojna-swiatowa', 'Którego państwa dotyczyła wojna zimowa z lat 1939–1940?', 'ZSRR zaatakował Finlandię, nacierając między innymi na linię Mannerheima.', 4, ARRAY['Finlandii','Danii','Polski','Jugosławii'], 1),
  ('ii-wojna-swiatowa', 'Która operacja była alianckim lądowaniem na Sycylii?', 'Operacja Husky rozpoczęła kampanię aliantów na Sycylii w lipcu 1943 roku.', 5, ARRAY['Cobra','Husky','Uran','Weserübung'], 2)
), inserted_questions AS (
  INSERT INTO quiz_questions (category_id, prompt, explanation, sort_order)
  SELECT category.id, data.prompt, data.explanation, data.sort_order
  FROM question_data data JOIN quiz_categories category ON category.slug = data.category_slug
  ON CONFLICT (category_id, prompt) DO UPDATE SET
    explanation = EXCLUDED.explanation, sort_order = EXCLUDED.sort_order
  RETURNING id, category_id, prompt
)
INSERT INTO quiz_answers (question_id, answer_text, is_correct, sort_order)
SELECT question.id, answer.answer_text, answer.ordinality = data.correct_index, answer.ordinality
FROM question_data data
JOIN quiz_categories category ON category.slug = data.category_slug
JOIN inserted_questions question ON question.category_id = category.id AND question.prompt = data.prompt
CROSS JOIN LATERAL unnest(data.answers) WITH ORDINALITY AS answer(answer_text, ordinality)
ON CONFLICT (question_id, answer_text) DO UPDATE SET
  is_correct = EXCLUDED.is_correct, sort_order = EXCLUDED.sort_order;

CREATE TEMP TABLE additional_quiz_data (
  category_slug text, prompt text, explanation text, sort_order smallint,
  answers text[], correct_index smallint
) ON COMMIT DROP;

INSERT INTO additional_quiz_data VALUES
('epoka-napoleonska','Która bitwa morska w 1805 roku zakończyła francuskie plany inwazji na Wielką Brytanię?','Flota Nelsona pokonała połączone floty Francji i Hiszpanii pod Trafalgarem.',5,ARRAY['Trafalgar','Austerlitz','Frydland','Wagram'],1),
('epoka-napoleonska','Pod jakim miastem Napoleon pokonał Prusaków w kampanii 1806 roku?','Zwycięstwa pod Jeną i Auerstedt rozbiły główne siły pruskie.',6,ARRAY['Jeną','Waterloo','Moskwą','Vitorią'],1),
('epoka-napoleonska','Która rzeka była miejscem dramatycznej przeprawy podczas odwrotu z Rosji?','Wielka Armia przeprawiała się przez Berezynę w listopadzie 1812 roku.',7,ARRAY['Ren','Dunaj','Berezyna','Łaba'],3),
('epoka-napoleonska','W którym mieście rozegrała się Bitwa Narodów w 1813 roku?','Bitwa Narodów odbyła się pod Lipskiem.',8,ARRAY['Lipsku','Wiedniu','Berlinie','Paryżu'],1),
('epoka-napoleonska','Skąd Napoleon powrócił do Francji przed rozpoczęciem Stu dni?','Napoleon uciekł z wyspy Elba i wylądował na południu Francji.',9,ARRAY['Z Korsyki','Z Elby','Z Malty','Z Sycylii'],2),
('epoka-napoleonska','Która stolica została zajęta przez koalicję w 1814 roku?','Wkroczenie wojsk koalicji do Paryża doprowadziło do abdykacji Napoleona.',10,ARRAY['Madryt','Warszawa','Paryż','Rzym'],3),
('i-wojna-swiatowa','W jakim mieście dokonano zamachu na Franciszka Ferdynanda?','Zamach miał miejsce 28 czerwca 1914 roku w Sarajewie.',5,ARRAY['Belgradzie','Sarajewie','Wiedniu','Pradze'],2),
('i-wojna-swiatowa','Które państwo należało do Ententy?','Francja wraz z Wielką Brytanią i Rosją tworzyła rdzeń Ententy.',6,ARRAY['Francja','Bułgaria','Austro-Węgry','Imperium Osmańskie'],1),
('i-wojna-swiatowa','Które państwo przystąpiło do wojny po stronie Ententy w 1917 roku?','Stany Zjednoczone wypowiedziały wojnę Niemcom w kwietniu 1917 roku.',7,ARRAY['Hiszpania','Szwecja','Stany Zjednoczone','Szwajcaria'],3),
('i-wojna-swiatowa','Jak nazywano rozbudowany system umocnień na froncie zachodnim?','Front zachodni kojarzy się przede wszystkim z wojną okopową.',8,ARRAY['Okopy','Linia Maginota','Wał Atlantycki','Linia Mannerheima'],1),
('i-wojna-swiatowa','Które imperium wystąpiło z wojny po rewolucji 1917 roku?','Rosja bolszewicka zawarła pokój brzeski z państwami centralnymi.',9,ARRAY['Brytyjskie','Rosyjskie','Francuskie','Japońskie'],2),
('i-wojna-swiatowa','Gdzie podpisano rozejm kończący walki 11 listopada 1918 roku?','Rozejm podpisano w wagonie kolejowym w lesie Compiègne.',10,ARRAY['Wersal','Brześć','Compiègne','Lozanna'],3),
('ii-wojna-swiatowa','Która operacja była niemieckim atakiem na Polskę w 1939 roku?','Plan Fall Weiss określał niemiecką inwazję na Polskę.',6,ARRAY['Fall Weiss','Fall Rot','Cytadela','Uran'],1),
('ii-wojna-swiatowa','Które państwo zaatakowało Polskę 17 września 1939 roku?','Armia Czerwona wkroczyła do Polski od wschodu.',7,ARRAY['Włochy','ZSRR','Rumunia','Węgry'],2),
('ii-wojna-swiatowa','Która bitwa powietrzna toczyła się latem i jesienią 1940 roku?','Bitwa o Anglię była niemiecką kampanią lotniczą przeciw Wielkiej Brytanii.',8,ARRAY['Bitwa o Anglię','Bitwa o Berlin','Bitwa pod Kurskiem','Bitwa o Atlantyk'],1),
('ii-wojna-swiatowa','Jaka operacja była ostatnią wielką niemiecką ofensywą na Zachodzie?','Ofensywa w Ardenach rozpoczęła się w grudniu 1944 roku.',9,ARRAY['Market Garden','Ofensywa w Ardenach','Bagration','Overlord'],2),
('ii-wojna-swiatowa','Jakie miasto było celem radzieckiej ofensywy znad Odry w 1945 roku?','Operacja berlińska doprowadziła Armię Czerwoną do stolicy III Rzeszy.',10,ARRAY['Praga','Wiedeń','Berlin','Monachium'],3),
('xix-wiek','W którym roku rozpoczęło się powstanie listopadowe?','Powstanie listopadowe wybuchło w Warszawie 29 listopada 1830 roku.',1,ARRAY['1815','1830','1848','1863'],2),
('xix-wiek','Przeciwko któremu państwu wybuchło powstanie listopadowe?','Powstanie było skierowane przeciwko Imperium Rosyjskiemu.',2,ARRAY['Prusom','Austrii','Imperium Rosyjskiemu','Francji'],3),
('xix-wiek','Jak nazywa się fala europejskich rewolucji z 1848 roku?','Rewolucje 1848–1849 są określane mianem Wiosny Ludów.',3,ARRAY['Wiosna Ludów','Wielka Emigracja','Belle Époque','Restauracja'],1),
('xix-wiek','W którym roku rozpoczęło się powstanie styczniowe?','Powstanie styczniowe rozpoczęło się 22 stycznia 1863 roku.',4,ARRAY['1830','1846','1863','1871'],3),
('xix-wiek','Które państwo odegrało główną rolę w zjednoczeniu Niemiec?','Prusy pod przywództwem Ottona von Bismarcka doprowadziły do zjednoczenia.',5,ARRAY['Bawaria','Austria','Saksonia','Prusy'],4),
('xix-wiek','W którym roku proklamowano Cesarstwo Niemieckie?','Cesarstwo Niemieckie ogłoszono w Wersalu w 1871 roku.',6,ARRAY['1848','1866','1871','1889'],3),
('xix-wiek','Które państwo stanowiło centrum procesu zjednoczenia Włoch?','Królestwo Sardynii, nazywane też Piemontem, przewodziło zjednoczeniu.',7,ARRAY['Państwo Kościelne','Królestwo Sardynii','Królestwo Obojga Sycylii','Austria'],2),
('xix-wiek','Jak nazywano proces gwałtownego rozwoju przemysłu i miast?','Rewolucja przemysłowa zmieniła gospodarkę i społeczeństwo XIX wieku.',8,ARRAY['Restauracja','Industrializacja','Sekularyzacja','Federalizacja'],2),
('xix-wiek','Która wojna z lat 1870–1871 poprzedziła zjednoczenie Niemiec?','Zwycięstwo Prus i ich sojuszników nad Francją umożliwiło utworzenie cesarstwa.',9,ARRAY['Krymska','Prusko-francuska','Siedmioletnia','Bałkańska'],2),
('xix-wiek','Które miasto było stolicą Cesarstwa Austriackiego?','Wiedeń był centrum monarchii Habsburgów.',10,ARRAY['Praga','Budapeszt','Wiedeń','Zagrzeb'],3),
('dwudziestolecie','Jaki traktat pokojowy podpisano z Niemcami po I wojnie światowej?','Traktat wersalski z 1919 roku określił powojenny ład w Europie.',1,ARRAY['Wersalski','Ryski','Brzeski','Locarneński'],1),
('dwudziestolecie','W którym roku Polska odzyskała niepodległość?','Niepodległość Polski została odtworzona w listopadzie 1918 roku.',2,ARRAY['1914','1918','1920','1923'],2),
('dwudziestolecie','Jak nazywała się organizacja powołana dla utrzymania pokoju po I wojnie?','Liga Narodów miała wspierać bezpieczeństwo zbiorowe.',3,ARRAY['ONZ','NATO','Liga Narodów','Układ Warszawski'],3),
('dwudziestolecie','W którym roku rozpoczął się wielki kryzys gospodarczy?','Za symboliczny początek kryzysu uznaje się krach giełdowy w 1929 roku.',4,ARRAY['1923','1929','1933','1938'],2),
('dwudziestolecie','Kto objął urząd kanclerza Niemiec w 1933 roku?','Adolf Hitler został kanclerzem Niemiec 30 stycznia 1933 roku.',5,ARRAY['Paul von Hindenburg','Adolf Hitler','Benito Mussolini','Gustav Stresemann'],2),
('dwudziestolecie','Jak nazywało się państwo utworzone po połączeniu Czech i Słowacji?','Czechosłowacja powstała w 1918 roku po rozpadzie Austro-Węgier.',6,ARRAY['Jugosławia','Czechosłowacja','Austria','Węgry'],2),
('dwudziestolecie','Który traktat zakończył wojnę polsko-bolszewicką?','Pokój ryski podpisano w 1921 roku.',7,ARRAY['Traktat ryski','Traktat wersalski','Pakt Brianda-Kellogga','Układ monachijski'],1),
('dwudziestolecie','Jak nazywało się przyłączenie Austrii do III Rzeszy w 1938 roku?','Anschluss oznaczał włączenie Austrii do Niemiec.',8,ARRAY['Anschluss','Appeasement','Blitzkrieg','Lebensraum'],1),
('dwudziestolecie','Który układ z 1938 roku pozwolił Niemcom zająć Sudety?','Układ monachijski zaakceptował przekazanie Niemcom terenów Czechosłowacji.',9,ARRAY['Układ w Rapallo','Układ monachijski','Pakt stalowy','Pakt reński'],2),
('dwudziestolecie','Kiedy Niemcy zaatakowały Polskę, kończąc okres międzywojenny?','Atak rozpoczął się 1 września 1939 roku.',10,ARRAY['1 września 1939','17 września 1939','3 września 1939','1 sierpnia 1944'],1),
('zimna-wojna','Jak nazywał się polityczno-wojskowy sojusz państw zachodnich utworzony w 1949 roku?','Organizacja Traktatu Północnoatlantyckiego, czyli NATO, powstała w 1949 roku.',1,ARRAY['NATO','RWPG','Układ Warszawski','Liga Narodów'],1),
('zimna-wojna','Jaki sojusz wojskowy utworzyły państwa bloku wschodniego w 1955 roku?','Układ Warszawski był odpowiedzią bloku wschodniego na NATO.',2,ARRAY['Ententa','Układ Warszawski','EWWiS','SEATO'],2),
('zimna-wojna','Które miasto zostało podzielone murem w 1961 roku?','Mur berliński oddzielił Berlin Zachodni od Berlina Wschodniego.',3,ARRAY['Praga','Warszawa','Berlin','Wiedeń'],3),
('zimna-wojna','W którym roku upadł mur berliński?','Przejścia graniczne w Berlinie otwarto 9 listopada 1989 roku.',4,ARRAY['1968','1981','1989','1991'],3),
('zimna-wojna','Jak nazywał się amerykański program odbudowy Europy po II wojnie?','Plan Marshalla wspierał gospodarczą odbudowę państw Europy Zachodniej.',5,ARRAY['Plan Dawesa','Plan Marshalla','Doktryna Breżniewa','Nowy Ład'],2),
('zimna-wojna','Które wydarzenie w 1962 roku postawiło świat na krawędzi wojny nuklearnej?','Kryzys kubański był konfrontacją USA i ZSRR dotyczącą rakiet na Kubie.',6,ARRAY['Kryzys sueski','Kryzys kubański','Blokada Berlina','Wojna koreańska'],2),
('zimna-wojna','W którym kraju rozpoczęła się Praska Wiosna w 1968 roku?','Praska Wiosna była próbą reform systemu komunistycznego w Czechosłowacji.',7,ARRAY['W Polsce','Na Węgrzech','W Czechosłowacji','W Rumunii'],3),
('zimna-wojna','Jak nazywał się polski związek zawodowy powstały w 1980 roku?','Niezależny Samorządny Związek Zawodowy Solidarność powstał podczas strajków sierpniowych.',8,ARRAY['Solidarność','KOR','PZPR','Comecon'],1),
('zimna-wojna','Które państwo było głównym liderem bloku wschodniego?','Związek Socjalistycznych Republik Radzieckich dominował w bloku wschodnim.',9,ARRAY['Chiny','Jugosławia','ZSRR','NRD'],3),
('zimna-wojna','W którym roku rozpadł się ZSRR?','Związek Radziecki przestał istnieć w grudniu 1991 roku.',10,ARRAY['1989','1990','1991','1993'],3);

INSERT INTO quiz_questions (category_id, prompt, explanation, sort_order)
SELECT category.id, data.prompt, data.explanation, data.sort_order
FROM additional_quiz_data data JOIN quiz_categories category ON category.slug = data.category_slug
ON CONFLICT (category_id, prompt) DO UPDATE SET
  explanation = EXCLUDED.explanation, sort_order = EXCLUDED.sort_order;

INSERT INTO quiz_answers (question_id, answer_text, is_correct, sort_order)
SELECT question.id, answer.answer_text, answer.ordinality = data.correct_index, answer.ordinality
FROM additional_quiz_data data
JOIN quiz_categories category ON category.slug = data.category_slug
JOIN quiz_questions question ON question.category_id = category.id AND question.prompt = data.prompt
CROSS JOIN LATERAL unnest(data.answers) WITH ORDINALITY AS answer(answer_text, ordinality)
ON CONFLICT (question_id, answer_text) DO UPDATE SET
  is_correct = EXCLUDED.is_correct, sort_order = EXCLUDED.sort_order;

COMMIT;
