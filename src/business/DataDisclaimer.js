import React from 'react';
import { Link } from 'react-router-dom';

/** Small, honest notice for directory/deals pages built substantially from
 * bulk-sourced listings -- reused wherever that data is shown (Directory,
 * Deals) rather than only living in the site-wide Footer, since it's most
 * meaningful right next to the data it's describing. */
export default function DataDisclaimer() {
  return (
    <p className="biz-disclaimer">
      ℹ️ Business info may not always be up to date — please verify before you go.
      {' '}If you spot anything inaccurate, <Link to="/contact">let us know</Link>.
    </p>
  );
}
