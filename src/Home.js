import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCategory, fetchData } from './actions';
import FeedHome from './feed/FeedHome';
import DailyBoardHero from './feed/DailyBoardHero';

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

  useEffect(() => {
    dispatch(fetchCategory(category));
    dispatch(fetchData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const feedLabel = CATEGORY_LABELS[category] || `Category Feed`;

  return (
    <>
      {isRoot && <DailyBoardHero />}

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
