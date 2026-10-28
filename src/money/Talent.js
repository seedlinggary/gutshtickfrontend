import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import apiRequest from '../ApiRequest';

const LINE_OF_WORK_LABEL = {
  tech: 'Tech', healthcare: 'Healthcare', education: 'Education',
  sales_marketing: 'Sales & Marketing', finance_accounting: 'Finance & Accounting',
  skilled_trade: 'Skilled Trade', hospitality: 'Hospitality', legal: 'Legal',
  government: 'Government', self_employed: 'Self-Employed', student: 'Student', other: 'Other',
};

/** Stage 5's "open to work" card -- public browse of GET /tachlis/talent,
 * members who've opted in with a CV summary and a contact they're fine
 * with employers seeing (never their account email). */
export default function Talent() {
  const [talent, setTalent] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/tachlis/talent').then((d) => setTalent(d.talent || [])).catch(() => setTalent([]));
  }, []);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1 style={{ margin: '0 0 4px' }}><Users size={20} style={{ verticalAlign: -2 }} /> Open to Work</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          GUT members who've opted in to be found by employers.
        </p>

        {talent === null && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {talent && talent.length === 0 && (
          <div className="gs-empty"><p>Nobody's opted in yet. Check back soon!</p></div>
        )}

        {talent && talent.map((t) => (
          <div key={t.public_id} className="gs-card" style={{ marginBottom: 12 }}>
            <div className="gs-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong>{t.profile_name || 'GUT member'}</strong>
                {t.line_of_work && (
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>🏷 {LINE_OF_WORK_LABEL[t.line_of_work] || t.line_of_work}</span>
                )}
              </div>
              {t.cv_summary && (
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.cv_summary}</p>
              )}
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Contact: {t.cv_contact}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
