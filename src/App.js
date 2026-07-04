import './App.css';
import Home from './Home';
import About from './About';
import Contact from './Contact';
import NotFound from './NotFound';
import AppNavbar from './Navbar';
import Footer from './Footer';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Disclaimer from './Disclaimer';
import SignIn from './users/SignIn';
import SignUp from './users/SignUp';
import ForgotPassword from './users/ForgotPassword';
import CreateShtick from './shtick/CreateShtick';
import Games from './games/Games';
import Hangman from './games/Hangman';
import Snake from './games/Snake';
import Sudoku from './games/Sudoku';
import Minesweeper from './games/Minesweeper';
import Wordle from './games/Wordle';
import WordScramble from './games/WordScramble';
import Simon from './games/Simon';
import MemoryMatch from './games/MemoryMatch';
import TwoZeroFourEight from './games/TwoZeroFourEight';
import LightsOut from './games/LightsOut';
import AdminDashboard from './admin/AdminDashboard';
import SuperAdminDashboard from './admin/SuperAdminDashboard';
import { isLoggedIn, isAdmin, isSuperAdmin } from './auth';

function RequireAuth({ check, children }) {
  if (!check()) return <Navigate to="/signin" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <div className="App page-wrapper">
        <AppNavbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/feed/:category_id" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signup/:paymentcanceled" element={<SignUp />} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/hangman" element={<Hangman />} />
            <Route path="/games/snake" element={<Snake />} />
            <Route path="/games/sudoku" element={<Sudoku />} />
            <Route path="/games/minesweeper" element={<Minesweeper />} />
            <Route path="/games/wordle" element={<Wordle />} />
            <Route path="/games/word-scramble" element={<WordScramble />} />
            <Route path="/games/simon" element={<Simon />} />
            <Route path="/games/memory-match" element={<MemoryMatch />} />
            <Route path="/games/2048" element={<TwoZeroFourEight />} />
            <Route path="/games/lights-out" element={<LightsOut />} />
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
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
