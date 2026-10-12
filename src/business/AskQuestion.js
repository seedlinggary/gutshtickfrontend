import React, { useEffect, useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { useLanguage } from './i18n';

const QUESTION_MAX = 800;

export default function AskQuestion({ businessId, canManage }) {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState([]);
  const [draft, setDraft] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [answeringId, setAnsweringId] = useState(null);
  const [answerError, setAnswerError] = useState(null);

  const load = () => {
    apiRequest('GET', null, `/business/businesses/${businessId}/questions`)
      .then(setQuestions)
      .catch(() => {});
  };

  useEffect(() => { if (businessId) load(); }, [businessId]);

  const submit = (e) => {
    e.preventDefault();
    const question = draft.trim();
    if (!question || sending) return;
    setSending(true);
    apiRequest('POST', { question }, `/business/businesses/${businessId}/questions`)
      .then(() => { setDraft(''); setStatus('Question sent -- the owner will see it, and it\'ll appear here once answered.'); load(); })
      .catch((err) => setStatus(typeof err === 'string' ? err : 'Could not send your question'))
      .finally(() => setSending(false));
  };

  const submitAnswer = (questionId) => {
    const answer = (answerDrafts[questionId] || '').trim();
    if (!answer || answeringId) return;
    setAnsweringId(questionId);
    setAnswerError(null);
    apiRequest('POST', { answer }, `/business/questions/${questionId}/answer`)
      .then(() => setAnswerDrafts((d) => ({ ...d, [questionId]: '' })))
      .then(load)
      .catch(() => setAnswerError('Could not send your answer -- try again.'))
      .finally(() => setAnsweringId(null));
  };

  const answered = questions.filter((q) => q.is_answered);
  const unanswered = questions.filter((q) => !q.is_answered);

  return (
    <div className="biz-qa">
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageCircleQuestion size={19} /> {t('askQuestion')}</h3>

      {answered.length > 0 && (
        <ul className="biz-qa-list">
          {answered.map((q) => (
            <li key={q.id} className="biz-qa-item">
              <p className="biz-qa-question">Q: {q.question}</p>
              <p className="biz-qa-answer">A: {q.answer}</p>
            </li>
          ))}
        </ul>
      )}

      {canManage && unanswered.length > 0 && (
        <ul className="biz-qa-list biz-qa-list-pending">
          {answerError && <p className="biz-error" style={{ fontSize: 12 }}>{answerError}</p>}
          {unanswered.map((q) => (
            <li key={q.id} className="biz-qa-item">
              <p className="biz-qa-question">Q: {q.question} <span className="biz-qa-asker">-- {q.asker_name}</span></p>
              <div className="biz-qa-answer-form">
                <input
                  type="text"
                  placeholder="Type an answer..."
                  value={answerDrafts[q.id] || ''}
                  onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  disabled={answeringId === q.id}
                />
                <button type="button" onClick={() => submitAnswer(q.id)} disabled={!!answeringId}>
                  {answeringId === q.id ? 'Answering…' : 'Answer'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && questions.length === 0 && (
        <p className="biz-empty">No questions yet.</p>
      )}

      {!canManage && (
        answered.length === 0 && <p className="biz-qa-empty">Nobody's asked anything yet -- be the first.</p>
      )}

      {isLoggedIn() && !canManage && (
        <form className="biz-qa-form" onSubmit={submit}>
          <textarea
            value={draft}
            maxLength={QUESTION_MAX}
            placeholder="Ask something without needing to message the owner directly..."
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={!draft.trim() || sending}>{sending ? 'Sending…' : 'Send question'}</button>
          {status && <p className="biz-qa-status">{status}</p>}
        </form>
      )}

      {!isLoggedIn() && !canManage && (
        <p className="biz-qa-status">Sign in to ask a question.</p>
      )}
    </div>
  );
}
