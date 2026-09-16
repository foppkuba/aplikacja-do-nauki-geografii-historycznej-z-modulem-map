// Pytania sprawdzają wyłącznie informacje zawarte w przypisanej lekcji.
const question = (prompt, options, correctIndex, explanation) => ({
  prompt, answers: options.map((text, id) => ({ id, text })), correctAnswerId: correctIndex, explanation,
});

export const historyLessons = [
  {
    slug: "napoleon", century: "XIX", period: "1804–1815", title: "Napoleon i nowy porządek Europy",
    summary: "Reformy, wojny i kongres wiedeński — jak zmieniły Europę?",
    sections: [
      ["Reformy i cesarstwo", "W 1804 roku Napoleon Bonaparte został cesarzem Francuzów. W tym samym roku wprowadzono Kodeks Napoleona, który porządkował prawo cywilne, chronił własność prywatną i utrwalał równość mężczyzn wobec prawa. Nie oznaczało to jednak równości wszystkich mieszkańców: pozycja prawna kobiet pozostawała ograniczona. Reformom administracji towarzyszyły autorytarne rządy i cenzura."],
      ["Podboje i sprawa polska", "Napoleon prowadził wojny z kolejnymi koalicjami europejskimi. W 1805 roku zwyciężył pod Austerlitz, ale francusko-hiszpańska flota poniosła klęskę pod Trafalgarem. W 1807 roku powstało Księstwo Warszawskie, zależne od Francji, które dla Polaków stało się nadzieją na odbudowę państwa. Wyprawa na Rosję w 1812 roku zakończyła się katastrofą Wielkiej Armii."],
      ["Upadek i kongres wiedeński", "Po klęskach militarnych Napoleon abdykował w 1814 roku. Powrócił na krótko do władzy, lecz przegrał pod Waterloo w 1815 roku. Kongres wiedeński z lat 1814–1815 ustalił nowy układ terytorialny i dążył do równowagi sił oraz przywracania dawnych dynastii. Z większości ziem Księstwa Warszawskiego utworzono Królestwo Polskie połączone z Rosją osobą monarchy."],
    ],
    dates: [["1804", "Kodeks Napoleona i koronacja cesarska"], ["1807", "Utworzenie Księstwa Warszawskiego"], ["1815", "Waterloo i zakończenie kongresu wiedeńskiego"]],
    takeaway: "Epoka napoleońska połączyła reformy prawa z ekspansją militarną. Po jej zakończeniu mocarstwa próbowały przywrócić stabilność opartą na równowadze sił.",
    questions: [
      question("Co regulował Kodeks Napoleona?", ["Wyłącznie sprawy wojskowe", "Prawo cywilne", "Granice Europy", "Zasady działania kolei"], 1, "Kodeks z 1804 roku porządkował prawo cywilne, między innymi ochronę własności."),
      question("W którym roku powstało Księstwo Warszawskie?", ["1804", "1812", "1815", "1807"], 3, "Księstwo Warszawskie powstało w 1807 roku i było zależne od Francji."),
      question("Jaki był jeden z głównych celów kongresu wiedeńskiego?", ["Przywrócenie równowagi sił", "Utworzenie Unii Europejskiej", "Likwidacja wszystkich monarchii", "Ponowna koronacja Napoleona"], 0, "Kongres dążył do równowagi mocarstw i przywracania dawnych dynastii."),
    ],
  },
  {
    slug: "przemiany-xix-wieku", century: "XIX", period: "1815–1900", title: "Przemysł, narody i walka o wolność",
    summary: "Industrializacja, polskie powstania i narodziny nowych państw.",
    sections: [
      ["Społeczeństwo przemysłowe", "Rewolucja przemysłowa rozpoczęła się w Wielkiej Brytanii w XVIII wieku, a w XIX wieku objęła kolejne obszary Europy. Maszyny parowe, fabryki i kolej zwiększały produkcję oraz ułatwiały transport. Ludność przenosiła się ze wsi do miast — ten proces nazywamy urbanizacją. Trudne warunki pracy sprzyjały rozwojowi ruchu robotniczego i żądaniom reform społecznych."],
      ["Wolność i niepodległość", "Liberalizm podkreślał prawa jednostki i ograniczenie władzy monarchy, a ruchy narodowe dążyły do samostanowienia narodów. Wiosna Ludów w latach 1848–1849 była falą rewolucji o celach politycznych, społecznych i narodowych. Na ziemiach polskich powstanie listopadowe z 1830 roku i styczniowe z 1863 roku skierowano przeciwko władzy rosyjskiej. Oba zakończyły się klęską i represjami."],
      ["Nowa mapa i imperializm", "W 1861 roku ogłoszono powstanie Królestwa Włoch, choć jednoczenie ziem włoskich trwało dalej. W 1871 roku powstało Cesarstwo Niemieckie pod przewodnictwem Prus. Mocarstwa europejskie rozszerzały również imperia kolonialne w Afryce i Azji. Ekspansja przynosiła kolonizowanym społeczeństwom utratę niezależności, przemoc i eksploatację gospodarczą."],
    ],
    dates: [["1830", "Wybuch powstania listopadowego"], ["1848–1849", "Wiosna Ludów"], ["1863", "Wybuch powstania styczniowego"], ["1871", "Powstanie Cesarstwa Niemieckiego"]],
    takeaway: "Industrializacja zmieniła pracę i życie codzienne, a ruchy narodowe i społeczne podważały porządek ustalony w Wiedniu.",
    questions: [
      question("Czym jest urbanizacja?", ["Rozwojem kolonii", "Przywracaniem monarchii", "Rozwojem miast i wzrostem ludności miejskiej", "Zjednoczeniem państw"], 2, "Industrializacja przyciągała mieszkańców wsi do miast, przyspieszając urbanizację."),
      question("Jak nazywamy falę rewolucji z lat 1848–1849?", ["Wiosną Ludów", "Zimną wojną", "Kongresem wiedeńskim", "Rewolucją cyfrową"], 0, "Wiosna Ludów obejmowała wystąpienia polityczne, społeczne i narodowe."),
      question("Które państwo przewodziło zjednoczeniu Niemiec?", ["Francja", "Rosja", "Wielka Brytania", "Prusy"], 3, "Cesarstwo Niemieckie powstało w 1871 roku pod przewodnictwem Prus."),
    ],
  },
  {
    slug: "pierwsza-wojna", century: "XX", period: "1914–1918", title: "I wojna światowa",
    summary: "Od kryzysu w Sarajewie do upadku imperiów i niepodległości Polski.",
    sections: [
      ["Przyczyny i wybuch", "Rywalizacja mocarstw, wyścig zbrojeń, nacjonalizmy i napięcia na Bałkanach tworzyły warunki do konfliktu. Zamach na arcyksięcia Franciszka Ferdynanda w Sarajewie 28 czerwca 1914 roku stał się bezpośrednim impulsem kryzysu. Austro-Węgry wypowiedziały wojnę Serbii, a kolejne decyzje państw i system sojuszy rozszerzyły konflikt. Niemcy i Austro-Węgry tworzyły rdzeń państw centralnych; Francja, Rosja i Wielka Brytania należały do Ententy."],
      ["Wojna masowa", "Na froncie zachodnim dominowała wojna okopowa. Artyleria, karabiny maszynowe i nowe rodzaje broni powodowały ogromne straty, a przełamanie frontu było trudne. Państwa podporządkowywały gospodarkę potrzebom wojny, mobilizując miliony ludzi. W 1917 roku do konfliktu przystąpiły Stany Zjednoczone. Rewolucje w Rosji doprowadziły do przejęcia władzy przez bolszewików, którzy w 1918 roku zawarli pokój brzeski."],
      ["Skutki wojny", "Rozejm z Niemcami wszedł w życie 11 listopada 1918 roku. Wojna przyczyniła się do upadku imperiów i zmian granic. Polska odzyskała niepodległość w 1918 roku, choć kształt jej granic rozstrzygał się jeszcze w kolejnych latach. Traktat wersalski podpisany w 1919 roku ustalił warunki pokoju z Niemcami. Straty ludzkie, zniszczenia i konflikty wokół nowego porządku obciążyły następne dekady."],
    ],
    dates: [["1914", "Zamach w Sarajewie i wybuch wojny"], ["1917", "Przystąpienie USA do wojny i rewolucje w Rosji"], ["11 listopada 1918", "Rozejm z Niemcami; symboliczna data niepodległości Polski"]],
    takeaway: "Zamach był impulsem, a nie jedyną przyczyną wojny. Konflikt zmienił układ sił i doprowadził do rozpadu dawnych imperiów.",
    questions: [
      question("Co było bezpośrednim impulsem kryzysu prowadzącego do wojny?", ["Krach giełdowy", "Zamach w Sarajewie", "Upadek muru berlińskiego", "Traktat wersalski"], 1, "Zamach z 28 czerwca 1914 roku uruchomił kryzys, który przerodził się w wojnę."),
      question("Jaki rodzaj walk dominował na froncie zachodnim?", ["Wojna okopowa", "Wyłącznie walki morskie", "Wyłącznie wojna powietrzna", "Wojna cybernetyczna"], 0, "Rozbudowane okopy i siła ognia utrudniały przełamanie frontu."),
      question("Kiedy wszedł w życie rozejm z Niemcami?", ["28 czerwca 1914", "1 września 1939", "11 listopada 1918", "8 maja 1945"], 2, "Rozejm z 11 listopada 1918 roku zakończył walki z Niemcami w I wojnie światowej."),
    ],
  },
  {
    slug: "miedzywojnie", century: "XX", period: "1919–1939", title: "Między demokracją a dyktaturą",
    summary: "Ład wersalski, kryzys gospodarczy i wzrost zagrożenia wojną.",
    sections: [
      ["Kruchy pokój", "Po I wojnie światowej powstała Liga Narodów, której zadaniem było wspieranie pokoju i współpracy. Nie dysponowała jednak skutecznymi narzędziami powstrzymywania agresorów, a Stany Zjednoczone do niej nie przystąpiły. Nowe państwa mierzyły się z odbudową gospodarki oraz sporami granicznymi i narodowościowymi."],
      ["Kryzys i dyktatury", "Krach na giełdzie nowojorskiej w 1929 roku stał się symbolem początku wielkiego kryzysu gospodarczego. Bezrobocie i zubożenie osłabiały zaufanie do demokracji. We Włoszech rozwijał się faszyzm Mussoliniego, a w Niemczech Hitler objął urząd kanclerza w 1933 roku i zbudował dyktaturę nazistowską. W ZSRR Stalin umacniał system totalitarny przez terror, przymusową kolektywizację i represje."],
      ["Polska i droga do wojny", "II Rzeczpospolita scalała ziemie po trzech zaborach. Po przewrocie majowym w 1926 roku nastąpiło ograniczenie demokracji parlamentarnej i umocnienie rządów sanacji. W Europie agresywna polityka III Rzeszy podważała ład powojenny. Układ monachijski z 1938 roku pozwolił Niemcom zająć Sudety kosztem Czechosłowacji. Polityka ustępstw, nazywana appeasementem, nie powstrzymała dalszej ekspansji."],
    ],
    dates: [["1926", "Przewrót majowy w Polsce"], ["1929", "Krach giełdowy i wielki kryzys"], ["1933", "Hitler zostaje kanclerzem Niemiec"], ["1938", "Układ monachijski"]],
    takeaway: "Problemy gospodarcze, słabość współpracy międzynarodowej i ekspansja dyktatur przyczyniły się do załamania pokoju.",
    questions: [
      question("Jaki był cel Ligi Narodów?", ["Podział kolonii wyłącznie między Niemcy i Włochy", "Likwidacja wszystkich granic", "Wprowadzenie wspólnej waluty", "Wspieranie pokoju i współpracy"], 3, "Liga Narodów miała chronić pokój, lecz jej skuteczność była ograniczona."),
      question("Z którym rokiem wiąże się krach giełdowy rozpoczynający wielki kryzys?", ["1919", "1929", "1938", "1945"], 1, "Krach na giełdzie nowojorskiej nastąpił w 1929 roku."),
      question("Co oznacza appeasement w kontekście lat trzydziestych?", ["Politykę ustępstw wobec agresora", "Plan odbudowy powojennej", "Ruch oporu", "Przymusową kolektywizację"], 0, "Przykładem appeasementu był układ monachijski z 1938 roku."),
    ],
  },
  {
    slug: "druga-wojna", century: "XX", period: "1939–1945", title: "II wojna światowa",
    summary: "Wojna globalna, okupacja, Zagłada i zwycięstwo aliantów.",
    sections: [
      ["Agresja i okupacja", "Niemcy zaatakowały Polskę 1 września 1939 roku, rozpoczynając II wojnę światową w Europie. ZSRR dokonał agresji na Polskę 17 września. Wcześniejszy pakt Ribbentrop–Mołotow zawierał tajny protokół dotyczący podziału stref wpływów w Europie Wschodniej. Okupacja oznaczała terror, deportacje, pracę przymusową i niszczenie elit. Polskie Państwo Podziemne organizowało opór oraz tajne nauczanie."],
      ["Wojna światowa i Zagłada", "W czerwcu 1941 roku Niemcy zaatakowały ZSRR. Japoński atak na Pearl Harbor w grudniu 1941 roku doprowadził do przystąpienia USA do wojny. Nazistowskie Niemcy, przy udziale swoich współpracowników, dokonały Zagłady około sześciu milionów europejskich Żydów. Prześladowały i mordowały również inne grupy, między innymi Romów. Getta, masowe egzekucje i ośrodki zagłady były elementami polityki ludobójstwa."],
      ["Zwycięstwo i konsekwencje", "Zwycięstwo radzieckie pod Stalingradem w 1943 roku było jednym z punktów zwrotnych wojny. Alianci zachodni wylądowali w Normandii 6 czerwca 1944 roku. Niemcy skapitulowały w maju 1945 roku, a Japonia podpisała akt kapitulacji 2 września 1945 roku. Wojna przyniosła dziesiątki milionów ofiar, ogromne zniszczenia i przesiedlenia. Granice Polski przesunięto na zachód, a kraj znalazł się w radzieckiej strefie wpływów. W 1945 roku utworzono ONZ."],
    ],
    dates: [["1 i 17 września 1939", "Agresje Niemiec i ZSRR na Polskę"], ["6 czerwca 1944", "Lądowanie aliantów w Normandii"], ["1945", "Kapitulacje Niemiec i Japonii; powstanie ONZ"]],
    takeaway: "II wojna światowa była konfliktem globalnym i katastrofą ludności cywilnej. Jej skutki ukształtowały powojenny podział świata.",
    questions: [
      question("Które państwo zaatakowało Polskę 17 września 1939 roku?", ["Włochy", "Japonia", "ZSRR", "Francja"], 2, "ZSRR wkroczył do Polski od wschodu 17 września, po niemieckiej agresji z 1 września."),
      question("Gdzie alianci zachodni wylądowali 6 czerwca 1944 roku?", ["W Normandii", "Na Krymie", "W Norwegii", "W Japonii"], 0, "Lądowanie w Normandii otworzyło drogę do wyzwalania zachodniej Europy."),
      question("Którą organizację utworzono w 1945 roku?", ["Ligę Narodów", "Unię Europejską", "Układ Warszawski", "Organizację Narodów Zjednoczonych"], 3, "ONZ powstała w 1945 roku, by wspierać pokój i współpracę międzynarodową."),
    ],
  },
  {
    slug: "zimna-wojna", century: "XX", period: "1947–1991", title: "Zimna wojna i koniec podziału Europy",
    summary: "Dwa bloki, dekolonizacja, Solidarność i przemiany 1989 roku.",
    sections: [
      ["Dwa bloki", "Po wojnie narastała rywalizacja USA i ZSRR. Zimna wojna obejmowała wyścig zbrojeń, propagandę, konkurencję gospodarczą i konflikty zastępcze. Nie doszło do bezpośredniej wojny na pełną skalę między supermocarstwami. NATO powstało w 1949 roku, a Układ Warszawski w 1955 roku. Mur berliński, wzniesiony w 1961 roku, stał się symbolem podziału Europy."],
      ["Świat poza Europą", "Po 1945 roku przyspieszyła dekolonizacja: kolejne społeczeństwa Azji i Afryki uzyskiwały niepodległość. Indie stały się niepodległe w 1947 roku, a wiele państw afrykańskich w 1960 roku. Nowe państwa mierzyły się ze skutkami kolonializmu i presją supermocarstw. Kryzys kubański w 1962 roku pokazał, jak blisko rywalizacja mogła doprowadzić świat do wojny nuklearnej."],
      ["Droga do przemian", "W Polsce w 1980 roku powstała Solidarność, masowy niezależny związek zawodowy. Wprowadzenie stanu wojennego w 1981 roku ograniczyło jej działalność, lecz nie zlikwidowało opozycji. Rozmowy Okrągłego Stołu i częściowo wolne wybory z 4 czerwca 1989 roku otworzyły drogę do przemian ustrojowych. W listopadzie 1989 roku upadł mur berliński, Niemcy zjednoczyły się w 1990 roku, a ZSRR rozpadł się w 1991 roku."],
    ],
    dates: [["1949", "Powstanie NATO"], ["1962", "Kryzys kubański"], ["1980", "Powstanie Solidarności"], ["1989–1991", "Przemiany w Europie i rozpad ZSRR"]],
    takeaway: "Zimna wojna kształtowała politykę światową, ale społeczeństwa i ruchy niepodległościowe także wpływały na bieg wydarzeń.",
    questions: [
      question("Które mocarstwa przewodziły rywalizującym blokom?", ["Francja i Niemcy", "USA i ZSRR", "Polska i Indie", "Włochy i Japonia"], 1, "USA i ZSRR rywalizowały politycznie, militarnie i gospodarczo."),
      question("Czym była dekolonizacja?", ["Budową muru berlińskiego", "Jednoczeniem Niemiec", "Uzyskiwaniem niepodległości przez kolonie", "Powstaniem NATO"], 2, "Dekolonizacja oznaczała wychodzenie społeczeństw spod władzy kolonialnej."),
      question("Co wydarzyło się w Polsce 4 czerwca 1989 roku?", ["Powstała Solidarność", "Wprowadzono stan wojenny", "Polska weszła do NATO", "Odbyły się częściowo wolne wybory"], 3, "Wybory z 4 czerwca były jednym z przełomowych etapów przemian ustrojowych."),
    ],
  },
  {
    slug: "xxi-wiek", century: "XXI", period: "2001–2020", title: "Świat XXI wieku",
    summary: "Integracja europejska, globalne powiązania i rewolucja cyfrowa.",
    sections: [
      ["Integracja europejska", "Podstawy współczesnej integracji europejskiej powstały po II wojnie światowej. Unia Europejska została ustanowiona w 1993 roku, a w XXI wieku przyjmowała kolejnych członków. Polska przystąpiła do UE 1 maja 2004 roku wraz z dziewięcioma innymi państwami. Integracja ułatwiała handel, podróże, naukę i pracę ponad granicami. Nie oznaczała jednak, że wszystkie państwa członkowskie przyjęły euro."],
      ["Globalizacja i technologia", "Globalizacja to rosnące powiązania gospodarcze, społeczne i kulturowe między regionami świata. Internet i upowszechnienie smartfonów przyspieszyły przepływ informacji, rozwój usług cyfrowych i komunikację. Pojawiły się także wyzwania związane z prywatnością, dezinformacją i nierównym dostępem do technologii. Globalny kryzys finansowy z 2008 roku pokazał, jak problemy w jednym obszarze gospodarki mogą przenosić się na inne państwa."],
      ["Bezpieczeństwo i współzależność", "Zamachy terrorystyczne w USA z 11 września 2001 roku wpłynęły na politykę bezpieczeństwa i stosunki międzynarodowe. W Europie proces integracji nie był jednokierunkowy: Wielka Brytania opuściła UE w 2020 roku, co określa się jako Brexit. Pandemia COVID-19 w 2020 roku zakłóciła edukację, podróże i gospodarkę. Te wydarzenia pokazały znaczenie współpracy międzynarodowej i odporności instytucji."],
    ],
    dates: [["2001", "Zamachy z 11 września"], ["1 maja 2004", "Przystąpienie Polski do UE"], ["2008", "Globalny kryzys finansowy"], ["2020", "Brexit i pandemia COVID-19"]],
    takeaway: "Początek XXI wieku przyniósł głębsze powiązania między państwami. Ułatwiały one współpracę, ale także przenoszenie kryzysów ponad granicami.",
    questions: [
      question("Kiedy Polska przystąpiła do Unii Europejskiej?", ["1 maja 2004", "4 czerwca 1989", "11 września 2001", "1 stycznia 2020"], 0, "Polska dołączyła do UE 1 maja 2004 roku wraz z dziewięcioma innymi państwami."),
      question("Co oznacza globalizacja?", ["Całkowitą izolację państw", "Likwidację internetu", "Rosnące powiązania między regionami świata", "Wyłącznie zmianę granic"], 2, "Globalizacja obejmuje powiązania gospodarcze, społeczne i kulturowe."),
      question("Jak nazywa się wystąpienie Wielkiej Brytanii z UE?", ["Wiosna Ludów", "Brexit", "Dekolonizacja", "Okrągły Stół"], 1, "Brexit oznacza wystąpienie Wielkiej Brytanii z UE, które nastąpiło w 2020 roku."),
    ],
  },
].map((lesson) => ({
  ...lesson,
  quiz: {
    category: { slug: lesson.slug, name: lesson.title },
    questions: lesson.questions.map((item, index) => ({ ...item, id: `${lesson.slug}-${index}` })),
  },
}));
