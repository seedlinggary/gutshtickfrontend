import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

const QUOTE_DATA = {
  easy: [
    { plain: 'BE THE CHANGE YOU WISH TO SEE', author: 'Gandhi', preRevealed: 5 },
    { plain: 'STAY HUNGRY STAY FOOLISH', author: 'Steve Jobs', preRevealed: 5 },
    { plain: 'THE ONLY WAY IS THROUGH', author: 'Robert Frost', preRevealed: 5 },
    { plain: 'ACT AS IF WHAT YOU DO MATTERS', author: 'William James', preRevealed: 5 },
    { plain: 'YOU MISS ALL SHOTS YOU DO NOT TAKE', author: 'Wayne Gretzky', preRevealed: 5 },
  ],
  medium: [
    { plain: 'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY', author: 'Albert Einstein', preRevealed: 3 },
    { plain: 'WELL BEHAVED WOMEN SELDOM MAKE HISTORY', author: 'Laurel Thatcher Ulrich', preRevealed: 3 },
    { plain: 'LIFE IS WHAT HAPPENS WHEN YOU ARE BUSY MAKING PLANS', author: 'John Lennon', preRevealed: 3 },
    { plain: 'TWO ROADS DIVERGED IN A WOOD AND I TOOK THE ONE LESS TRAVELED BY', author: 'Robert Frost', preRevealed: 3 },
    { plain: 'THE GREATEST GLORY IS NOT IN NEVER FALLING BUT IN RISING EACH TIME WE FALL', author: 'Confucius', preRevealed: 3 },
  ],
  hard: [
    { plain: 'IT IS NOT THE STRONGEST SPECIES THAT SURVIVE NOR THE MOST INTELLIGENT BUT THOSE MOST RESPONSIVE TO CHANGE', author: 'Charles Darwin', preRevealed: 1 },
    { plain: 'TWENTY YEARS FROM NOW YOU WILL BE MORE DISAPPOINTED BY THE THINGS YOU DID NOT DO THAN BY THE ONES YOU DID', author: 'Mark Twain', preRevealed: 1 },
    { plain: 'IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE FOR KNOWLEDGE IS LIMITED BUT IMAGINATION ENCIRCLES THE WORLD', author: 'Albert Einstein', preRevealed: 1 },
    { plain: 'SUCCESS IS NOT FINAL FAILURE IS NOT FATAL IT IS THE COURAGE TO CONTINUE THAT COUNTS', author: 'Winston Churchill', preRevealed: 1 },
    { plain: 'THE ONLY LIMIT TO OUR REALIZATION OF TOMORROW WILL BE OUR DOUBTS OF TODAY', author: 'Franklin D Roosevelt', preRevealed: 1 },
  ],
};

// Valid substitution cipher keys — bijections on A-Z with no fixed points (no letter maps to itself).
// Verified: QWERTYUIOPASDFGHJKLZXCVBNM maps A→Q,B→W,C→E,D→R,E→T,F→Y,G→U,H→I,I→O,J→P,K→A,L→S,M→D,N→F,O→G,P→H,Q→J,R→K,S→L,T→Z,U→X,V→C,W→V,X→B,Y→N,Z→M — no fixed points ✓
// (2nd key originally had J→J, a fixed point; positions 8/9 swapped to fix it.)
const CIPHER_KEYS = [
  'QWERTYUIOPASDFGHJKLZXCVBNM',
  'MNBVCXZLJKHGFDSAPOIUYTREWQ',
  'ZYXWVUTSRQPONMLKJIHGFEDCBA',
  'PHQGIUMEAYLNOFDXJKRCVSTZWB',
  'XANTBQZGKFLWHDVMPEYSRUOCIJ',
];

function buildCipherMap(key) {
  const encode = {}, decode = {};
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i);
    const enc = key[i];
    encode[plain] = enc;
    decode[enc] = plain;
  }
  return { encode, decode };
}

function encodeText(plain, encode) {
  return plain.split('').map(ch => (ch >= 'A' && ch <= 'Z') ? encode[ch] : ch).join('');
}

export default function Cryptogram() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [cipher, setCipher] = useState(null);
  const [encodedText, setEncodedText] = useState('');
  const [plainText, setPlainText] = useState('');
  const [author, setAuthor] = useState('');
  // userMapping: encoded letter → guessed plain letter
  const [userMapping, setUserMapping] = useState({});
  // revealedLetters: set of encoded letters that are locked (pre-revealed or hinted)
  const [revealedLetters, setRevealedLetters] = useState(new Set());
  const [selectedEncoded, setSelectedEncoded] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');
  const containerRef = useRef(null);

  const startGame = useCallback((diff, idx = 0) => {
    setDifficulty(diff);
    setQuoteIdx(idx);
    const q = QUOTE_DATA[diff][idx];
    const key = CIPHER_KEYS[idx % CIPHER_KEYS.length];
    const c = buildCipherMap(key);
    setCipher(c);
    const encoded = encodeText(q.plain, c.encode);
    setEncodedText(encoded);
    setPlainText(q.plain);
    setAuthor(q.author);

    // Pre-reveal some letters
    const revealed = new Set();
    const initMapping = {};
    const uniquePlain = [...new Set(q.plain.replace(/[^A-Z]/g, ''))];
    for (let i = 0; i < Math.min(q.preRevealed, uniquePlain.length); i++) {
      const letter = uniquePlain[i];
      const enc = c.encode[letter];
      initMapping[enc] = letter;
      revealed.add(enc);
    }
    setUserMapping(initMapping);
    setRevealedLetters(revealed);
    setSelectedEncoded(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  // All unique encoded letters that appear in the text, sorted
  const uniqueEncoded = cipher
    ? [...new Set(encodedText.replace(/[^A-Z]/g, ''))].sort()
    : [];

  const handleLetterSelect = (enc) => {
    if (won || revealedLetters.has(enc)) return;
    setSelectedEncoded(enc);
    containerRef.current?.focus();
  };

  const applyMapping = (enc, letter, currentMapping, currentRevealed) => {
    // Check if this plain letter is already used for a different encoded letter
    const conflictEnc = Object.entries(currentMapping).find(
      ([e, l]) => l === letter && e !== enc
    );
    // Remove the conflict mapping so bijection holds
    const newMapping = { ...currentMapping };
    if (conflictEnc) {
      delete newMapping[conflictEnc[0]];
    }
    newMapping[enc] = letter;
    setUserMapping(newMapping);

    // Check win: every encoded letter in the text is correctly mapped
    const allCorrect = uniqueEncoded.every(e => {
      const correct = cipher.decode[e];
      return newMapping[e] === correct;
    });
    if (allCorrect) {
      setWon(true);
      const score = 500 - (hintUsed ? 100 : 0);
      setMsg(`Decoded! "${author}" — Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'cryptogram', result: 'win', difficulty, score }, '/game/save');
    }
    return newMapping;
  };

  const handleKeyDown = (e) => {
    if (!selectedEncoded || won) return;
    const key = e.key.toUpperCase();
    if (key >= 'A' && key <= 'Z') {
      e.preventDefault();
      const newMapping = applyMapping(selectedEncoded, key, userMapping, revealedLetters);
      // Auto-advance to next unresolved encoded letter
      const curIdx = uniqueEncoded.indexOf(selectedEncoded);
      for (let offset = 1; offset <= uniqueEncoded.length; offset++) {
        const next = uniqueEncoded[(curIdx + offset) % uniqueEncoded.length];
        if (!revealedLetters.has(next) && newMapping[next] !== cipher?.decode[next]) {
          setSelectedEncoded(next);
          break;
        }
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (revealedLetters.has(selectedEncoded)) return;
      const newMapping = { ...userMapping };
      delete newMapping[selectedEncoded];
      setUserMapping(newMapping);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const idx = uniqueEncoded.indexOf(selectedEncoded);
      const dir = e.shiftKey ? -1 : 1;
      const next = uniqueEncoded[(idx + dir + uniqueEncoded.length) % uniqueEncoded.length];
      setSelectedEncoded(next);
    }
  };

  const handleHint = () => {
    if (hintUsed || !cipher || won) return;
    setHintUsed(true);
    for (const enc of uniqueEncoded) {
      const correct = cipher.decode[enc];
      if (userMapping[enc] !== correct && !revealedLetters.has(enc)) {
        const newMapping = { ...userMapping, [enc]: correct };
        // Remove any conflict
        for (const [e, l] of Object.entries(newMapping)) {
          if (l === correct && e !== enc) delete newMapping[e];
        }
        newMapping[enc] = correct;
        setUserMapping(newMapping);
        const newRevealed = new Set(revealedLetters);
        newRevealed.add(enc);
        setRevealedLetters(newRevealed);
        const allCorrect = uniqueEncoded.every(e => newMapping[e] === cipher.decode[e]);
        if (allCorrect) {
          setWon(true);
          const score = 500 - 100;
          setMsg(`Decoded! "${author}" — Score: ${score}`);
          if (isLoggedIn()) apiRequest('POST', { game_type: 'cryptogram', result: 'win', difficulty, score }, '/game/save');
        } else {
          setMsg(`Hint: encoded letter ${enc} = ${correct}`);
        }
        return;
      }
    }
    setMsg('Hint: all visible letters are correct!');
  };

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Cryptogram</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Decode a famous quote. Each letter is substituted with a different letter.
              Click a coded letter, then type your guess. Tab to advance.
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? 'Short quote, 5 pre-revealed' : d === 'medium' ? 'Medium quote, 3 pre-revealed' : 'Long quote, 1 pre-revealed'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}>
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Cryptogram</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Click a coded letter, then type the plaintext letter. Tab to advance, Backspace to clear.
          {hintUsed && <span className="hint-used" style={{ marginLeft: '1rem' }}>Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : 'info'}`}>{msg}</div>}

        {/* Encoded text display */}
        <div className="gs-card" style={{ padding: '1.5rem', margin: '1rem 0', lineHeight: '3.5' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'flex-end' }}>
            {encodedText.split('').map((ch, i) => {
              if (ch === ' ') return <div key={i} style={{ width: 14 }} />;
              if (!(ch >= 'A' && ch <= 'Z')) {
                return <span key={i} style={{ fontSize: '1rem', alignSelf: 'center' }}>{ch}</span>;
              }
              const guessed = userMapping[ch];
              const correct = cipher?.decode[ch];
              const isRevealed = revealedLetters.has(ch);
              const isSelected = ch === selectedEncoded;
              const isCorrect = guessed && guessed === correct;
              const isWrong = guessed && guessed !== correct;
              return (
                <div key={i} onClick={() => handleLetterSelect(ch)}
                  style={{ textAlign: 'center', cursor: isRevealed ? 'default' : 'pointer', width: 26 }}>
                  <div style={{
                    height: 28, lineHeight: '28px', fontWeight: 'bold', fontSize: '0.95rem',
                    borderBottom: `2px solid ${isSelected ? 'var(--accent)' : isWrong ? 'var(--danger)' : isCorrect ? 'var(--success)' : 'var(--border)'}`,
                    color: isRevealed ? 'var(--muted)' : isWrong ? 'var(--danger)' : isCorrect ? 'var(--success)' : 'var(--text)',
                    backgroundColor: isSelected ? '#00aaff22' : 'transparent',
                  }}>{guessed || ' '}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{ch}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapping panel — all unique encoded letters */}
        <div className="gs-card" style={{ padding: '1rem', margin: '1rem 0' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            All coded letters (click to select):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {uniqueEncoded.map(enc => {
              const guessed = userMapping[enc];
              const correct = cipher?.decode[enc];
              const isRevealed = revealedLetters.has(enc);
              const isSelected = enc === selectedEncoded;
              const isCorrect = guessed && guessed === correct;
              return (
                <div key={enc} onClick={() => handleLetterSelect(enc)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    border: `2px solid ${isSelected ? 'var(--accent)' : isCorrect ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: isRevealed ? 'default' : 'pointer',
                    backgroundColor: isSelected ? '#00aaff22' : isCorrect ? '#00880022' : 'transparent',
                    minWidth: 50, textAlign: 'center',
                  }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>coded</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{enc}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>plain</div>
                  <div style={{
                    fontWeight: 'bold', fontSize: '1rem',
                    color: isRevealed ? 'var(--muted)' : isCorrect ? 'var(--success)' : 'var(--accent)',
                  }}>
                    {guessed || '?'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => startGame(difficulty, (quoteIdx + 1) % QUOTE_DATA[difficulty].length)}>
            Next Quote
          </button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty, quoteIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
