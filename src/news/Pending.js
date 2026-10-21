import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Check, X, ExternalLink } from 'lucide-react';
import apiRequest from '../ApiRequest';

export default function Pending() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    apiRequest('GET', null, '/news/admin/pending')
      .then((d) => setArticles(d.articles || []))
      .catch(() => setError('Could not load the pending queue (super-admin access required).'));
  };
  useEffect(load, []);

  const act = async (id, action) => {
    try {
      await apiRequest('POST', null, `/news/admin/articles/${id}/${action}`);
      setArticles((rows) => rows.filter((a) => a.id !== id));
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><ClipboardCheck size={13} /> Super Admin</div>
          <h1 className="news-masthead-title">Pending Review</h1>
          <p className="news-masthead-sub">Scraped headlines wait here until approved -- nothing pulled in automatically goes public without a human check.</p>
        </div>

        {error && <p className="news-error">{error}</p>}
        {!error && articles === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {articles && articles.length === 0 && <p className="news-empty">Nothing waiting for review.</p>}
        {articles && articles.map((a) => (
          <div key={a.id} className="news-pending-card">
            {a.image_url && <img src={a.image_url} alt={a.title} />}
            <div style={{ flex: 1 }}>
              <strong>{a.title}</strong>
              <p style={{ margin: '4px 0', fontSize: 13.5, color: 'var(--muted)' }}>{a.excerpt}</p>
              {a.source_url && (
                <a href={a.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
                  {a.source_name} <ExternalLink size={11} style={{ verticalAlign: -1 }} />
                </a>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => act(a.id, 'approve')}><Check size={13} /> Approve</button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => act(a.id, 'reject')}><X size={13} /> Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
