import React, { useState, useEffect, useCallback } from 'react';
import HowToPlay from '../HowToPlay';

// Tile bag
const TILE_DIST = {
  A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,
  N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,'?':2
};
const TILE_VALUES = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,'?':0
};

// Premium squares for 15x15 board
const PREMIUM = {};
const TW = [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]];
const DW = [[1,1],[2,2],[3,3],[4,4],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1],[10,10],[11,11],[12,12],[13,13],[7,7]];
const TL = [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]];
const DL = [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]];
TW.forEach(([r,c])=>{ PREMIUM[`${r},${c}`]='TW'; });
DW.forEach(([r,c])=>{ PREMIUM[`${r},${c}`]='DW'; });
TL.forEach(([r,c])=>{ PREMIUM[`${r},${c}`]='TL'; });
DL.forEach(([r,c])=>{ PREMIUM[`${r},${c}`]='DL'; });

const PREM_COLORS = { TW:'#e74c3c', DW:'#f0a0a0', TL:'#3498db', DL:'#a0c8f0' };

// Fluid board cell size: shrinks on narrow phones (down to 18px) but caps at
// the original 32px so desktop is pixel-identical to before.
const BOARD_CELL = 'clamp(18px, 6.2vw, 32px)';

// Minimal built-in word list (common English words — subset for validation)
const WORD_SET = new Set([
  'a','i','am','an','as','at','be','by','do','go','he','hi','if','in','is','it','me','my','no','of','oh','ok','on','or','so','to','up','us','we',
  'ace','act','add','age','ago','aid','aim','air','all','and','any','are','ark','arm','art','ask','ate','awe','axe','aye',
  'bad','bag','ban','bar','bat','bay','bed','big','bit','bow','box','boy','bud','bug','bun','bus','but','buy',
  'cab','can','cap','car','cat','cob','cod','cog','cop','cot','cow','cry','cup','cut',
  'dad','dam','day','den','dew','did','dig','dim','dip','dog','dot','dry','dug','dye',
  'ear','eat','egg','ego','elf','elm','end','era','eve','eye',
  'fad','fan','far','fat','fax','fed','few','fig','fin','fit','fix','fly','foe','fog','for','fox','fry','fun','fur',
  'gag','gap','gas','gel','gem','get','gig','gin','god','got','gum','gun','gut','guy',
  'had','ham','has','hat','hay','hem','hen','her','hew','hid','him','his','hit','hog','hop','hot','how','hub','hug','hum',
  'ice','ill','imp','ink','ion','ire','ivy',
  'jab','jag','jam','jar','jaw','jay','jet','jig','job','jog','joy','jug','jut',
  'keg','key','kid','kin','kit',
  'lab','lag','lap','law','lax','lay','led','leg','let','lid','lip','lit','log','lot','low',
  'mad','man','map','mar','mat','max','may','men','met','mix','mob','mod','mom','mop','mud','mug','mum',
  'nap','net','new','nip','nod','nor','not','now','nun','nut',
  'oak','oar','oat','odd','off','oil','old','one','opt','ore','our','out','owe','owl','own',
  'pad','pal','pan','pap','par','pat','paw','pay','pea','peg','pen','pep','pet','pie','pig','pin','pit','ply','pod','pop','pot','pow','pro','pub','pun','pup','pus','put',
  'rag','ram','ran','rap','rat','raw','ray','red','ref','rep','rev','rib','rid','rig','rim','rip','rob','rod','rot','row','rub','rug','rum','run',
  'sad','sag','sap','sat','saw','say','sea','set','sew','shy','sin','sip','sir','sit','six','ski','sky','sly','sob','sod','son','sow','soy','spa','spy','sub','sue','sum','sun','sup',
  'tab','tan','tap','tar','tax','tea','ten','the','thy','tie','tin','tip','toe','ton','too','top','tot','tow','toy','try','tub','tug',
  'ugh','urn','use',
  'van','vat','vet','via','vie','vim','vow',
  'wad','war','was','wax','web','wed','wig','win','wit','woe','wok','won','woo','wow',
  'yam','yap','yaw','yea','yes','yet','yew','you',
  'zap','zen','zip','zoo',
  'able','aged','also','area','army','away',
  'back','bake','ball','band','bank','bare','barn','base','bath','bead','bean','bear','beat','been','beer','bell','belt','best','bird','bite','black','blade','blank','blast','blaze','bleed','bless','blind','block','blood','blow','blue','blur','boat','body','bold','bolt','bone','book','boom','boot','bore','born','both','bout','bowl','brag','bran','brat','bred','brew','brim','brow','burn','burp',
  'cafe','cage','cake','call','calm','came','camp','card','care','case','cash','cast','cave','cent','chad','chat','chef','chip','chop','cite','city','clam','clap','clay','clip','club','clue','coat','code','coil','cold','colt','come','cone','cook','cool','cope','cord','core','corn','cost','cozy','crab','crew','crop','crow','curl',
  'dare','dark','dart','data','date','dawn','dead','deaf','deal','dean','dear','debt','deep','deer','deft','dell','deny','desk','dial','dice','diet','dirt','disc','dish','disk','dive','dock','dome','done','doom','door','dose','dove','down','doze','drag','draw','drew','drip','drop','drum','dual','dull','dumb','dump','dune','dusk','dust','duty',
  'each','earn','ease','east','easy','edge','else','emit','epic','even','ever','evil','exam','exit',
  'face','fact','fail','fair','fake','fall','fame','fare','farm','fast','fate','feel','feet','fell','felt','fend','fern','fern','fill','film','find','fire','firm','fish','fist','five','flag','flat','flaw','fled','flew','flex','flip','flit','flop','flow','foam','fold','folk','fond','font','food','fool','foot','ford','fore','fork','form','fort','four','free','from','fuel','full',
  'gain','gale','game','gave','gaze','gear','gift','give','glad','glow','glue','goal','gold','gone','good','gore','gown','grab','grid','grim','grip','grit','grow','gulf','gust',
  'hack','hail','half','hall','halt','hand','hang','hard','hare','harm','harp','hash','haul','have','hawk','head','heal','heap','heat','heel','held','hell','help','herb','here','hero','high','hike','hill','hilt','hive','hold','hole','home','hone','hood','hoop','hope','horn','host','hour','huge','hung','hunt','hurt',
  'icon','idea','idle','inch','info','into','iron',
  'jack','jade','jail','jerk','join','joke','just',
  'keen','keep','kill','kind','king','kiss','knee','knew','knit','knob','knot','know',
  'lack','laid','lake','lamb','lame','land','lane','last','late','laud','lazy','lead','leaf','lean','leap','lend','lens','less','life','lift','like','lime','line','link','lion','list','live','load','loan','lock','loft','long','look','lord','lore','lose','loss','lost','love','luck','lung','lure','lurk',
  'made','mail','main','make','male','mall','mane','many','mare','mark','mars','mask','mass','mast','mate','math','meal','mean','meet','melt','memo','mere','mesh','mild','mile','milk','mill','mime','mind','mine','mint','miss','mist','mode','mold','mole','more','moss','most','move','much','mule','musk','must','mute',
  'nail','name','navy','near','neck','need','nest','news','next','nice','nine','nigh','nine','node','noon','norm','nose','note','noun',
  'obey','once','only','open','orca','oval','over',
  'pace','pack','page','pain','pair','pale','palm','park','part','pass','past','path','peak','peel','peer','pelt','perk','pest','pick','pike','pile','pint','pipe','plan','play','plea','plow','ploy','plug','plum','plus','poem','poet','pole','pond','pool','poor','pore','port','pose','post','pour','pray','prey','prim','prod','prop','pull','pump','pure','push',
  'raid','rail','rain','rake','rang','rank','rant','reap','reed','reel','rely','rend','rent','rest','rice','rich','ride','rife','ring','riot','rise','risk','road','roam','roar','robe','rock','role','roof','rook','room','rope','rose','rude','ruin','rule','rush',
  'safe','sage','sail','sake','sale','salt','same','sand','sane','sang','sank','save','scan','scar','seal','seed','seem','seen','self','sell','send','sent','shed','shin','ship','shoe','shop','shot','show','side','sift','sign','silk','sill','sing','sink','slab','slap','sled','slew','slim','slip','slot','slow','slug','slum','snag','snap','snow','soap','sock','soft','soil','sold','sole','some','song','soon','sort','soul','soup','sour','spam','span','spin','spit','spot','spur','stab','star','stay','stem','step','stew','stir','stop','stub','such','suit','sung','sunk','sure','surf','swam','swap','swat','sway','swim','swum',
  'take','tale','talk','tall','tame','taut','team','tear','tell','temp','tend','tent','term','test','text','than','that','them','then','they','thin','this','thus','tide','till','time','tire','toad','toll','tomb','tome','tone','tool','torn','torq','toss','tote','tour','town','tram','trap','tree','trim','trip','true','tube','tuck','tuna','tune','turf','turn','tusk','twin','type',
  'ugly','undo','unit','upon','used','user',
  'vale','vary','vast','veil','verb','very','vest','veto','view','vine','visa','void','vote',
  'wade','wage','wail','wake','walk','wall','wand','want','ward','warm','warn','warp','wart','wave','weak','weal','wean','weed','week','weep','weld','went','were','west','what','when','whim','whip','whom','wide','wife','wild','will','wilt','wink','wire','wish','with','woke','wolf','womb','wood','word','wore','work','worm','wort','wove','wrap','wren','writ',
  'yard','yarn','year','yell','your',
  'zeal','zero','zest','zinc','zone','zoom'
]);

function createBag(){
  const bag=[];
  for(const [letter,count] of Object.entries(TILE_DIST)){
    for(let i=0;i<count;i++) bag.push(letter);
  }
  return shuffle(bag);
}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function isValidWord(word){
  return WORD_SET.has(word.toLowerCase());
}

function getWordsFormed(board, placements){
  // placements: array of {row, col, letter}
  if(placements.length===0) return [];
  const testBoard=board.map(r=>[...r]);
  placements.forEach(({row,col,letter})=>{ testBoard[row][col]=letter; });

  const words=[];
  // Check if placements form a line
  const rows=placements.map(p=>p.row);
  const cols=placements.map(p=>p.col);
  const allSameRow=new Set(rows).size===1;
  const allSameCol=new Set(cols).size===1;

  function extractWord(r,c,dr,dc){
    // go back to start
    let sr=r,sc=c;
    while(sr-dr>=0&&sr-dr<15&&sc-dc>=0&&sc-dc<15&&testBoard[sr-dr][sc-dc]) { sr-=dr; sc-=dc; }
    let word='',cells=[];
    while(sr>=0&&sr<15&&sc>=0&&sc<15&&testBoard[sr][sc]){
      word+=testBoard[sr][sc]; cells.push({row:sr,col:sc});
      sr+=dr; sc+=dc;
    }
    return word.length>1?{word,cells}:null;
  }

  if(allSameRow){
    const row=rows[0];
    const w=extractWord(row,Math.min(...cols),0,1);
    if(w) words.push(w);
    placements.forEach(({row,col})=>{
      const w2=extractWord(row,col,1,0);
      if(w2) words.push(w2);
    });
  } else if(allSameCol){
    const col=cols[0];
    const w=extractWord(Math.min(...rows),col,1,0);
    if(w) words.push(w);
    placements.forEach(({row,col})=>{
      const w2=extractWord(row,col,0,1);
      if(w2) words.push(w2);
    });
  } else {
    // invalid placement — not a line
    return null;
  }
  return words;
}

function scoreWords(words, placements, board){
  let total=0;
  const placedKeys=new Set(placements.map(p=>`${p.row},${p.col}`));
  for(const {cells} of words){
    let wordScore=0, wordMult=1;
    for(const {row,col} of cells){
      const key=`${row},${col}`;
      const letterVal=TILE_VALUES[board[row][col]?.replace('?','')]||0;
      if(placedKeys.has(key)){
        const prem=PREMIUM[key];
        if(prem==='TL') wordScore+=letterVal*3;
        else if(prem==='DL') wordScore+=letterVal*2;
        else wordScore+=letterVal;
        if(prem==='TW') wordMult*=3;
        else if(prem==='DW') wordMult*=2;
      } else {
        wordScore+=letterVal;
      }
    }
    total+=wordScore*wordMult;
  }
  if(placements.length===7) total+=50; // bingo bonus
  return total;
}

function botFindPlay(hand, board, isFirst){
  // Try all pairs/singles from hand
  const letters=[...new Set(hand)];
  // Try horizontal words at row 7 (first) or near existing tiles
  const targets=isFirst?[{row:7,col:7,dir:'h'}]:[];
  if(!isFirst){
    for(let r=0;r<15;r++) for(let c=0;c<15;c++) if(board[r][c]){
      targets.push({row:r,col:Math.max(0,c-3),dir:'h'});
      targets.push({row:Math.max(0,r-3),col:c,dir:'v'});
    }
  }
  // Try placing 2-4 letter words
  for(const target of targets.slice(0,20)){
    for(const word of [...WORD_SET].filter(w=>w.length>=2&&w.length<=Math.min(hand.length,5))){
      const placements=[];
      let handCopy=[...hand];
      let valid=true;
      let r=target.row,c=target.col;
      for(const letter of word.toUpperCase()){
        if(r>=15||c>=15){valid=false;break;}
        if(board[r][c]){
          if(board[r][c]!==letter){valid=false;break;}
        } else {
          const idx=handCopy.indexOf(letter);
          const wildIdx=handCopy.indexOf('?');
          if(idx>=0){ handCopy.splice(idx,1); placements.push({row:r,col:c,letter}); }
          else if(wildIdx>=0){ handCopy.splice(wildIdx,1); placements.push({row:r,col:c,letter}); }
          else {valid=false;break;}
        }
        if(target.dir==='h') c++; else r++;
      }
      if(!valid||placements.length===0) continue;
      if(isFirst&&!placements.some(p=>p.row===7&&p.col===7)) continue;
      const formed=getWordsFormed(board,placements);
      if(!formed||formed.length===0) continue;
      if(formed.every(w=>isValidWord(w.word))){
        return {placements, words:formed};
      }
    }
  }
  return null;
}

export default function ScrabbleLite({ players, onBack }) {
  const n=players.length;
  const [bag,setBag]=useState(()=>createBag());
  const [board,setBoard]=useState(()=>Array.from({length:15},()=>Array(15).fill(null)));
  const [hands,setHands]=useState(()=>{
    const b=createBag();
    const h=[];
    for(let i=0;i<n;i++) h.push(b.splice(0,7));
    setBag(b);
    return h;
  });
  const [scores,setScores]=useState(()=>players.map(()=>0));
  const [currentPlayer,setCurrentPlayer]=useState(0);
  const [placements,setPlacements]=useState([]); // current turn placements
  const [selectedTile,setSelectedTile]=useState(null); // index in hand
  const [msg,setMsg]=useState('');
  const [phase,setPhase]=useState('playing'); // playing, gameEnd
  const [isFirst,setIsFirst]=useState(true);
  const [passCount,setPassCount]=useState(0);

  // Draw tiles for a hand
  function drawTiles(currentHand, currentBag){
    const need=7-currentHand.length;
    const drawn=currentBag.slice(0,need);
    return { newHand:[...currentHand,...drawn], newBag:currentBag.slice(need) };
  }

  // Bot turn
  useEffect(()=>{
    if(phase!=='playing') return;
    if(!players[currentPlayer]?.isBot) return;
    setTimeout(()=>{
      const play=botFindPlay(hands[currentPlayer], board, isFirst);
      if(play&&play.placements.length>0){
        // apply play
        const newBoard=board.map(r=>[...r]);
        play.placements.forEach(({row,col,letter})=>{ newBoard[row][col]=letter; });
        const sc=scoreWords(play.words, play.placements, newBoard);
        const newScores=[...scores]; newScores[currentPlayer]+=sc;
        let newHand=[...hands[currentPlayer]];
        play.placements.forEach(p=>{
          const idx=newHand.indexOf(p.letter);
          if(idx>=0) newHand.splice(idx,1);
          else { const wi=newHand.indexOf('?'); if(wi>=0) newHand.splice(wi,1); }
        });
        let newBag=[...bag];
        const drawn=drawTiles(newHand, newBag);
        newHand=drawn.newHand; newBag=drawn.newBag;
        const newHands=hands.map((h,i)=>i===currentPlayer?newHand:h);
        setBoard(newBoard); setScores(newScores); setHands(newHands); setBag(newBag);
        setMsg(`${players[currentPlayer].name} played ${play.words.map(w=>w.word).join(', ')} for ${sc} pts`);
        setIsFirst(false); setPassCount(0);
        if(newHand.length===0&&newBag.length===0){ setPhase('gameEnd'); return; }
        setCurrentPlayer((currentPlayer+1)%n);
      } else {
        // pass
        setMsg(`${players[currentPlayer].name} passes`);
        setPassCount(prev=>{
          if(prev+1>=n*2){ setPhase('gameEnd'); return prev+1; }
          return prev+1;
        });
        setCurrentPlayer((currentPlayer+1)%n);
      }
    },700);
  },[phase,currentPlayer]); // eslint-disable-line

  function handleCellClick(row, col){
    if(players[currentPlayer]?.isBot) return;
    if(board[row][col]!=null) return; // occupied
    if(selectedTile===null) return;
    let letter=hands[currentPlayer][selectedTile];
    if(letter==='?'){
      const chosen=(window.prompt('Choose a letter for your blank tile (A-Z):','A')||'A').trim().toUpperCase().replace(/[^A-Z]/g,'');
      letter=chosen.charAt(0)||'A';
    }
    // Check not already placed there
    if(placements.some(p=>p.row===row&&p.col===col)) return;
    const newPlacements=[...placements,{row,col,letter,handIdx:selectedTile}];
    setPlacements(newPlacements);
    setSelectedTile(null);
    setMsg(`Placed ${letter} at (${row+1},${col+1}). Click Submit to confirm.`);
  }

  function handleCellClickRemove(row, col){
    if(players[currentPlayer]?.isBot) return;
    const idx=placements.findIndex(p=>p.row===row&&p.col===col);
    if(idx===-1) return;
    setPlacements(placements.filter((_,i)=>i!==idx));
  }

  function submitPlay(){
    if(placements.length===0){ setMsg('Place some tiles first!'); return; }
    if(isFirst&&!placements.some(p=>p.row===7&&p.col===7)){ setMsg('First word must cover center (8,8)!'); return; }
    const testBoard=board.map(r=>[...r]);
    placements.forEach(({row,col,letter})=>{ testBoard[row][col]=letter; });
    const formed=getWordsFormed(testBoard,placements);
    if(!formed){ setMsg('Tiles must be in a straight line!'); return; }
    if(formed.length===0){ setMsg('Must form at least one word!'); return; }
    const invalid=formed.filter(w=>!isValidWord(w.word));
    if(invalid.length>0){ setMsg(`Invalid word(s): ${invalid.map(w=>w.word).join(', ')}`); return; }
    // Every placed tile must actually be part of a formed word (no orphan tiles / gaps)
    const formedCellKeys=new Set(formed.flatMap(w=>w.cells.map(c=>`${c.row},${c.col}`)));
    if(!placements.every(p=>formedCellKeys.has(`${p.row},${p.col}`))){
      setMsg('All placed tiles must connect into a word — no gaps!');
      return;
    }
    // Check connectivity (after first word, must connect)
    if(!isFirst){
      const hasConnection=placements.some(p=>{
        const adj=[[p.row-1,p.col],[p.row+1,p.col],[p.row,p.col-1],[p.row,p.col+1]];
        return adj.some(([r,c])=>r>=0&&r<15&&c>=0&&c<15&&board[r][c]!=null);
      });
      if(!hasConnection){ setMsg('Word must connect to existing tiles!'); return; }
    }
    const sc=scoreWords(formed, placements, testBoard);
    const newBoard=testBoard;
    const newScores=[...scores]; newScores[currentPlayer]+=sc;
    let newHand=[...hands[currentPlayer]];
    // Remove by original hand index (descending) so a blank tile ('?') is
    // removed correctly even though it's displayed as its chosen letter,
    // and so indices don't shift out from under later removals.
    [...placements].sort((a,b)=>b.handIdx-a.handIdx).forEach(p=>{
      if(p.handIdx>=0&&p.handIdx<newHand.length) newHand.splice(p.handIdx,1);
    });
    let newBag=[...bag];
    const drawn=drawTiles(newHand,newBag);
    newHand=drawn.newHand; newBag=drawn.newBag;
    const newHands=hands.map((h,i)=>i===currentPlayer?newHand:h);
    setBoard(newBoard); setScores(newScores); setHands(newHands); setBag(newBag);
    setPlacements([]);
    setMsg(`${players[currentPlayer].name} played ${formed.map(w=>w.word).join(', ')} for ${sc} pts!`);
    setIsFirst(false); setPassCount(0);
    if(newHand.length===0&&newBag.length===0){ setPhase('gameEnd'); return; }
    setCurrentPlayer((currentPlayer+1)%n);
  }

  function passOrExchange(){
    if(placements.length>0){
      setPlacements([]);
      setMsg('Placements cleared.');
      return;
    }
    setMsg(`${players[currentPlayer].name} passes`);
    setPassCount(prev=>{
      const next=prev+1;
      if(next>=n*2){ setPhase('gameEnd'); }
      return next;
    });
    setCurrentPlayer((currentPlayer+1)%n);
  }

  if(phase==='gameEnd'){
    const maxSc=Math.max(...scores);
    const winIdx=scores.indexOf(maxSc);
    return(
      <div style={SC.container}>
        <h2 style={SC.title}>Scrabble Lite — Game Over!</h2>
        <h3 style={{color:'#f39c12'}}>{players[winIdx].name} wins!</h3>
        {players.map((p,i)=><div key={i} style={SC.row}>{p.name}: {scores[i]} pts</div>)}
        <button style={SC.btn} onClick={onBack}>Back</button>
      </div>
    );
  }

  const tempBoard=board.map(r=>[...r]);
  placements.forEach(({row,col,letter})=>{ tempBoard[row][col]=letter; });
  const currentHand=hands[currentPlayer]||[];
  const placedHandIdxs=new Set(placements.map(p=>p.handIdx));

  return(
    <div style={SC.container}>
      <div style={SC.header}>
        <button style={SC.backBtn} onClick={onBack}>← Back</button>
        <h2 style={SC.title}>Scrabble Lite</h2>
        <span style={{color:'#bdc3c7',fontSize:13}}>Bag: {bag.length} | {players[currentPlayer].name}'s turn</span>
      </div>

      <HowToPlay>
        <p>Score the most points by spelling words on the 15×15 board before the tile bag runs out. The game ends when the bag is empty and a player uses their last tile, or everyone passes twice in a row.</p>
        <p><strong>Turns:</strong> The board is shared and public, like a real Scrabble board. Only the current player's own rack of 7 tiles is shown — other players are shown only as a tile count and score until it's their turn.</p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Place tiles in one straight line (horizontal or vertical) to spell a word, checked against a built-in word list.</li>
          <li>The very first word of the game must cross the center star square; every word after that must connect to tiles already on the board.</li>
          <li>Colored premium squares double or triple a single letter's value (light/dark blue) or the whole word's score (pink/red) the first time a tile is placed on them.</li>
          <li>Using all 7 of your tiles in a single turn earns a +50 "bingo" bonus.</li>
          <li>Blank tiles (shown as "?") can stand in for any letter — you'll be asked to choose which letter when you place one.</li>
        </ul>
        <p><strong>Play:</strong> This is entirely tap-based — no dragging. Tap a tile in your rack to select it (it lifts up), then tap an empty board square to place it there; repeat for each letter of your word. Tap a tile you've already placed this turn to pick it back up. When ready, tap "Submit Word" to score the play and draw back up to 7 tiles, or tap "Pass" (with nothing placed) to skip your turn, or "Clear / Cancel" to undo your in-progress placements.</p>
      </HowToPlay>

      {msg&&<div style={SC.message}>{msg}</div>}

      {/* Scores */}
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        {players.map((p,i)=>(
          <div key={i} style={{background:i===currentPlayer?'#1a5276':'#2c3e50',borderRadius:6,padding:'4px 8px',fontSize:12}}>
            {p.name}: {scores[i]}
          </div>
        ))}
      </div>

      {/* Board — cell size is fluid (clamp) so all 15 columns fit a narrow
          phone screen without shrinking to illegibility; caps out at the
          original 32px on desktop so desktop appearance is unchanged.
          overflowX:auto on boardWrapper remains as a fallback. */}
      <div style={SC.boardWrapper}>
        <div style={{display:'grid',gridTemplateColumns:`repeat(15, ${BOARD_CELL})`,gap:1,margin:'0 auto',width:'max-content'}}>
          {tempBoard.map((row,ri)=>row.map((cell,ci)=>{
            const key=`${ri},${ci}`;
            const prem=PREMIUM[key];
            const isPlaced=placements.some(p=>p.row===ri&&p.col===ci);
            const isCenter=ri===7&&ci===7;
            return(
              <div key={key}
                style={{
                  width:BOARD_CELL,height:BOARD_CELL,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',
                  background:cell?(isPlaced?'#e67e22':'#f5deb3'):(prem?PREM_COLORS[prem]:(isCenter?'#f39c12':'#1a5276')),
                  border:`1px solid ${isPlaced?'#d35400':'rgba(255,255,255,0.1)'}`,
                  cursor:(!cell&&!isPlaced&&selectedTile!==null&&!players[currentPlayer]?.isBot)?'pointer':'(isPlaced?pointer:default)',
                  fontSize:prem?'clamp(5px, 1.6vw, 8px)':'clamp(9px, 2.7vw, 14px)',fontWeight:'bold',
                  color:cell?'#2c3e50':prem?'#fff':'rgba(255,255,255,0.6)',
                  position:'relative',
                }}
                onClick={()=>isPlaced?handleCellClickRemove(ri,ci):handleCellClick(ri,ci)}
              >
                {cell||prem||(isCenter?'★':'')}
                {cell&&<span style={{position:'absolute',bottom:1,right:2,fontSize:'clamp(5px, 1.4vw, 7px)',color:'#888'}}>{TILE_VALUES[cell]||0}</span>}
              </div>
            );
          }))}
        </div>
      </div>

      {/* Player hand */}
      {!players[currentPlayer]?.isBot&&(
        <div style={SC.handArea}>
          <div style={{fontSize:13,color:'#bdc3c7',marginBottom:6}}>Your tiles (click to select, then click board):</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
            {currentHand.map((letter,i)=>(
              <div key={i}
                style={{
                  ...SC.tile,
                  background:selectedTile===i?'#e67e22':(placedHandIdxs.has(i)?'#7f8c8d':'#f5deb3'),
                  cursor:placedHandIdxs.has(i)?'default':'pointer',
                  opacity:placedHandIdxs.has(i)?0.5:1,
                  transform:selectedTile===i?'translateY(-6px)':'none',
                }}
                onClick={()=>!placedHandIdxs.has(i)&&setSelectedTile(selectedTile===i?null:i)}
              >
                <span style={{color:'#2c3e50',fontWeight:'bold'}}>{letter}</span>
                <span style={{fontSize:9,color:'#666'}}>{TILE_VALUES[letter]||0}</span>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:10,display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
            <button style={SC.btn} onClick={submitPlay}>Submit Word</button>
            <button style={{...SC.btn,background:'#7f8c8d'}} onClick={passOrExchange}>
              {placements.length>0?'Clear / Cancel':'Pass'}
            </button>
          </div>
        </div>
      )}
      {players[currentPlayer]?.isBot&&(
        <div style={{textAlign:'center',padding:12,color:'#bdc3c7'}}>{players[currentPlayer].name} (Bot) is thinking...</div>
      )}

      {/* Other players */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        {players.map((p,i)=>{
          if(i===currentPlayer) return null;
          return(
            <div key={i} style={{background:'#2c3e50',borderRadius:8,padding:'6px 10px',fontSize:12}}>
              {p.name}: {(hands[i]||[]).length} tiles, {scores[i]} pts
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SC={
  container:{background:'#1a2634',minHeight:'100vh',padding:12,color:'#ecf0f1',fontFamily:'Arial,sans-serif'},
  header:{display:'flex',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'},
  title:{margin:0,fontSize:22,color:'#f39c12',flex:1},
  backBtn:{background:'#7f8c8d',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',minHeight:40},
  btn:{background:'#27ae60',color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:14,minHeight:44},
  message:{background:'#2c3e50',color:'#f39c12',padding:'8px 16px',borderRadius:8,marginBottom:8,textAlign:'center',fontSize:13},
  boardWrapper:{overflowX:'auto',marginBottom:10},
  handArea:{background:'#2c3e50',borderRadius:8,padding:12,marginTop:8},
  tile:{width:38,height:44,borderRadius:4,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontSize:18,transition:'transform 0.15s,background 0.15s',border:'1px solid #bdc3c7'},
  row:{padding:'6px 12px',background:'#2c3e50',borderRadius:6,marginBottom:4},
};
