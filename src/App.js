import './App.css';
import React, { lazy, Suspense } from 'react';

class GameErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="game-page" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
          <h2>Game Loading…</h2>
          <p style={{ color: 'var(--muted)' }}>This game is still being set up. Check back soon!</p>
          <button className="gs-btn gs-btn-outline" onClick={() => window.location.href = '/games'} style={{ marginTop: 16 }}>
            ← Back to Arcade
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Home from './Home';
import About from './About';
import Contact from './Contact';
import NotFound from './NotFound';
import AppNavbar from './Navbar';
import Footer from './Footer';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Disclaimer from './Disclaimer';
import ContentGuidelines from './ContentGuidelines';
import SignIn from './users/SignIn';
import SignUp from './users/SignUp';
import ForgotPassword from './users/ForgotPassword';
import Games from './games/Games';

// ── Rarely-visited / auth-gated pages — kept out of the main bundle so an
// anonymous visitor just reading the feed doesn't pay for admin tooling. ──────
const Profile             = lazy(() => import('./users/Profile'));
const CreateShtick        = lazy(() => import('./shtick/CreateShtick'));
const PostPage            = lazy(() => import('./feed/PostPage'));
const AdminDashboard      = lazy(() => import('./admin/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./admin/SuperAdminDashboard'));
const VersusWrapper       = lazy(() => import('./games/versus/VersusWrapper'));
const MultiWrapper        = lazy(() => import('./games/multi/MultiWrapper'));

// ── Original solo games (lazy — same treatment as the newer ones below) ───────
const Hangman         = lazy(() => import('./games/Hangman'));
const Snake           = lazy(() => import('./games/Snake'));
const Sudoku          = lazy(() => import('./games/Sudoku'));
const Minesweeper     = lazy(() => import('./games/Minesweeper'));
const Wordle          = lazy(() => import('./games/Wordle'));
const WordScramble    = lazy(() => import('./games/WordScramble'));
const Simon           = lazy(() => import('./games/Simon'));
const MemoryMatch     = lazy(() => import('./games/MemoryMatch'));
const TwoZeroFourEight = lazy(() => import('./games/TwoZeroFourEight'));
const LightsOut       = lazy(() => import('./games/LightsOut'));

// ── New solo strategy games (lazy — large files) ──────────────────────────────
const KenKen        = lazy(() => import('./games/solo/KenKen'));
const Kakuro        = lazy(() => import('./games/solo/Kakuro'));
const Nonogram      = lazy(() => import('./games/solo/Nonogram'));
const NQueens       = lazy(() => import('./games/solo/NQueens'));
const Futoshiki     = lazy(() => import('./games/solo/Futoshiki'));
const BinaryPuzzle  = lazy(() => import('./games/solo/BinaryPuzzle'));
const Skyscrapers   = lazy(() => import('./games/solo/Skyscrapers'));
const FifteenPuzzle = lazy(() => import('./games/solo/FifteenPuzzle'));
const TowersHanoi   = lazy(() => import('./games/solo/TowersOfHanoi'));
const FlowFree      = lazy(() => import('./games/solo/FlowFree'));
const Cryptogram    = lazy(() => import('./games/solo/Cryptogram'));
const Sokoban       = lazy(() => import('./games/solo/Sokoban'));
const Hashi         = lazy(() => import('./games/solo/Hashi'));
const Nurikabe      = lazy(() => import('./games/solo/Nurikabe'));
const Mastermind    = lazy(() => import('./games/solo/Mastermind'));

// ── Relaxing games (lazy — no scores/leaderboards, just something to do) ──────
const ColorByNumber  = lazy(() => import('./games/relaxing/ColorByNumber'));
const RoomDesigner   = lazy(() => import('./games/relaxing/RoomDesigner'));
const JigsawPuzzle   = lazy(() => import('./games/relaxing/JigsawPuzzle'));
const ZenGarden      = lazy(() => import('./games/relaxing/ZenGarden'));
const BubblePop      = lazy(() => import('./games/relaxing/BubblePop'));
const Tangram        = lazy(() => import('./games/relaxing/Tangram'));
const DotToDot       = lazy(() => import('./games/relaxing/DotToDot'));
const MandalaDraw    = lazy(() => import('./games/relaxing/MandalaDraw'));
const ChillWordSearch = lazy(() => import('./games/relaxing/ChillWordSearch'));
const ZenMatch3      = lazy(() => import('./games/relaxing/ZenMatch3'));
const Spirograph     = lazy(() => import('./games/relaxing/Spirograph'));
const FractalBloom   = lazy(() => import('./games/relaxing/FractalBloom'));
const LightTrails    = lazy(() => import('./games/relaxing/LightTrails'));
const StainedGlass   = lazy(() => import('./games/relaxing/StainedGlass'));
const Constellation  = lazy(() => import('./games/relaxing/Constellation'));

import SoloGameShell from './games/SoloGameShell';
import { isLoggedIn, isAdmin, isSuperAdmin } from './auth';

function RequireAuth({ check, children }) {
  if (!check()) return <Navigate to="/signin" replace />;
  return children;
}

function GameFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading game…</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App page-wrapper">
        <AppNavbar />
        <main className="main-content">
          <GameErrorBoundary>
          <Suspense fallback={<GameFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/feed/:category_id" element={<Home />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/content-guidelines" element={<ContentGuidelines />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signup/:paymentcanceled" element={<SignUp />} />
              <Route path="/forgotpassword" element={<ForgotPassword />} />
              <Route path="/profile" element={
                <RequireAuth check={isLoggedIn}><Profile /></RequireAuth>
              } />

              {/* ── Games Hub ── */}
              <Route path="/games" element={<Games />} />

              {/* ── Original solo games ── */}
              <Route path="/games/hangman"      element={<SoloGameShell><Hangman /></SoloGameShell>} />
              <Route path="/games/snake"        element={<SoloGameShell><Snake /></SoloGameShell>} />
              <Route path="/games/sudoku"       element={<SoloGameShell><Sudoku /></SoloGameShell>} />
              <Route path="/games/minesweeper"  element={<SoloGameShell><Minesweeper /></SoloGameShell>} />
              <Route path="/games/wordle"       element={<SoloGameShell><Wordle /></SoloGameShell>} />
              <Route path="/games/word-scramble"element={<SoloGameShell><WordScramble /></SoloGameShell>} />
              <Route path="/games/simon"        element={<SoloGameShell><Simon /></SoloGameShell>} />
              <Route path="/games/memory-match" element={<SoloGameShell><MemoryMatch /></SoloGameShell>} />
              <Route path="/games/2048"         element={<SoloGameShell><TwoZeroFourEight /></SoloGameShell>} />
              <Route path="/games/lights-out"   element={<SoloGameShell><LightsOut /></SoloGameShell>} />

              {/* ── New solo strategy games ── */}
              <Route path="/games/kenken"        element={<SoloGameShell><KenKen /></SoloGameShell>} />
              <Route path="/games/kakuro"        element={<SoloGameShell><Kakuro /></SoloGameShell>} />
              <Route path="/games/nonogram"      element={<SoloGameShell><Nonogram /></SoloGameShell>} />
              <Route path="/games/n-queens"      element={<SoloGameShell><NQueens /></SoloGameShell>} />
              <Route path="/games/futoshiki"     element={<SoloGameShell><Futoshiki /></SoloGameShell>} />
              <Route path="/games/binary-puzzle" element={<SoloGameShell><BinaryPuzzle /></SoloGameShell>} />
              <Route path="/games/skyscrapers"   element={<SoloGameShell><Skyscrapers /></SoloGameShell>} />
              <Route path="/games/fifteen-puzzle"element={<SoloGameShell><FifteenPuzzle /></SoloGameShell>} />
              <Route path="/games/towers-hanoi"  element={<SoloGameShell><TowersHanoi /></SoloGameShell>} />
              <Route path="/games/flow-free"     element={<SoloGameShell><FlowFree /></SoloGameShell>} />
              <Route path="/games/cryptogram"    element={<SoloGameShell><Cryptogram /></SoloGameShell>} />
              <Route path="/games/sokoban"       element={<SoloGameShell><Sokoban /></SoloGameShell>} />
              <Route path="/games/hashi"         element={<SoloGameShell><Hashi /></SoloGameShell>} />
              <Route path="/games/nurikabe"      element={<SoloGameShell><Nurikabe /></SoloGameShell>} />
              <Route path="/games/mastermind"    element={<SoloGameShell><Mastermind /></SoloGameShell>} />

              {/* ── Relaxing games ── */}
              <Route path="/games/color-by-number"  element={<SoloGameShell><ColorByNumber /></SoloGameShell>} />
              <Route path="/games/room-designer"    element={<SoloGameShell><RoomDesigner /></SoloGameShell>} />
              <Route path="/games/jigsaw-puzzle"    element={<SoloGameShell><JigsawPuzzle /></SoloGameShell>} />
              <Route path="/games/zen-garden"       element={<SoloGameShell><ZenGarden /></SoloGameShell>} />
              <Route path="/games/bubble-pop"       element={<SoloGameShell><BubblePop /></SoloGameShell>} />
              <Route path="/games/tangram"          element={<SoloGameShell><Tangram /></SoloGameShell>} />
              <Route path="/games/dot-to-dot"       element={<SoloGameShell><DotToDot /></SoloGameShell>} />
              <Route path="/games/mandala-draw"     element={<SoloGameShell><MandalaDraw /></SoloGameShell>} />
              <Route path="/games/word-search-chill"element={<SoloGameShell><ChillWordSearch /></SoloGameShell>} />
              <Route path="/games/zen-match3"       element={<SoloGameShell><ZenMatch3 /></SoloGameShell>} />
              <Route path="/games/spirograph"       element={<SoloGameShell><Spirograph /></SoloGameShell>} />
              <Route path="/games/fractal-bloom"    element={<SoloGameShell><FractalBloom /></SoloGameShell>} />
              <Route path="/games/light-trails"     element={<SoloGameShell><LightTrails /></SoloGameShell>} />
              <Route path="/games/stained-glass"    element={<SoloGameShell><StainedGlass /></SoloGameShell>} />
              <Route path="/games/constellation"    element={<SoloGameShell><Constellation /></SoloGameShell>} />

              {/* ── 1v1 games (lobby → game) ── */}
              <Route path="/games/versus/:gameId" element={<VersusWrapper />} />

              {/* ── Multiplayer games (lobby → game) ── */}
              <Route path="/games/multi/:gameId" element={<MultiWrapper />} />

              {/* ── Auth-gated routes ── */}
              <Route path="/CreateShtick" element={
                <RequireAuth check={isLoggedIn}><CreateShtick /></RequireAuth>
              } />
              <Route path="/admin" element={
                <RequireAuth check={isAdmin}><AdminDashboard /></RequireAuth>
              } />
              <Route path="/superadmin" element={
                <RequireAuth check={isSuperAdmin}><SuperAdminDashboard /></RequireAuth>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </GameErrorBoundary>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
