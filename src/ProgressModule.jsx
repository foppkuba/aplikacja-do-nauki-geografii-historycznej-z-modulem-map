import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, Clock3, Target, Trophy } from 'lucide-react';
import { fetchProgress } from './api/progress';
import './ProgressModule.css';

const formatDuration = (seconds) => seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`;

export default function ProgressModule({ account, revision }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    fetchProgress(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setData(result); setError(''); }
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [account, revision, retry]);

  return <section className="progress-section" id="postepy" aria-labelledby="progress-title">
    <div className="section-intro">
      <div><span className="section-kicker">TWÓJ DZIENNIK NAUKI</span><h2 id="progress-title">Twoje postępy</h2></div>
      <p>{account ? `${account.displayName}, tutaj zobaczysz wyniki zapisane na Twoim koncie.` : 'Ucz się we własnym tempie i wracaj do swoich wyników.'}</p>
    </div>
    {account === undefined ? <p role="status">Sprawdzanie konta…</p> : !account ?
      <div className="progress-empty"><BookOpen size={32} aria-hidden="true" /><h3>Zachowaj swoje postępy</h3>
        <p>Zaloguj się przed rozpoczęciem quizu, aby zapisywać wyniki i ukończone lekcje. Bez konta nadal możesz korzystać z materiałów.</p>
        <button className="primary-button" type="button" onClick={() => document.querySelector('.account-button')?.click()}>Zaloguj się lub utwórz konto <ArrowRight size={17} /></button>
      </div> : <>
        {loading && <p role="status">Wczytywanie postępów…</p>}
        {error && <div className="quiz-error" role="alert">{error} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Spróbuj ponownie</button></div>}
        {data && <>
          <dl className="progress-stats">
            <div><BookOpen size={21} /><dt>Ukończone lekcje</dt><dd>{data.summary.completedLessons}<small> / {data.summary.totalLessons}</small></dd></div>
            <div><Trophy size={21} /><dt>Ukończone quizy</dt><dd>{data.summary.attempts}</dd></div>
            <div><Target size={21} /><dt>Poprawne odpowiedzi</dt><dd>{data.summary.accuracy === null ? '—' : `${data.summary.accuracy}%`}</dd></div>
            <div><Clock3 size={21} /><dt>Aktywny czas quizów</dt><dd>{formatDuration(data.summary.durationSeconds)}</dd></div>
          </dl>
          {!data.summary.attempts && <p className="progress-start">To początek Twojej historii. Ukończ pierwszy quiz, a wynik pojawi się tutaj. <a href="#lekcje">Przejdź do lekcji →</a></p>}
          <div className="progress-details">
            <div className="progress-lessons"><h3>Twoje lekcje</h3>
              <p>Lekcja jest ukończona po rozwiązaniu jej quizu. Powtórki pozwalają poprawić najlepszy wynik.</p>
              <progress max={data.summary.totalLessons} value={data.summary.completedLessons} aria-label="Ukończone lekcje" />
              <ul>{data.lessons.map((lesson) => <li key={lesson.slug}>
                <span className={lesson.attempts ? 'progress-done' : ''}>{lesson.attempts > 0 && <Check size={16} aria-hidden="true" />}{lesson.title}</span>
                <strong>{lesson.attempts ? `Najlepszy: ${lesson.bestPercent}%` : 'Do zrobienia'}</strong>
              </li>)}</ul>
              <a className="progress-link" href="#lekcje">Kontynuuj naukę <ArrowRight size={16} /></a>
            </div>
            <div className="progress-history"><h3>Ostatnie wyniki</h3><p>Ostatnie 10 prób z lekcji i quizów historycznych.</p>
              {!data.recent.length ? <p>Nie masz jeszcze zapisanych wyników.</p> : <ol>{data.recent.map((attempt) => <li key={attempt.id}>
                <div><small>{attempt.kind === 'lesson' ? 'QUIZ PO LEKCJI' : 'QUIZ HISTORYCZNY'}</small><strong>{attempt.title}</strong>
                  <time dateTime={attempt.completedAt}>{new Date(attempt.completedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}</time></div>
                <span>{attempt.score} / {attempt.total}<small>{Math.round(100 * attempt.score / attempt.total)}%</small></span>
              </li>)}</ol>}
            </div>
          </div>
          <p className="progress-note">Statystyki obejmują próby ukończone po zalogowaniu od wprowadzenia zapisu postępów. Czas obejmuje aktywne rozwiązywanie ukończonych quizów.</p>
        </>}
      </>}
  </section>;
}
