import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchCategory, fetchData } from "./actions";
import { clearAuth } from "./auth";
import CrossSiteLink from "./CrossSiteLink";
import { getCurrentSite } from "./siteMode";

const BRAND = {
  business: { name: <>Gut <span>Community</span></>, plain: "Gut Community", tagline: "The local business directory & deals board, powered by Gut Shtick." },
  estates: { name: <>Gut <span>Estates</span></>, plain: "Gut Estates", tagline: "Real listings for sale and rent, posted directly by owners and agents." },
  money: { name: <>Gut <span>Money</span></>, plain: "Gut Money", tagline: "Calculators, budgeting, and market research to plan your money." },
  torah: { name: <>Gut <span>Torah</span></>, plain: "Gut Torah", tagline: "Divrei Torah, zmanim, sources and prayers, shared by the community." },
  news: { name: <>Gut <span>News</span></>, plain: "Gut News", tagline: "Curated headlines and community-written posts, reviewed before they're public." },
};

// Every sub-site's footer "Navigate" column, as plain {label, path} entries
// -- `authOnly` links only show once signed in. One config map scales to
// however many sub-sites this app ends up serving; the main consumer site
// below keeps its own special-cased block since its links dispatch redux
// actions (goToFeed) instead of a plain navigate().
const SITE_NAV = {
  business: [
    { label: "Directory", path: "/" },
    { label: "Community", path: "/community" },
    { label: "Deals", path: "/deals" },
    { label: "List Your Business", path: "/business/new" },
    { label: "My Businesses", path: "/my-businesses", authOnly: true },
  ],
  estates: [
    { label: "Buy & Rent", path: "/" },
    { label: "Group Buy", path: "/group-buy" },
    { label: "Calculators", path: "/calculators" },
    { label: "Learn", path: "/learn" },
    { label: "List a Property", path: "/listings/new" },
    { label: "My Listings", path: "/my-listings", authOnly: true },
  ],
  money: [
    { label: "Calculators", path: "/" },
    { label: "Investing", path: "/investing" },
    { label: "Budgeting", path: "/budgeting" },
    { label: "Learn", path: "/learn" },
  ],
  torah: [
    { label: "Posts", path: "/" },
    { label: "Zmanim", path: "/zmanim" },
    { label: "Sources", path: "/sources" },
    { label: "Prayers", path: "/prayers" },
    { label: "Source Sheets", path: "/sheets", authOnly: true },
    { label: "Share Torah", path: "/posts/new" },
    { label: "My Posts", path: "/my-posts", authOnly: true },
  ],
  news: [
    { label: "Articles", path: "/" },
    { label: "Media Literacy", path: "/learn" },
    { label: "Write a Post", path: "/articles/new" },
    { label: "My Posts", path: "/my-articles", authOnly: true },
  ],
};

const Footer = () => {
  const siteId = getCurrentSite()?.id; // undefined on the main consumer site
  const brand = BRAND[siteId];
  const navLinks = SITE_NAV[siteId];
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const email = localStorage.getItem("email");

  function go(path) {
    navigate(path);
  }

  function goToFeed(path, category) {
    dispatch(fetchCategory(category));
    dispatch(fetchData());
    navigate(path);
  }

  function handleSignOut() {
    clearAuth();
    navigate("/");
    navigate(0);
  }

  return (
    <footer className="gs-footer">
      <div className="gs-container">
        <div className="gs-footer-grid">
          <div>
            <div className="gs-footer-brand">
              {brand ? brand.name : <>Gut <span>Shtick</span></>}
            </div>
            <p className="gs-footer-tagline">
              {brand ? brand.tagline : "Curated content worth your time. No noise, just the good stuff."}
            </p>
          </div>

          {navLinks ? (
            <div>
              <div className="gs-footer-col-title">Navigate</div>
              {navLinks.filter((link) => !link.authOnly || email).map((link) => (
                <button key={link.path} className="gs-footer-link" onClick={() => go(link.path)}>{link.label}</button>
              ))}
            </div>
          ) : (
            <div>
              <div className="gs-footer-col-title">Navigate</div>
              <button className="gs-footer-link" onClick={() => go("/")}>Home</button>
              <button className="gs-footer-link" onClick={() => goToFeed("/feed/all", "all")}>All Posts</button>
              {email && (
                <button className="gs-footer-link" onClick={() => goToFeed("/feed/liked", "liked")}>
                  Liked Posts
                </button>
              )}
              {email && (
                <button className="gs-footer-link" onClick={() => go("/CreateShtick")}>
                  Post Shtick
                </button>
              )}
            </div>
          )}

          <div>
            <div className="gs-footer-col-title">Company</div>
            <button className="gs-footer-link" onClick={() => go("/about")}>About Us</button>
            <button className="gs-footer-link" onClick={() => go("/contact")}>Contact</button>
            <button className="gs-footer-link" onClick={() => go("/disclaimer")}>Terms &amp; Conditions</button>
            <button className="gs-footer-link" onClick={() => go("/content-guidelines")}>Content Guidelines</button>
          </div>

          <div>
            <div className="gs-footer-col-title">Account</div>
            {email ? (
              <button className="gs-footer-link" onClick={handleSignOut}>Sign Out</button>
            ) : (
              <>
                <button className="gs-footer-link" onClick={() => go("/signin")}>Sign In</button>
                <button className="gs-footer-link" onClick={() => go("/signup")}>Sign Up</button>
              </>
            )}
          </div>
        </div>

        <div className="gs-footer-bottom">
          <span className="gs-footer-copy">
            &copy; {new Date().getFullYear()} {brand ? brand.plain : "Gut Shtick"}. All rights reserved.
          </span>
        </div>
      </div>
      <CrossSiteLink />
    </footer>
  );
};

export default Footer;
