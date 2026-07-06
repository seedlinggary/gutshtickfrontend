import React, { useState, useEffect, useCallback } from 'react';

const WORD_LIST = [
  'apple','bank','bark','bat','berry','bill','block','board','boot','bottle','bow','box','bridge','brush',
  'bug','button','can','cap','car','card','cast','cat','chair','chest','chip','clock','cloud','club','coat',
  'coin','colt','crane','crown','crystal','dance','dart','date','deck','dog','door','dove','draft','dream',
  'drill','drop','drum','duck','eagle','earth','egg','face','fan','film','fish','flag','flame','flash',
  'fly','foam','fork','fox','frame','gear','gem','ghost','glass','globe','glove','gold','grape','grass',
  'grip','guard','hammer','hand','harp','hat','head','heart','heel','horn','horse','ice','iron','jet',
  'key','king','kite','knife','lamp','lark','laser','leaf','link','lion','lock','log','loom','march',
  'mark','match','mint','mirror','moon','mouse','nail','needle','net','night','note','oak','olive','orbit',
  'oven','page','palm','pan','paper','park','pass','path','pearl','pen','pick','pine','pipe','pit','plane',
  'plant','plate','plow','plug','point','pool','port','pot','press','print','pump','purse','queen','race',
  'rail','range','raven','razor','reed','reef','ring','road','rock','rod','root','rose','row','ruby',
  'rule','rust','sail','sand','saw','scale','school','screen','seal','seed','shade','shark','sheep','shelf',
  'shell','ship','shoe','shop','shot','silo','silk','sink','skip','slate','slip','slot','snow','soil',
  'spark','spike','spin','spool','spring','square','staff','star','stem','step','sting','stock','stone',
  'storm','straw','stream','stripe','stub','swing','sword','table','tank','tape','target','thorn','thread',
  'tide','tile','tin','tip','toast','torch','track','trap','tray','tree','triangle','trick','trunk','tube',
  'tunnel','twig','twist','valve','vane','vault','vine','wave','web','well','wheel','whip','wing','wire',
  'wolf','wood','wool','yard','yoke','zone',
];

const CLUE_BANK = [
  { clue: 'animal', words: ['bat', 'cat', 'dog', 'duck', 'eagle', 'fish', 'fox', 'horse', 'lion', 'mouse', 'owl', 'raven', 'seal', 'shark', 'sheep', 'wolf'] },
  { clue: 'metal', words: ['gold', 'iron', 'nail', 'pin', 'ruby', 'rust', 'silver', 'steel', 'tin', 'wire'] },
  { clue: 'water', words: ['brook', 'cloud', 'drop', 'foam', 'ice', 'lake', 'reef', 'stream', 'tide', 'wave', 'well'] },
  { clue: 'sharp', words: ['dart', 'knife', 'needle', 'razor', 'spike', 'sword', 'thorn'] },
  { clue: 'round', words: ['ball', 'bubble', 'coin', 'globe', 'hoop', 'moon', 'ring', 'wheel'] },
  { clue: 'plant', words: ['apple', 'berry', 'grass', 'leaf', 'oak', 'olive', 'pine', 'rose', 'root', 'seed', 'stem', 'twig', 'vine'] },
  { clue: 'tool', words: ['drill', 'fork', 'hammer', 'pick', 'pump', 'rake', 'saw', 'shovel', 'wrench'] },
  { clue: 'clothing', words: ['boot', 'cap', 'coat', 'hat', 'shoe', 'glove', 'ring', 'silk'] },
  { clue: 'fire', words: ['ash', 'coal', 'flame', 'glow', 'smoke', 'spark', 'torch'] },
  { clue: 'sky', words: ['cloud', 'comet', 'moon', 'orbit', 'star', 'sun', 'wing'] },
  { clue: 'building', words: ['arch', 'block', 'bridge', 'door', 'gate', 'pillar', 'room', 'roof', 'step', 'tower', 'wall', 'window'] },
  { clue: 'game', words: ['bat', 'board', 'card', 'chip', 'club', 'dart', 'deck', 'dice', 'net', 'pin', 'rack', 'ring', 'rock'] },
  { clue: 'royal', words: ['crown', 'gem', 'gold', 'king', 'pearl', 'queen', 'ruby', 'scepter', 'throne'] },
  { clue: 'music', words: ['drum', 'harp', 'horn', 'lute', 'note', 'pipe', 'reed', 'string', 'tune'] },
  { clue: 'travel', words: ['boat', 'bus', 'car', 'jet', 'map', 'pack', 'path', 'rail', 'road', 'ship', 'track', 'train'] },
];

function pickWords() {
  const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 25);
}

function assignCards(words) {
  const indices = [...Array(25).keys()].sort(() => Math.random() - 0.5);
  const types = Array(25).fill('bystander');
  for (let i = 0; i < 9; i++) types[indices[i]] = 'red';
  for (let i = 9; i < 17; i++) types[indices[i]] = 'blue';
  types[indices[17]] = 'assassin';
  return words.map((w, i) => ({ word: w, type: types[i], revealed: false }));
}

function botSpymasterClue(cards, team) {
  const myWords = cards.filter(c => c.type === team && !c.revealed).map(c => c.word.toLowerCase());
  let bestClue = null, bestCount = 0, bestWords = [];
  for (const entry of CLUE_BANK) {
    const matching = entry.words.filter(w => myWords.includes(w));
    if (matching.length > bestCount) {
      bestCount = matching.length;
      bestClue = entry.clue;
      bestWords = matching;
    }
  }
  if (!bestClue) {
    bestClue = 'thing';
    bestCount = 1;
  }
  return { clue: bestClue, count: Math.min(bestCount, 3) };
}

function botGuesserPick(cards, clue, team, difficulty) {
  const unrevealed = cards.filter(c => !c.revealed);
  if (difficulty === 'easy') {
    return unrevealed[Math.floor(Math.random() * unrevealed.length)];
  }
  // medium: check if any word relates to clue in clue bank
  const clueEntry = CLUE_BANK.find(e => e.clue.toLowerCase() === clue.toLowerCase());
  if (clueEntry) {
    const related = unrevealed.filter(c => clueEntry.words.includes(c.word.toLowerCase()));
    if (related.length > 0) return related[0];
  }
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}

export default function Codenames({ players, onBack }) {
  const [cards, setCards] = useState([]);
  const [phase, setPhase] = useState('setup'); // setup, redSpymaster, redGuessing, blueSpymaster, blueGuessing, gameOver
  const [clue, setClue] = useState('');
  const [clueCount, setClueCount] = useState(1);
  const [currentClue, setCurrentClue] = useState(null);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [redScore, setRedScore] = useState(9);
  const [blueScore, setBlueScore] = useState(8);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState('');
  const [clueInput, setClueInput] = useState('');
  const [clueCountInput, setClueCountInput] = useState(1);

  // Assign teams: 2 per team (spymaster, guesser), or bots fill roles
  // Red team = players 0,1; Blue team = players 2,3 (or less)
  const redSpymaster = players[0];
  const redGuesser = players[Math.min(1, players.length - 1)];
  const blueSpymaster = players[Math.min(2, players.length - 1)];
  const blueGuesser = players[Math.min(3, players.length - 1)];

  useEffect(() => {
    const words = pickWords();
    const newCards = assignCards(words);
    setCards(newCards);
    setPhase('redSpymaster');
    setRedScore(9);
    setBlueScore(8);
    setMessage('Red team: give a clue!');
  }, []);

  const giveClue = useCallback((c, count) => {
    // Clamp to a sane non-negative number: the clue-count <input> has no hard
    // min enforced while typing, and a 0-or-negative value here would leave
    // guessesLeft <= 0, permanently stalling a bot guesser (its effect only
    // fires when guessesLeft > 0).
    const safeCount = Math.max(0, Math.floor(Number(count)) || 0);
    setCurrentClue({ clue: c, count: safeCount });
    setGuessesLeft(safeCount + 1);
    if (phase === 'redSpymaster') { setPhase('redGuessing'); setMessage(`Red: guess up to ${count + 1} words for "${c}"`); }
    else { setPhase('blueGuessing'); setMessage(`Blue: guess up to ${count + 1} words for "${c}"`); }
  }, [phase]);

  // Bot spymaster
  useEffect(() => {
    if (phase === 'redSpymaster' && redSpymaster?.isBot) {
      setTimeout(() => {
        const { clue: c, count } = botSpymasterClue(cards, 'red');
        giveClue(c, count);
      }, 700);
    }
    if (phase === 'blueSpymaster' && blueSpymaster?.isBot) {
      setTimeout(() => {
        const { clue: c, count } = botSpymasterClue(cards, 'blue');
        giveClue(c, count);
      }, 700);
    }
  }, [phase]); // eslint-disable-line

  // Bot guesser
  useEffect(() => {
    if (phase === 'redGuessing' && redGuesser?.isBot && guessesLeft > 0) {
      setTimeout(() => {
        const pick = botGuesserPick(cards, currentClue?.clue, 'red', redGuesser.botDifficulty);
        if (pick) handleGuess(pick.word);
      }, 700);
    }
    if (phase === 'blueGuessing' && blueGuesser?.isBot && guessesLeft > 0) {
      setTimeout(() => {
        const pick = botGuesserPick(cards, currentClue?.clue, 'blue', blueGuesser.botDifficulty);
        if (pick) handleGuess(pick.word);
      }, 700);
    }
  }, [phase, guessesLeft]); // eslint-disable-line

  const handleGuess = useCallback((word) => {
    const cardIdx = cards.findIndex(c => c.word === word && !c.revealed);
    if (cardIdx === -1) return;
    const card = cards[cardIdx];
    const newCards = cards.map((c, i) => i === cardIdx ? { ...c, revealed: true } : c);
    setCards(newCards);
    const isRed = phase === 'redGuessing';
    const myTeam = isRed ? 'red' : 'blue';
    const oppTeam = isRed ? 'blue' : 'red';

    if (card.type === 'assassin') {
      setWinner(isRed ? 'Blue' : 'Red');
      setPhase('gameOver');
      setMessage(`${isRed ? 'Red' : 'Blue'} hit the assassin! ${isRed ? 'Blue' : 'Red'} wins!`);
      return;
    }
    if (card.type === myTeam) {
      const newScore = isRed ? redScore - 1 : blueScore - 1;
      if (isRed) setRedScore(newScore);
      else setBlueScore(newScore);
      if (newScore === 0) {
        setWinner(isRed ? 'Red' : 'Blue');
        setPhase('gameOver');
        setMessage(`${isRed ? 'Red' : 'Blue'} wins!`);
        return;
      }
      const newGuesses = guessesLeft - 1;
      setGuessesLeft(newGuesses);
      if (newGuesses <= 0) {
        setPhase(isRed ? 'blueSpymaster' : 'redSpymaster');
        setMessage(isRed ? 'Blue team: give a clue!' : 'Red team: give a clue!');
      } else {
        setMessage(`Correct! ${newGuesses} guesses remaining for "${currentClue?.clue}"`);
      }
    } else {
      // wrong card
      if (card.type === oppTeam) {
        const newScore = isRed ? blueScore - 1 : redScore - 1;
        if (isRed) setBlueScore(newScore);
        else setRedScore(newScore);
        if (newScore === 0) {
          setWinner(isRed ? 'Blue' : 'Red');
          setPhase('gameOver');
          setMessage(`${isRed ? 'Blue' : 'Red'} wins!`);
          return;
        }
      }
      setPhase(isRed ? 'blueSpymaster' : 'redSpymaster');
      setMessage(`Wrong! Turn passes to ${isRed ? 'Blue' : 'Red'} team.`);
    }
  }, [cards, phase, guessesLeft, currentClue, redScore, blueScore]);

  const teamColor = phase.includes('red') ? '#e74c3c' : '#3498db';
  const isSpymasterTurn = phase === 'redSpymaster' || phase === 'blueSpymaster';
  const isGuesserTurn = phase === 'redGuessing' || phase === 'blueGuessing';
  const currentTeam = phase.includes('red') ? 'red' : 'blue';
  const showSpymasterView = (phase === 'redSpymaster' && !redSpymaster?.isBot) ||
    (phase === 'blueSpymaster' && !blueSpymaster?.isBot);
  const isHumanGuesserTurn = (phase === 'redGuessing' && !redGuesser?.isBot) ||
    (phase === 'blueGuessing' && !blueGuesser?.isBot);

  const CARD_COLORS = {
    red: '#c0392b',
    blue: '#2980b9',
    bystander: '#8e8e6e',
    assassin: '#1a1a1a',
  };

  return (
    <div style={cd.container}>
      <div style={cd.header}>
        <button style={cd.backBtn} onClick={onBack}>← Back</button>
        <h2 style={cd.title}>Codenames</h2>
        <div style={cd.scores}>
          <span style={{ color: '#e74c3c' }}>Red: {redScore} left</span>
          <span style={{ color: '#3498db', marginLeft: 12 }}>Blue: {blueScore} left</span>
        </div>
      </div>

      <div style={{ ...cd.messageBar, borderColor: teamColor }}>{message}</div>

      {phase !== 'gameOver' && (
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, color: '#bdc3c7' }}>
          {isSpymasterTurn && `${currentTeam.toUpperCase()} SPYMASTER — Give a clue`}
          {isGuesserTurn && currentClue && `Clue: "${currentClue.clue}" (${currentClue.count}) — ${guessesLeft} guesses left`}
        </div>
      )}

      {/* Grid */}
      <div style={cd.grid}>
        {cards.map((card, i) => {
          const revealed = card.revealed;
          const bg = revealed ? CARD_COLORS[card.type] : (showSpymasterView ? CARD_COLORS[card.type] + '88' : '#2c3e50');
          const clickable = isGuesserTurn && !revealed && isHumanGuesserTurn;
          return (
            <div key={i}
              style={{
                ...cd.card,
                background: bg,
                cursor: clickable ? 'pointer' : 'default',
                opacity: revealed ? 0.65 : 1,
                border: revealed ? 'none' : (showSpymasterView ? `2px solid ${CARD_COLORS[card.type]}` : '2px solid #34495e'),
                color: (card.type === 'bystander' || card.type === 'assassin') && !revealed ? '#ecf0f1' : '#fff',
              }}
              onClick={() => clickable && handleGuess(card.word)}
            >
              <span style={{ fontSize: 'clamp(8px, 2.6vw, 11px)', fontWeight: 'bold', textTransform: 'uppercase', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.15 }}>{card.word}</span>
              {showSpymasterView && !revealed && (
                <span style={{ fontSize: 8, display: 'block', color: '#fff', marginTop: 2 }}>
                  {card.type.toUpperCase()}
                </span>
              )}
              {card.type === 'assassin' && revealed && <span style={{ fontSize: 10 }}>☠</span>}
            </div>
          );
        })}
      </div>

      {/* Spymaster input */}
      {isSpymasterTurn && !((phase === 'redSpymaster' && redSpymaster?.isBot) || (phase === 'blueSpymaster' && blueSpymaster?.isBot)) && (
        <div style={cd.clueInput}>
          <input style={cd.input} placeholder="Clue word..." value={clueInput}
            onChange={e => setClueInput(e.target.value)} />
          <input type="number" min={1} max={9} value={clueCountInput}
            onChange={e => setClueCountInput(+e.target.value)}
            style={{ ...cd.input, width: 60 }} />
          <button style={cd.btn} onClick={() => { if (clueInput.trim()) { giveClue(clueInput.trim(), clueCountInput); setClueInput(''); } }}>
            Give Clue
          </button>
        </div>
      )}

      {isGuesserTurn && isHumanGuesserTurn && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button style={{ ...cd.btn, background: '#7f8c8d' }} onClick={() => {
            setPhase(phase === 'redGuessing' ? 'blueSpymaster' : 'redSpymaster');
            setMessage(`Turn passes to ${phase === 'redGuessing' ? 'Blue' : 'Red'} team.`);
          }}>Pass / End Guessing</button>
        </div>
      )}

      {phase === 'gameOver' && (
        <div style={cd.gameOver}>
          <h3 style={{ color: '#f39c12' }}>{message}</h3>
          <button style={cd.btn} onClick={() => window.location.reload()}>Play Again</button>
          <button style={{ ...cd.btn, background: '#7f8c8d' }} onClick={onBack}>Back</button>
        </div>
      )}
    </div>
  );
}

const cd = {
  container: { background: '#1a2634', minHeight: '100vh', padding: 12, color: '#ecf0f1', fontFamily: 'Arial, sans-serif', overflowX: 'hidden', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 22, color: '#f39c12', flex: 1 },
  backBtn: { background: '#7f8c8d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minHeight: 40, boxSizing: 'border-box' },
  scores: { display: 'flex', gap: 4, fontWeight: 'bold', fontSize: 14, flexWrap: 'wrap' },
  messageBar: { background: '#2c3e50', border: '2px solid #f39c12', borderRadius: 8, padding: '8px 16px', marginBottom: 10, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'clamp(3px, 1.5vw, 6px)', marginBottom: 12 },
  card: { borderRadius: 6, padding: 'clamp(6px, 2vw, 10px) 2px', textAlign: 'center', minHeight: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s, transform 0.1s', overflow: 'hidden' },
  clueInput: { display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  input: { background: '#2c3e50', color: '#ecf0f1', border: '1px solid #34495e', borderRadius: 6, padding: '10px 12px', fontSize: 16, minHeight: 42, boxSizing: 'border-box' },
  btn: { background: '#e67e22', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, minHeight: 42, boxSizing: 'border-box' },
  gameOver: { textAlign: 'center', marginTop: 24 },
};
