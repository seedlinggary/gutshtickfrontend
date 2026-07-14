import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Renders nothing. React Router doesn't reset scroll position on navigation
 * (unlike a traditional multi-page site), so without this, going from a page
 * you'd scrolled down on to a new page leaves you scrolled down on the new
 * page too. Mount once, inside the Router.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
