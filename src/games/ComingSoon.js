import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ title }) {
  const navigate = useNavigate();
  return (
    <div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h2>{title}</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px' }}>
        This mode is still being rolled out — check back soon!
      </p>
      <button className="gs-btn gs-btn-outline" onClick={() => navigate('/games')}>← Back to Arcade</button>
    </div>
  );
}
