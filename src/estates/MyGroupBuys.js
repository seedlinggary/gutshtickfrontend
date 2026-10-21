import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import GroupBuyCard from './GroupBuyCard';

export default function MyGroupBuys() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'joined' ? 'joined' : 'created';
  const [created, setCreated] = useState(null);
  const [joined, setJoined] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/estates/my/group-buys')
      .then((d) => { setCreated(d.created || []); setJoined(d.joined || []); })
      .catch(() => { setCreated([]); setJoined([]); });
  }, []);

  const list = tab === 'joined' ? joined : created;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Users size={13} /> Your account</div>
          <h1 className="est-masthead-title">My Group Buys</h1>
          <p className="est-masthead-sub">Projects you've started, and projects you've joined as an interested buyer.</p>
        </div>

        <div className="est-segmented" style={{ marginBottom: 18 }}>
          <button type="button" className={`est-segmented-btn${tab === 'created' ? ' active' : ''}`} onClick={() => setSearchParams({})}>
            Started by me {created ? `(${created.length})` : ''}
          </button>
          <button type="button" className={`est-segmented-btn${tab === 'joined' ? ' active' : ''}`} onClick={() => setSearchParams({ tab: 'joined' })}>
            Joined {joined ? `(${joined.length})` : ''}
          </button>
        </div>

        {tab === 'created' && (
          <div className="biz-list-cta">
            <Link to="/group-buy/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Start a group buy</Link>
          </div>
        )}

        {list === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {list && list.length === 0 && (
          <p className="est-empty">{tab === 'joined' ? "You haven't joined any group buys yet." : "You haven't started any group buys yet."}</p>
        )}
        {list && list.length > 0 && (
          <div className="est-listing-grid">
            {list.map((gb) => <GroupBuyCard key={gb.id} groupBuy={gb} />)}
          </div>
        )}
      </div>
    </div>
  );
}
