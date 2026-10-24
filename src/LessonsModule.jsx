import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { historyLessons } from "./historyLessons";
import { lessonMapLinks } from "./lessonMapLinks";
import QuizModule from "./QuizModule";
import "./LessonsModule.css";

export default function LessonsModule({ account, onProgressSaved, onShowMap, ref }) {
  const [century, setCentury] = useState("Wszystkie");
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [view, setView] = useState("catalog");
  const heading = useRef(null);
  const hasNavigated = useRef(false);
  const lesson = historyLessons.find((item) => item.slug === selectedSlug);
  const nextLesson = lesson && historyLessons[historyLessons.indexOf(lesson) + 1];

  useEffect(() => {
    if (hasNavigated.current) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    }
  }, [selectedSlug, view]);

  const navigate = (nextView, slug = selectedSlug) => {
    hasNavigated.current = true;
    setSelectedSlug(slug);
    setView(nextView);
  };

  useImperativeHandle(ref, () => ({
    openLesson(slug) {
      if (!historyLessons.some((item) => item.slug === slug)) return;
      navigate("reading", slug);
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
  }));

  return <section className="lessons-section" id="lekcje" aria-labelledby="lessons-title">
    <div className="section-intro">
      <div><span className="section-kicker">CZYTAJ · ZROZUM · SPRAWDŹ SIĘ</span>
        <h2 id="lessons-title" ref={heading} tabIndex={-1}>Lekcje historii XIX–XXI wieku</h2>
      </div>
      <p>Siedem tematów z historii Polski i świata. Najpierw poznaj wydarzenia i ich przyczyny, potem rozwiąż quiz do lekcji.</p>
    </div>

    {view === "catalog" ? <>
      <div className="lesson-filters" role="group" aria-label="Filtruj lekcje według wieku">
        {["Wszystkie", "XIX", "XX", "XXI"].map((item) => <button key={item} type="button" aria-pressed={century === item} onClick={() => setCentury(item)}>{item === "Wszystkie" ? item : `${item} wiek`}</button>)}
      </div>
      <div className="lesson-grid">
        {historyLessons.filter((item) => century === "Wszystkie" || item.century === century).map((item) => <article className="lesson-card" key={item.slug}>
          <span className="section-kicker">{item.century} WIEK · {item.period}</span>
          <h3>{item.title}</h3><p>{item.summary}</p>
          <div className="lesson-meta"><Clock3 size={15} aria-hidden="true" /> Około 4 min czytania · {item.quiz.questions.length} pytania</div>
          <button type="button" className="primary-button" onClick={() => navigate("reading", item.slug)} aria-label={`Otwórz lekcję: ${item.title}`}>Otwórz lekcję <ArrowRight size={17} /></button>
        </article>)}
      </div>
    </> : <>
      <button className="quiz-back lesson-catalog-back" type="button" onClick={() => navigate("catalog", null)}><ArrowLeft size={16} /> Wszystkie lekcje</button>
      {view === "reading" && lesson && <article className="lesson-reader">
        <header><span className="section-kicker">{lesson.century} WIEK · {lesson.period}</span><h3>{lesson.title}</h3><p>{lesson.summary}</p></header>
        {lesson.sections.map(([title, content]) => <section key={title}><h4>{title}</h4><p>{content}</p></section>)}
        <aside className="lesson-dates" aria-label="Najważniejsze daty"><h4>Najważniejsze daty</h4><dl>{lesson.dates.map(([date, event]) => <div key={date}><dt>{date}</dt><dd>{event}</dd></div>)}</dl></aside>
        <aside className="lesson-map-links" aria-label="Odkrywaj temat na mapie">
          <h4>Z lekcji na mapę</h4>
          <p>Porównaj mapę Europy w wybranych momentach tej lekcji. Przy mapie znajdziesz przycisk powrotu do tego tematu.</p>
          <div>{lessonMapLinks[lesson.slug].stops.map((stop) => <button type="button" key={stop.date} onClick={() => onShowMap(lesson.slug, stop)}>
            <strong>{stop.label}</strong><span>{stop.date} · Zobacz mapę <ArrowRight size={15} aria-hidden="true" /></span>
          </button>)}</div>
        </aside>
        <div className="lesson-takeaway"><h4>Zapamiętaj</h4><p>{lesson.takeaway}</p></div>
        <footer className="lesson-finish"><div><h4>Czas sprawdzić wiedzę</h4><p>Quiz zawiera {lesson.quiz.questions.length} pytania dotyczące tej lekcji. Po każdej odpowiedzi zobaczysz wyjaśnienie.</p></div><button type="button" className="primary-button" onClick={() => navigate("quiz")}>Przejdź do quizu <ArrowRight size={18} /></button></footer>
      </article>}
      {view === "quiz" && lesson && <QuizModule key={lesson.slug} account={account} onProgressSaved={onProgressSaved} lessonQuiz={lesson.quiz} onReturn={() => navigate("reading")} onNext={nextLesson ? () => navigate("reading", nextLesson.slug) : undefined} />}
    </>}
  </section>;
}
