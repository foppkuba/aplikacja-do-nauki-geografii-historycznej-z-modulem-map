import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
import { checkQuizAnswer, fetchQuiz, fetchQuizCategories } from "./api/quizzes";

export default function QuizModule() {
  const [categories, setCategories] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchQuizCategories({ signal: controller.signal }).then(setCategories)
      .catch((requestError) => requestError.name !== "AbortError" && setError(requestError.message))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const startQuiz = async (slug) => {
    setLoading(true); setError("");
    try {
      setQuiz(await fetchQuiz(slug));
      setQuestionIndex(0); setAnswer(null); setScore(0);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const chooseAnswer = async (answerId) => {
    if (answer || !quiz) return;
    try {
      const result = await checkQuizAnswer(quiz.questions[questionIndex].id, answerId);
      setAnswer({ selectedId: answerId, ...result });
      if (result.isCorrect) setScore((current) => current + 1);
    } catch (requestError) { setError(requestError.message); }
  };

  const leaveQuiz = () => { setQuiz(null); setQuestionIndex(0); setAnswer(null); setScore(0); };
  const question = quiz?.questions[questionIndex];
  const finished = quiz && questionIndex >= quiz.questions.length;

  return (
    <section className="quiz-section" id="quizy" aria-labelledby="quiz-title">
      <div className="section-intro">
        <div><span className="section-kicker">SPRAWDŹ SWOJĄ WIEDZĘ</span><h2 id="quiz-title">Quizy historyczne</h2></div>
        <p>Pytania powstały na podstawie wydarzeń i kampanii prezentowanych na interaktywnej mapie.</p>
      </div>
      {error && <p className="quiz-error" role="alert">{error}</p>}
      {loading && <div className="quiz-loading"><span className="loader" /> Wczytywanie quizu…</div>}
      {!loading && !quiz && <div className="quiz-categories">
        {categories.map((category, index) => <article className="quiz-category" key={category.slug}>
          <span className="quiz-category__number">0{index + 1}</span>
          <small>KATEGORIA · {category.questionCount} PYTAŃ</small><h3>{category.name}</h3>
          <p>{category.description}</p>
          <button type="button" onClick={() => startQuiz(category.slug)}>Rozpocznij quiz <ArrowRight size={17} /></button>
        </article>)}
        {!categories.length && !error && <p>Brak dostępnych quizów.</p>}
      </div>}
      {!loading && quiz && !finished && question && <article className="quiz-player">
        <div className="quiz-player__top">
          <button className="quiz-back" type="button" onClick={leaveQuiz}><ArrowLeft size={16} /> Kategorie</button>
          <span>{quiz.category.name}</span><strong>{questionIndex + 1} / {quiz.questions.length}</strong>
        </div>
        <div className="quiz-progress"><span style={{ width: `${((questionIndex + 1) / quiz.questions.length) * 100}%` }} /></div>
        <h3>{question.prompt}</h3>
        <div className="quiz-answers">{question.answers.map((option, index) => {
          const isSelected = String(answer?.selectedId) === String(option.id);
          const isCorrect = String(answer?.correctAnswerId) === String(option.id);
          const state = answer && (isCorrect ? "is-correct" : isSelected ? "is-wrong" : "");
          return <button key={option.id} className={state} type="button" disabled={Boolean(answer)} onClick={() => chooseAnswer(option.id)}>
            <span>{String.fromCharCode(65 + index)}</span>{option.text}
            {isCorrect && <Check size={18} />}{isSelected && !isCorrect && <X size={18} />}
          </button>;
        })}</div>
        {answer && <div className={`quiz-feedback ${answer.isCorrect ? "is-correct" : "is-wrong"}`}>
          <strong>{answer.isCorrect ? "Dobra odpowiedź!" : "Jeszcze nie tym razem."}</strong><p>{answer.explanation}</p>
          <button type="button" onClick={() => { setQuestionIndex((index) => index + 1); setAnswer(null); }}>
            {questionIndex + 1 === quiz.questions.length ? "Zobacz wynik" : "Następne pytanie"} <ArrowRight size={16} />
          </button>
        </div>}
      </article>}
      {!loading && finished && <article className="quiz-result">
        <Trophy size={42} /><small>QUIZ UKOŃCZONY</small><h3>{score} / {quiz.questions.length}</h3>
        <p>Poprawne odpowiedzi: {Math.round((score / quiz.questions.length) * 100)}%</p>
        <div><button type="button" onClick={() => startQuiz(quiz.category.slug)}><RotateCcw size={16} /> Spróbuj ponownie</button><button type="button" onClick={leaveQuiz}>Wybierz kategorię</button></div>
      </article>}
    </section>
  );
}
