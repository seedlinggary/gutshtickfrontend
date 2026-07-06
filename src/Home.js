import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCategory, fetchData } from './actions';
import FeedHome from './feed/FeedHome';
import { useHomeAds, HomeAdSlot } from './ads/HomeAdSlots';

const CATEGORY_LABELS = {
  all: 'All Posts',
  liked: 'Liked Posts',
  '0': 'Pending Approval',
};

const Home = () => {
  const { category_id } = useParams();
  const dispatch = useDispatch();
  const category = category_id || 'all';
  const isRoot = !category_id;
  const { ads, dismiss } = useHomeAds();

  useEffect(() => {
    dispatch(fetchCategory(category));
    dispatch(fetchData());
  }, [category]);

  const feedLabel = CATEGORY_LABELS[category] || `Category Feed`;

  return (
    <>
      {isRoot && (
        <div className="gs-hero">
          <div className="gs-container">
            <h1 className="gs-hero-title">
              The Good <span>Shtick</span>
            </h1>
            <p className="gs-hero-sub">
              Curated content from across the web — filtered, approved, and ready for you.
              No noise. Just the good stuff.
            </p>
          </div>
        </div>
      )}
      {/* Fixed to the viewport, not to the feed's scroll flow — rendered at the
          page level, same as the sidebars, regardless of where they sit in the DOM. */}
      <HomeAdSlot ads={ads} dismiss={dismiss} placement="top" className="ad-slot-top" />
      <HomeAdSlot ads={ads} dismiss={dismiss} placement="bottom" className="ad-slot-bottom" />
      <HomeAdSlot ads={ads} dismiss={dismiss} placement="sidebar_left" className="ad-slot-sidebar ad-slot-sidebar-left" />
      <HomeAdSlot ads={ads} dismiss={dismiss} placement="sidebar_right" className="ad-slot-sidebar ad-slot-sidebar-right" />

      <div className="feed-section">
        <div className="gs-container">
          {!isRoot && (
            <div className="feed-header">
              <h2 className="feed-title">{feedLabel}</h2>
            </div>
          )}
          <FeedHome />
        </div>
      </div>
    </>
  );
};

export default Home;
