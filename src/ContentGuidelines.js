import React from 'react';
import { Link } from 'react-router-dom';

const ContentGuidelines = () => {
  return (
    <div className="disclaimer-page">
      <div className="gs-container">
        <div className="disclaimer-card">
          <h2>Content Guidelines</h2>
          <p>Last updated: July 2026</p>

          <h4>1. Everything is reviewed before it goes live</h4>
          <p>
            The Good Shtick is a curated feed, not an open firehose. Every submission is
            reviewed by a moderator before it's approved and shown to the rest of the
            site. Posting something doesn't guarantee it will be published.
          </p>

          <h4>2. The standard we use</h4>
          <p>
            There's no long legal checklist for this — it comes down to one practical
            test: <strong>a post only gets approved if we'd feel comfortable showing it
            to our wife, our local Orthodox rabbi, and our in-laws.</strong> If it would
            make any of them uncomfortable, wouldn't hold up to their standards, or just
            wouldn't feel right to show them, it doesn't get approved — regardless of
            whether it's technically "allowed" content elsewhere on the internet.
          </p>

          <h4>3. What that generally rules out</h4>
          <p>Without trying to list every possible case, this standard generally excludes:</p>
          <ul>
            <li>Sexual or crude content, and anything not suitable for a family audience</li>
            <li>Hateful, degrading, or disrespectful content toward any person or group</li>
            <li>Content that mocks religious practice, belief, or observance</li>
            <li>Illegal content, or content promoting illegal activity</li>
            <li>Spam, scams, or purely promotional content with no real value to the feed</li>
          </ul>

          <h4>4. It's a judgment call, and that's intentional</h4>
          <p>
            Approval decisions are ultimately up to the discretion of the website's
            owners and moderators. Two borderline posts that look similar on paper can
            get different outcomes — context, tone, and framing all matter, and we'd
            rather be inconsistent in the direction of caution than let something through
            that doesn't belong here. If your post isn't approved, it isn't necessarily a
            judgment on you — it just didn't clear the bar for this particular feed.
          </p>

          <h4>5. Questions or appeals</h4>
          <p>
            If you think a post was rejected in error, or you just want to understand
            why, reach out at{' '}
            <a href="mailto:seedling.gary@gmail.com">seedling.gary@gmail.com</a>
            {' '}or via our <Link to="/contact">Contact page</Link>. These guidelines may
            be updated over time as the site grows.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContentGuidelines;
