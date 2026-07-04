import React from 'react';
import { Link } from 'react-router-dom';

const Disclaimer = () => {
  return (
    <div className="disclaimer-page">
      <div className="gs-container">
        <div className="disclaimer-card">
          <h2>Terms &amp; Conditions</h2>
          <p>Last updated: June 2026</p>

          <h4>1. Use of Content</h4>
          <p>
            The content published on The Good Shtick is curated from publicly available
            sources across the internet. We do not claim ownership of third-party content.
            All original posts and commentary are the property of their respective authors.
          </p>

          <h4>2. User Submissions</h4>
          <p>
            By submitting content to The Good Shtick, you confirm that you have the right
            to share it, and you grant us a non-exclusive license to display it on this
            platform. All submissions are reviewed before publishing.
          </p>

          <h4>3. No Liability</h4>
          <p>
            The Good Shtick is provided "as is." We make no warranties regarding the
            accuracy, completeness, or suitability of any content on this site. We are
            not liable for any damages arising from your use of this platform.
          </p>

          <h4>4. Privacy</h4>
          <p>
            We store your email address and name to operate your account. We do not sell
            your personal data to third parties. Your password is hashed and never stored
            in plain text.
          </p>

          <h4>5. Changes</h4>
          <p>
            We may update these terms from time to time. Continued use of the site after
            changes are posted constitutes your acceptance of the updated terms.
          </p>

          <h4>6. Contact</h4>
          <p>
            Questions? Reach us at{' '}
            <a href="mailto:seedling.gary@gmail.com">seedling.gary@gmail.com</a>
            {' '}or via our <Link to="/contact">Contact page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
