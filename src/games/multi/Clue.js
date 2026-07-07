import React, { useState, useEffect, useCallback } from 'react';
import HowToPlay from '../HowToPlay';

const SUSPECTS = ['Miss Scarlett','Colonel Mustard','Mrs. White','Mr. Green','Mrs. Peacock','Professor Plum'];
const WEAPONS = ['Candlestick','Knife','Lead Pipe','Revolver','Rope','Wrench'];
const ROOMS = ['Kitchen','Ballroom','Conservatory','Billiard Room','Library','Study','Hall','Lounge','Dining Room'];
const SUSPECT_COLORS = {'Miss Scarlett':'#e74c3c','Colonel Mustard':'#f39c12','Mrs. White':'#ecf0f1','Mr. Green':'#27ae60','Mrs. Peacock':'#3498db','Professor Plum':'#9b59b6'};

// Simple room grid layout (9 rooms, displayed as 3×3)
const ROOM_GRID = [
  ['Kitchen','Ballroom','Conservatory'],
  ['Dining Room','Billiard Room','Library'],
  ['Lounge','Hall','Study'],
];

// Adjacency for rooms (can move to adjacent in grid)
function getAdjacentRooms(room) {
  for(let r=0;r<3;r++){
    for(let c=0;c<3;c++){
      if(ROOM_GRID[r][c]===room){
        const adj=[];
        if(r>0) adj.push(ROOM_GRID[r-1][c]);
        if(r<2) adj.push(ROOM_GRID[r+1][c]);
        if(c>0) adj.push(ROOM_GRID[r][c-1]);
        if(c<2) adj.push(ROOM_GRID[r][c+1]);
        return adj;
      }
    }
  }
  return ROOMS.filter(ro=>ro!==room);
}

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function dealCards(players) {
  const allCards=[...SUSPECTS,...WEAPONS,...ROOMS];
  const shuffled=shuffle(allCards);
  // Pick one of each type as the secret
  const secret={
    suspect: SUSPECTS[Math.floor(Math.random()*SUSPECTS.length)],
    weapon: WEAPONS[Math.floor(Math.random()*WEAPONS.length)],
    room: ROOMS[Math.floor(Math.random()*ROOMS.length)],
  };
  const remaining=shuffled.filter(c=>c!==secret.suspect&&c!==secret.weapon&&c!==secret.room);
  const hands=players.map(()=>[]);
  remaining.forEach((card,i)=>{ hands[i%players.length].push(card); });
  return {secret, hands};
}

function initNotepad(players){
  const notepad={};
  [...SUSPECTS,...WEAPONS,...ROOMS].forEach(card=>{
    notepad[card]={status:'?', shownBy:{}}; // status: '?','no','yes', shownBy: {playerIdx: true}
  });
  return notepad;
}

export default function Clue({ players, onBack }) {
  const n=players.length>=3?players.length:3;
  const gamePlayers=players.slice(0,n);
  while(gamePlayers.length<n) gamePlayers.push({name:`Bot ${gamePlayers.length+1}`,isBot:true,botDifficulty:'easy'});

  const [{secret,hands}]=useState(()=>dealCards(gamePlayers));
  const [positions,setPositions]=useState(()=>gamePlayers.map((_,i)=>ROOMS[i%ROOMS.length]));
  const [notepads,setNotepads]=useState(()=>gamePlayers.map(()=>initNotepad(gamePlayers)));
  const [currentPlayer,setCurrentPlayer]=useState(0);
  const [phase,setPhase]=useState('move'); // move, suggest, show, accuse, end
  const [suggestion,setSuggestion]=useState({suspect:SUSPECTS[0],weapon:WEAPONS[0],room:''});
  const [suggestionResult,setSuggestionResult]=useState(null);
  const [showIdx,setShowIdx]=useState(null); // who is currently showing a card
  const [cardToShow,setCardToShow]=useState(null);
  const [eliminated,setEliminated]=useState(()=>gamePlayers.map(()=>false));
  const [winner,setWinner]=useState(null);
  const [accusation,setAccusation]=useState({suspect:SUSPECTS[0],weapon:WEAPONS[0],room:ROOMS[0]});
  const [accusingMode,setAccusingMode]=useState(false);
  const [log,setLog]=useState([]);
  const [moveTarget,setMoveTarget]=useState('');

  const addLog=(msg)=>setLog(prev=>[...prev.slice(-8),msg]);

  // Bot turn logic
  useEffect(()=>{
    if(phase==='end') return;
    if(phase==='move'){
      if(!gamePlayers[currentPlayer]?.isBot) return;
      setTimeout(()=>{
        const adj=getAdjacentRooms(positions[currentPlayer]);
        const picked=adj[Math.floor(Math.random()*adj.length)];
        doMove(picked);
      },700);
    } else if(phase==='suggest'){
      if(!gamePlayers[currentPlayer]?.isBot) return;
      setTimeout(()=>{
        // Bot suggests based on notepad: pick unknown cards
        const np=notepads[currentPlayer];
        const unknownSuspects=SUSPECTS.filter(s=>np[s].status==='?');
        const unknownWeapons=WEAPONS.filter(w=>np[w].status==='?');
        const s=unknownSuspects.length>0?unknownSuspects[Math.floor(Math.random()*unknownSuspects.length)]:SUSPECTS[0];
        const w=unknownWeapons.length>0?unknownWeapons[Math.floor(Math.random()*unknownWeapons.length)]:WEAPONS[0];
        const r=positions[currentPlayer];
        doSuggest({suspect:s,weapon:w,room:r});
      },700);
    } else if(phase==='show'){
      // The decision-maker is whoever is being asked to disprove (showIdx),
      // not the suggester (currentPlayer) — bot-status must be checked on showIdx.
      if(showIdx==null||!gamePlayers[showIdx]?.isBot) return;
      setTimeout(()=>{
        const {suspect,weapon,room}=suggestion;
        const myHand=hands[showIdx];
        const matching=myHand.filter(c=>c===suspect||c===weapon||c===room);
        if(matching.length>0){
          const card=matching[Math.floor(Math.random()*matching.length)];
          doShow(card);
        } else {
          doShow(null);
        }
      },700);
    }
  },[phase,currentPlayer,showIdx]); // eslint-disable-line

  // Bot auto-continue after showResult
  useEffect(()=>{
    if(phase!=='showResult') return;
    if(!gamePlayers[currentPlayer]?.isBot) return;
    const t=setTimeout(continueAfterShow,700);
    return ()=>clearTimeout(t);
  },[phase,currentPlayer]); // eslint-disable-line

  function doMove(room){
    const newPositions=[...positions];
    newPositions[currentPlayer]=room;
    setPositions(newPositions);
    setSuggestion(s=>({...s,room}));
    setMoveTarget('');
    setPhase('suggest');
    addLog(`${gamePlayers[currentPlayer].name} moved to ${room}`);
  }

  function doSuggest(sugg){
    setSuggestion(sugg);
    addLog(`${gamePlayers[currentPlayer].name} suggests: ${sugg.suspect} with ${sugg.weapon} in ${sugg.room}`);
    // Find next player who might have a card
    const nextShower=(currentPlayer+1)%n;
    setShowIdx(nextShower);
    setSuggestionResult(null);
    setCardToShow(null);
    setPhase('show');
  }

  function doShow(card){
    if(card){
      // update notepads
      const newNotepads=notepads.map((np,i)=>{
        if(i===currentPlayer){
          return {...np,[card]:{...np[card],status:'no',shownBy:{...np[card].shownBy,[showIdx]:true}}};
        }
        return np;
      });
      setNotepads(newNotepads);
      setSuggestionResult({shownBy:showIdx,card:card});
      addLog(`${gamePlayers[showIdx].name} shows a card to ${gamePlayers[currentPlayer].name}`);
      // Update all other bots' notepads to know this player has at least one of these cards
      setPhase('showResult');
    } else {
      // This player can't show — move to next
      const nextShower=(showIdx+1)%n;
      if(nextShower===currentPlayer){
        // no one could show
        addLog('No one could show a card!');
        setSuggestionResult({shownBy:null,card:null});
        setPhase('showResult');
      } else {
        setShowIdx(nextShower);
        if(gamePlayers[nextShower]?.isBot){
          setTimeout(()=>{
            const {suspect,weapon,room}=suggestion;
            const myHand=hands[nextShower];
            const matching=myHand.filter(c=>c===suspect||c===weapon||c===room);
            if(matching.length>0){
              const card2=matching[Math.floor(Math.random()*matching.length)];
              doShow(card2);
            } else {
              doShow(null);
            }
          },700);
        }
      }
    }
  }

  function continueAfterShow(){
    setPhase('move');
    // Advance player
    let next=(currentPlayer+1)%n;
    while(eliminated[next]&&next!==currentPlayer) next=(next+1)%n;
    setCurrentPlayer(next);
    setSuggestionResult(null);
    setShowIdx(null);
    setCardToShow(null);
  }

  function doAccuse(acc){
    if(acc.suspect===secret.suspect&&acc.weapon===secret.weapon&&acc.room===secret.room){
      setWinner(currentPlayer);
      setPhase('end');
      addLog(`${gamePlayers[currentPlayer].name} correctly accuses and wins!`);
    } else {
      const newElim=[...eliminated]; newElim[currentPlayer]=true;
      setEliminated(newElim);
      addLog(`${gamePlayers[currentPlayer].name} incorrectly accuses and is eliminated!`);
      setAccusingMode(false);
      // Check if only 1 left
      const remaining=newElim.filter(e=>!e).length;
      if(remaining<=1){
        const lastPlayer=newElim.findIndex(e=>!e);
        setWinner(lastPlayer>=0?lastPlayer:-1);
        setPhase('end');
        return;
      }
      let next=(currentPlayer+1)%n;
      while(newElim[next]) next=(next+1)%n;
      setCurrentPlayer(next);
      setPhase('move');
    }
  }

  if(phase==='end'){
    return(
      <div style={CL.container}>
        <h2 style={CL.title}>Clue — Game Over!</h2>
        {winner>=0&&winner<n&&<h3 style={{color:'#f39c12'}}>{gamePlayers[winner].name} wins!</h3>}
        <div style={{background:'#2c3e50',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{color:'#e74c3c',fontWeight:'bold',marginBottom:4}}>The Answer:</div>
          <div>Suspect: {secret.suspect}</div>
          <div>Weapon: {secret.weapon}</div>
          <div>Room: {secret.room}</div>
        </div>
        <button style={CL.btn} onClick={onBack}>Back</button>
      </div>
    );
  }

  // Whoever is actively deciding right now should see their own hand/notepad —
  // that's the suggester during move/suggest, or the player being asked to
  // disprove during the show phase. (Previously hardcoded to player 0, which
  // leaked player 0's hand to everyone and never showed other players their own.)
  const viewerIdx=(phase==='show'&&showIdx!=null)?showIdx:currentPlayer;
  const myHand=hands[viewerIdx]||[];
  const myNotepad=notepads[viewerIdx]||{};

  return(
    <div style={CL.container}>
      <div style={CL.header}>
        <button style={CL.backBtn} onClick={onBack}>← Back</button>
        <h2 style={CL.title}>Clue</h2>
        <div style={{fontSize:13,color:'#bdc3c7'}}>
          {gamePlayers[currentPlayer].name}'s turn — {phase.toUpperCase()}
        </div>
      </div>

      <HowToPlay>
        <p>Be the first to correctly name the secret Suspect, Weapon, and Room in a final Accusation. An incorrect accusation eliminates you from winning (though you keep playing to disprove others' suggestions).</p>
        <p><strong>Turns:</strong> Rotates among 3+ players (bots fill any empty seats up to the 3-player minimum). This build shows only the hand and detective notepad of whoever is actively deciding right now — the player moving/suggesting, or whoever is currently being asked to disprove a suggestion — so hidden card information is correctly kept between players sharing the device.</p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>On your turn, move to an adjacent room, then make a Suggestion naming a suspect and weapon (the room is automatically wherever you just moved).</li>
          <li>Starting with the next player, whoever can disprove your suggestion privately shows you one matching card (their choice which one, if they have more than one match).</li>
          <li>Use your notepad to track which suspects/weapons/rooms have been ruled out (✗) as you learn them from suggestions.</li>
          <li>When you're confident you know all three solution cards, make a final Accusation instead of a suggestion — get it exactly right to win immediately.</li>
        </ul>
        <p><strong>Play:</strong> Tap a highlighted adjacent room on the 3×3 room grid to move there. Use the Suspect/Weapon dropdowns and tap "Suggest" to make a suggestion, or tap "Make Accusation" to open the final accusation form (pick Suspect/Weapon/Room, then tap "Accuse!"). When asked to disprove someone else's suggestion, tap one of your matching cards to show it, or "Can't Show" if you have none.</p>
      </HowToPlay>

      {/* Room grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
        {ROOM_GRID.map((row,ri)=>row.map((room,ci)=>{
          const occupants=positions.map((r,pi)=>r===room?gamePlayers[pi]:null).filter(Boolean);
          const isAdj=getAdjacentRooms(positions[currentPlayer]).includes(room);
          const canMove=phase==='move'&&!gamePlayers[currentPlayer]?.isBot&&isAdj;
          return(
            <div key={room} style={{...CL.room,cursor:canMove?'pointer':'default',border:canMove?'2px solid #f39c12':'2px solid #34495e',background:positions[currentPlayer]===room?'#1a5276':'#2c3e50'}}
              onClick={()=>canMove&&doMove(room)}>
              <div style={{fontSize:11,fontWeight:'bold',marginBottom:4}}>{room}</div>
              <div style={{display:'flex',gap:2,flexWrap:'wrap',justifyContent:'center'}}>
                {occupants.map(p=>(
                  <div key={p.name} style={{width:12,height:12,borderRadius:'50%',background:SUSPECT_COLORS[SUSPECTS[gamePlayers.indexOf(p)%SUSPECTS.length]]||'#ccc',border:'1px solid #fff'}} title={p.name}/>
                ))}
              </div>
            </div>
          );
        }))}
      </div>

      {/* Current player info */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
        {gamePlayers.map((p,i)=>(
          <div key={i} style={{...CL.playerChip,border:i===currentPlayer?'2px solid #f39c12':'2px solid #555',opacity:eliminated[i]?0.4:1}}>
            <span style={{color:SUSPECT_COLORS[SUSPECTS[i%SUSPECTS.length]]||'#ccc'}}>●</span> {p.name}
            {eliminated[i]&&' (out)'}
          </div>
        ))}
      </div>

      {/* Phase-specific UI */}
      {phase==='suggest'&&!gamePlayers[currentPlayer]?.isBot&&(
        <div style={CL.panel}>
          <h3 style={{marginTop:0}}>Make a Suggestion</h3>
          <p style={{color:'#bdc3c7',fontSize:12}}>You are in: <strong>{positions[currentPlayer]}</strong></p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <div>
              <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Suspect:</div>
              <select style={CL.sel} value={suggestion.suspect} onChange={e=>setSuggestion(s=>({...s,suspect:e.target.value}))}>
                {SUSPECTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Weapon:</div>
              <select style={CL.sel} value={suggestion.weapon} onChange={e=>setSuggestion(s=>({...s,weapon:e.target.value}))}>
                {WEAPONS.map(w=><option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <button style={CL.btn} onClick={()=>doSuggest({...suggestion,room:positions[currentPlayer]})}>Suggest</button>
          <button style={{...CL.btn,background:'#e74c3c',marginLeft:8}} onClick={()=>setAccusingMode(true)}>Make Accusation</button>
        </div>
      )}

      {accusingMode&&(
        <div style={CL.panel}>
          <h3 style={{marginTop:0,color:'#e74c3c'}}>Final Accusation</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <div>
              <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Suspect:</div>
              <select style={CL.sel} value={accusation.suspect} onChange={e=>setAccusation(a=>({...a,suspect:e.target.value}))}>
                {SUSPECTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Weapon:</div>
              <select style={CL.sel} value={accusation.weapon} onChange={e=>setAccusation(a=>({...a,weapon:e.target.value}))}>
                {WEAPONS.map(w=><option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Room:</div>
              <select style={CL.sel} value={accusation.room} onChange={e=>setAccusation(a=>({...a,room:e.target.value}))}>
                {ROOMS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button style={{...CL.btn,background:'#e74c3c'}} onClick={()=>{doAccuse(accusation);setAccusingMode(false);}}>Accuse!</button>
          <button style={{...CL.btn,background:'#7f8c8d',marginLeft:8}} onClick={()=>setAccusingMode(false)}>Cancel</button>
        </div>
      )}

      {phase==='show'&&showIdx!==null&&!gamePlayers[showIdx]?.isBot&&(
        <div style={CL.panel}>
          <h3 style={{marginTop:0}}>{gamePlayers[showIdx].name}: show a card?</h3>
          <p style={{color:'#bdc3c7',fontSize:12}}>
            Suggestion: {suggestion.suspect} | {suggestion.weapon} | {suggestion.room}
          </p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {hands[showIdx]?.filter(c=>c===suggestion.suspect||c===suggestion.weapon||c===suggestion.room).map(card=>(
              <button key={card} style={CL.btn} onClick={()=>doShow(card)}>{card}</button>
            ))}
            {!hands[showIdx]?.some(c=>c===suggestion.suspect||c===suggestion.weapon||c===suggestion.room)&&(
              <button style={{...CL.btn,background:'#7f8c8d'}} onClick={()=>doShow(null)}>Can't Show</button>
            )}
          </div>
        </div>
      )}

      {phase==='show'&&gamePlayers[showIdx]?.isBot&&(
        <div style={CL.panel}>
          <p style={{color:'#bdc3c7'}}>{gamePlayers[showIdx].name} is deciding...</p>
        </div>
      )}

      {phase==='showResult'&&(
        <div style={CL.panel}>
          {suggestionResult?.shownBy!=null?(
            <p>{gamePlayers[suggestionResult.shownBy].name} showed a card to {gamePlayers[currentPlayer].name}: {suggestionResult.card}.</p>
          ):(
            <p>No one could show a card!</p>
          )}
          {!gamePlayers[currentPlayer]?.isBot&&(
            <button style={CL.btn} onClick={continueAfterShow}>Continue</button>
          )}
          {gamePlayers[currentPlayer]?.isBot&&(
            <div style={{color:'#bdc3c7',fontSize:12}}>Continuing...</div>
          )}
        </div>
      )}

      {/* My hand */}
      <div style={CL.panel}>
        <div style={{fontWeight:'bold',marginBottom:6,fontSize:13}}>Your Hand ({myHand.length} cards):</div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {myHand.map((card,i)=>(
            <div key={i} style={CL.cardChip}>{card}</div>
          ))}
        </div>
      </div>

      {/* Notepad */}
      <div style={CL.notepad}>
        <div style={{fontWeight:'bold',fontSize:13,marginBottom:6}}>Detective Notepad</div>
        <div style={{display:'flex',gap:12,overflowX:'auto'}}>
          {[{label:'Suspects',items:SUSPECTS},{label:'Weapons',items:WEAPONS},{label:'Rooms',items:ROOMS}].map(({label,items})=>(
            <div key={label} style={{minWidth:140}}>
              <div style={{fontSize:11,color:'#f39c12',fontWeight:'bold',marginBottom:4}}>{label}</div>
              {items.map(item=>{
                const status=myNotepad[item]?.status||'?';
                return(
                  <div key={item} style={{display:'flex',justifyContent:'space-between',padding:'2px 4px',background:status==='no'?'#1e3a4a':status==='yes'?'#1a5276':'#2c3e50',borderRadius:3,marginBottom:2}}>
                    <span style={{fontSize:10}}>{item}</span>
                    <span style={{fontSize:10,color:status==='no'?'#e74c3c':status==='yes'?'#27ae60':'#bdc3c7'}}>{status==='no'?'✗':status==='yes'?'✓':'?'}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Log */}
      <div style={CL.logArea}>
        {log.map((l,i)=><div key={i} style={{fontSize:11,color:'#bdc3c7'}}>{l}</div>)}
      </div>
    </div>
  );
}

const CL={
  container:{background:'#1a2634',minHeight:'100vh',padding:12,color:'#ecf0f1',fontFamily:'Arial,sans-serif',overflowX:'hidden',boxSizing:'border-box'},
  header:{display:'flex',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'},
  title:{margin:0,fontSize:22,color:'#f39c12',flex:1},
  backBtn:{background:'#7f8c8d',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',minHeight:40,boxSizing:'border-box'},
  btn:{background:'#27ae60',color:'#fff',border:'none',padding:'10px 14px',borderRadius:8,cursor:'pointer',fontSize:13,minHeight:42,boxSizing:'border-box'},
  room:{borderRadius:8,padding:'8px 6px',textAlign:'center',minHeight:60,fontSize:'clamp(10px, 3vw, 12px)',transition:'border 0.15s,background 0.15s'},
  playerChip:{background:'#2c3e50',borderRadius:16,padding:'4px 10px',fontSize:12},
  panel:{background:'#2c3e50',borderRadius:8,padding:12,marginBottom:10},
  sel:{background:'#34495e',color:'#ecf0f1',border:'1px solid #555',borderRadius:4,padding:'8px 10px',fontSize:14,minHeight:38,boxSizing:'border-box'},
  cardChip:{background:'#34495e',borderRadius:4,padding:'4px 8px',fontSize:12,border:'1px solid #555'},
  notepad:{background:'#2c3e50',borderRadius:8,padding:12,marginBottom:10,overflowX:'auto'},
  logArea:{background:'#1e2d3e',borderRadius:6,padding:8,maxHeight:120,overflowY:'auto'},
};
