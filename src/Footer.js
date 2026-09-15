import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchCategory, fetchData } from "./actions";
import { clearAuth } from "./auth";
import CrossSiteLink from "./CrossSiteLink";
import { isBusinessSite } from "./siteMode";

const Footer = () => {
  const business = isBusinessSite();
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
              {business ? <>Good Shtick <span>Business</span></> : <>Gut <span>Shtick</span></>}
            </div>
            <p className="gs-footer-tagline">
              {business
                ? "The local business directory & deals board, powered by Gut Shtick."
                : "Curated content worth your time. No noise, just the good stuff."}
            </p>
          </div>

          {business ? (
            <div>
              <div className="gs-footer-col-title">Navigate</div>
              <button className="gs-footer-link" onClick={() => go("/")}>Directory</button>
              <button className="gs-footer-link" onClick={() => go("/deals")}>Deals</button>
              <button className="gs-footer-link" onClick={() => go("/business/new")}>List Your Business</button>
              {email && (
                <button className="gs-footer-link" onClick={() => go("/my-businesses")}>My Businesses</button>
              )}
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
            &copy; {new Date().getFullYear()} {business ? "Good Shtick Business" : "Gut Shtick"}. All rights reserved.
          </span>
        </div>
      </div>
      <CrossSiteLink />
    </footer>
  );
};

export default Footer;
