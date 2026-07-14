import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchCategory, fetchData } from "./actions";
import { clearAuth } from "./auth";

const Footer = () => {
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
              Gut <span>Shtick</span>
            </div>
            <p className="gs-footer-tagline">
              Curated content worth your time. No noise, just the good stuff.
            </p>
          </div>

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
            &copy; {new Date().getFullYear()} Gut Shtick. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
