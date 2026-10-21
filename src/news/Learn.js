import React from 'react';
import { BookOpen } from 'lucide-react';

function Sources({ items }) {
  return (
    <div className="news-sources">
      <h4>Sources</h4>
      <ol>
        {items.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
        ))}
      </ol>
    </div>
  );
}

export default function Learn() {
  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><BookOpen size={13} /> Media Literacy</div>
          <h1 className="news-masthead-title">How to actually evaluate what you're reading</h1>
          <p className="news-masthead-sub">Real techniques researchers found separate careful readers from easily-fooled ones -- not just "consider the source," but what to actually do.</p>
        </div>

        <div className="news-guide-section">
          <span className="news-guide-kicker">The SIFT method</span>
          <h2>A 4-step check before you trust or share something</h2>
          <p>Developed by digital literacy researcher Mike Caulfield, SIFT is a quick routine for judging whether a source deserves your attention:</p>
          <h3>1. Stop</h3>
          <p>Before reading further, sharing, or citing something: do you actually know and trust this publisher or author? If not, don't use it yet -- check first.</p>
          <h3>2. Investigate the source</h3>
          <p>Who's actually behind this -- their credentials, their agenda, what others say about them? A site's own "About" page isn't enough on its own; it's written by the same people you're evaluating.</p>
          <h3>3. Find better coverage</h3>
          <p>Look for other reporting on the same claim, ideally from outlets or fact-checkers you already trust. If a big claim is true, it's rarely reported by exactly one obscure source.</p>
          <h3>4. Trace claims back to the original</h3>
          <p>When a story reports on something someone else said or found, follow it back to the original quote, study, or document -- re-reporting sometimes distorts or oversimplifies along the way.</p>
          <Sources items={[
            { label: 'The SIFT Method (Pressbooks)', url: 'https://pressbooks.pub/introtocollegeresearch/chapter/the-sift-method' },
            { label: 'Fact-Checking Strategy - The SIFT Method (Pressbooks)', url: 'https://pressbooks.pub/composition2024/?p=742' },
          ]} />
        </div>

        <div className="news-guide-section">
          <span className="news-guide-kicker">Lateral reading</span>
          <h2>Why professional fact-checkers don't stay on the page</h2>
          <p>A 2017 Stanford History Education Group study (Wineburg &amp; McGrew) compared professional fact-checkers against PhD historians and Stanford undergraduates evaluating the same websites. The fact-checkers were fastest <em>and</em> most accurate -- the historians and students were often fooled.</p>
          <p>The difference was method, not expertise. Historians and students read <strong>vertically</strong> -- staying on the page, judging it by its own design, citations, and "About" page. Fact-checkers read <strong>laterally</strong> -- they left the site almost immediately and opened new tabs to check what independent sources said about it.</p>
          <div className="news-guide-note">In one test, fact-checkers quickly identified a professional-sounding organization as a front group with an agenda; only half the historians and a fifth of the students caught it. A polished logo and an official-sounding name are not evidence of reliability.</div>
          <Sources items={[
            { label: "Stanford scholars observe 'experts' evaluating credibility online (Stanford News)", url: 'https://news.stanford.edu/?p=17219' },
            { label: 'Go Lateral with Cues and Evidence (Be Credible, KU)', url: 'https://opentext.ku.edu/becredible/chapter/go-lateral-with-cues-and-evidence/' },
          ]} />
        </div>

        <div className="news-guide-section">
          <span className="news-guide-kicker">Reporting vs. opinion</span>
          <h2>They're not the same thing, even in the same publication</h2>
          <p>A <strong>news</strong> article's job is to inform you about what happened, as factually as the reporter can establish it. An <strong>opinion</strong> piece (an editorial, a column, a letter to the editor) is explicitly trying to persuade you of a position -- and is normally labeled as such in its own section.</p>
          <p>An editorial specifically speaks for a publication's editorial board as an institution, not one reporter's personal view -- a different thing again from a signed opinion column. Reputable outlets keep their news reporters institutionally separate from the opinion side precisely so one doesn't bleed into the other.</p>
          <p>The line isn't always perfectly sharp -- "advocacy reporting" explicitly reports news from a stated point of view, and studies find many readers genuinely struggle to tell straight reporting from opinion at a glance. Checking which section a piece ran in, and who it's bylined to, is the fastest way to tell.</p>
          <Sources items={[
            { label: 'News vs. Opinion - How to Distinguish News from Opinion (Writing Commons)', url: 'https://writingcommons.org/section/information-literacy/information-evaluation/news-or-opinion/' },
            { label: "Journalists believe news and opinion are separate, but readers can't tell the difference (The Conversation)", url: 'https://theconversation.com/journalists-believe-news-and-opinion-are-separate-but-readers-cant-tell-the-difference-140901' },
          ]} />
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 24 }}>
          This page summarizes published media-literacy research; it isn't a substitute for checking a specific claim yourself using the methods described above.
        </p>
      </div>
    </div>
  );
}
