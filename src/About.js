import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="about-page">
      <div className="gs-container">
        <div className="about-hero">
          <h2>About Gut Shtick</h2>
          <p>
            We scour the internet so you don't have to. Our team curates the best content
            from across the web — filtered, approved, and delivered in one clean feed.
            No clickbait. No noise. Just the good stuff.
          </p>
        </div>

        <h3 style={{ marginBottom: 8 }}>What we do</h3>
        <p style={{ color: 'var(--muted)', marginBottom: 32, lineHeight: 1.75 }}>
          Gut Shtick is a community-powered content platform. Members submit links,
          quotes, videos, and articles they love — our team reviews every post before it
          goes live to make sure it's actually worth your time. Think of it as a curated
          highlights reel for the internet.
        </p>

        <h3 style={{ marginBottom: 20 }}>What people are saying</h3>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p className="testimonial-quote">"Great content all in one place. I check it every morning with my coffee."</p>
            <div className="testimonial-author">— Mom</div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"Such a pleasure — I never have to go anywhere else for my daily dose of interesting stuff."</p>
            <div className="testimonial-author">— Adina</div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"Finally, a feed that doesn't make me feel like I wasted my time."</p>
            <div className="testimonial-author">— A Happy User</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Want to contribute? We'd love to have you.
          </p>
          <Link to="/signup" className="gs-btn gs-btn-primary" style={{ marginRight: 12 }}>
            Join the community
          </Link>
          <Link to="/contact" className="gs-btn gs-btn-outline">
            Get in touch
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
