import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, Mail, Phone, MessageCircle, Pencil, Trash2, MapPin,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ShareButton from '../ShareButton';

const STAGE_LABEL = {
  pre_construction: 'Pre-Construction',
  under_construction: 'Under Construction',
  nearing_completion: 'Nearing Completion',
};

function whatsappHref(number) {
  const digits = (number || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

export default function GroupBuyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [gb, setGb] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState('');
  const [joining, setJoining] = useState(false);

  const load = () => {
    apiRequest('GET', null, `/estates/group-buys/${slug}`).then(setGb).catch(() => setNotFound(true));
  };
  useEffect(() => { load(); }, [slug]);

  const join = async () => {
    if (!isLoggedIn()) { navigate('/signin'); return; }
    setJoining(true);
    try {
      await apiRequest('POST', { note: note.trim() || undefined }, `/estates/group-buys/${gb.id}/join`);
      load();
      setNote('');
    } catch (e) { /* ignore */ } finally { setJoining(false); }
  };

  const leave = async () => {
    try {
      await apiRequest('DELETE', null, `/estates/group-buys/${gb.id}/join`);
      load();
    } catch (e) { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this group buy? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/estates/group-buys/${gb.id}`);
      navigate('/group-buy');
    } catch (e) { /* ignore */ }
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 820 }}>
        <p>Group buy not found. <Link to="/group-buy">Back to Group Buy</Link></p>
      </div></div>
    );
  }
  if (!gb) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  const pct = gb.min_group_size ? Math.min(100, Math.round((gb.member_count / gb.min_group_size) * 100)) : null;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <Link to="/group-buy" className="est-back-link"><ArrowLeft size={13} /> Back to Group Buy</Link>

        {gb.photos && gb.photos.length > 0 ? (
          <div className="est-hero-gallery">{gb.photos.map((p) => <img key={p.id} src={p.url} alt={gb.title} />)}</div>
        ) : (
          <div className="est-hero-gallery-empty"><Building2 size={40} /></div>
        )}

        <div className="est-badge-row">
          {gb.stage && <span className="est-badge">{STAGE_LABEL[gb.stage] || gb.stage}</span>}
          {gb.is_closed && <span className="est-badge agent">Closed</span>}
        </div>

        <h1 dir="auto" style={{ margin: '0 0 4px' }}>{gb.title}</h1>
        <p dir="auto" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 8px' }}>
          <MapPin size={14} /> {[gb.address, gb.neighborhood, gb.city, gb.state, gb.country].filter(Boolean).join(', ')}
        </p>
        {gb.developer_name && <p dir="auto" style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--muted)' }}>Developer: {gb.developer_name}</p>}
        {gb.expected_completion && <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--muted)' }}>Expected completion: {gb.expected_completion}</p>}

        {gb.price_per_unit_estimate != null && (
          <div className="est-price-line">~{gb.currency === 'ILS' ? '₪' : '$'}{gb.price_per_unit_estimate.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>per unit, estimated</span></div>
        )}

        {gb.description && <p dir="auto" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{gb.description}</p>}

        <div className="est-form-section">
          <h3>Group progress</h3>
          {pct !== null && <div className="est-progress-bar"><div className="est-progress-fill" style={{ width: `${pct}%` }} /></div>}
          <p style={{ margin: '6px 0 0', fontSize: 14 }}>
            <Users size={14} style={{ verticalAlign: -2 }} /> {gb.member_count} buyer(s) joined
            {gb.min_group_size ? ` -- ${gb.min_group_size} needed for the group discount` : ''}
            {gb.total_units ? ` (${gb.total_units} units total)` : ''}
          </p>

          {!gb.is_closed && (
            gb.is_member ? (
              <button type="button" className="gs-btn gs-btn-outline" style={{ marginTop: 10 }} onClick={leave}>Leave this group buy</button>
            ) : (
              <div style={{ marginTop: 10 }}>
                <textarea
                  className="gs-input" style={{ minHeight: 60, marginBottom: 8 }}
                  placeholder="Optional note for the organizer (e.g. unit size you're interested in)"
                  value={note} onChange={(e) => setNote(e.target.value)}
                />
                <button type="button" className="gs-btn gs-btn-primary" disabled={joining} onClick={join}>
                  {joining ? 'Joining…' : "I'm interested -- join this group"}
                </button>
              </div>
            )
          )}
        </div>

        {gb.can_manage && gb.members && (
          <div className="est-form-section">
            <h3>Interested buyers ({gb.members.length})</h3>
            {gb.members.length === 0 && <p className="est-empty">No one has joined yet.</p>}
            {gb.members.map((m) => (
              <div key={m.user_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                <strong>{m.email}</strong>{m.note && <span style={{ color: 'var(--muted)' }}> -- {m.note}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="est-contact-card">
          <strong>{gb.contact_name || 'Contact the organizer'}</strong>
          <div className="est-contact-row">
            {gb.contact_email && <a className="gs-btn gs-btn-outline gs-btn-sm" href={`mailto:${gb.contact_email}`}><Mail size={14} /> Email</a>}
            {gb.contact_phone && <a className="gs-btn gs-btn-outline gs-btn-sm" href={`tel:${gb.contact_phone}`}><Phone size={14} /> Call</a>}
            {gb.contact_whatsapp && <a className="gs-btn gs-btn-outline gs-btn-sm" href={whatsappHref(gb.contact_whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <ShareButton
            title={gb.title}
            text={`${gb.title}${gb.city ? ` — ${gb.neighborhood || gb.city}` : ''} -- group buy${gb.min_group_size ? `, ${gb.min_group_size} needed for the discount` : ''}`}
            url={window.location.href}
          />
          {gb.can_manage && (
            <>
              <Link to={`/group-buy/${gb.slug}/edit`} className="gs-btn gs-btn-outline"><Pencil size={15} /> Edit</Link>
              <button type="button" className="gs-btn gs-btn-outline" onClick={handleDelete}><Trash2 size={15} /> Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
