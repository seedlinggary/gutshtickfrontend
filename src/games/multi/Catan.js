import React, { useState, useEffect, useCallback } from 'react';
import HowToPlay from '../HowToPlay';

const TERRAIN_COLORS = { fields: '#f0c040', pasture: '#90d060', forest: '#228833', mountains: '#aaaaaa', hills: '#c87a40', desert: '#e8d888' };
const TERRAIN_RESOURCE = { fields: 'grain', pasture: 'wool', forest: 'lumber', mountains: 'ore', hills: 'brick', desert: null };
const RESOURCE_COLORS = { grain: '#f0c040', wool: '#90d060', lumber: '#228833', ore: '#888', brick: '#c87a40' };
const RESOURCES = ['grain', 'wool', 'lumber', 'ore', 'brick'];
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#27ae60', '#f39c12'];
const HEX_ROWS = [[3], [4], [5], [4], [3]]; // number of hexes per row
const ALL_TERRAINS = [
  'fields','fields','fields','fields',
  'pasture','pasture','pasture','pasture',
  'forest','forest','forest','forest',
  'mountains','mountains','mountains',
  'hills','hills','hills','desert'
];
const ALL_TOKENS = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function buildBoard() {
  const terrains = shuffle(ALL_TERRAINS);
  const tokens = shuffle([...ALL_TOKENS]);
  let ti = 0, hexId = 0;
  const hexes = [];
  const offsets = [0, -0.5, -1, -0.5, 0]; // column offset multiplier per row (visual centering)
  const rowStarts = [0, 3, 7, 12, 16]; // cumulative hex count
  for(let row=0;row<5;row++){
    const count = HEX_ROWS[row][0];
    for(let col=0;col<count;col++){
      const terrain = terrains[hexId];
      const token = terrain==='desert' ? null : tokens[ti++];
      hexes.push({ id: hexId, terrain, token, row, col, robber: terrain==='desert' });
      hexId++;
    }
  }
  return hexes;
}

// Each hex has 6 vertices (corners), identified as "hexId_v0".."hexId_v5"
// Adjacent vertices on same hex: v0-v1, v1-v2, ..., v5-v0
// We use simple vertex IDs per hex corner without full adjacency merging (simplified model)
function hexVerts(hId){ return Array.from({length:6},(_,i)=>`${hId}v${i}`); }
function edgeId(a,b){ return [a,b].sort().join('--'); }

function getValidSettlements(gs, pi, setup) {
  const occupied = new Set([...Object.keys(gs.settlements),...Object.keys(gs.cities)]);
  const spots=[];
  for(let hi=0;hi<gs.hexes.length;hi++){
    for(let vi=0;vi<6;vi++){
      const v=`${hi}v${vi}`;
      if(occupied.has(v)) continue;
      // distance rule: no neighbor on same hex
      const neighbors=[`${hi}v${(vi+1)%6}`,`${hi}v${(vi+5)%6}`];
      if(neighbors.some(n=>occupied.has(n))) continue;
      if(!setup){
        // must connect to own road
        const roads=Object.keys(gs.roads).filter(e=>gs.roads[e]===pi&&e.includes(v));
        if(roads.length===0) continue;
      }
      spots.push(v);
    }
  }
  return spots;
}

function getValidRoads(gs, pi, fromVert=null) {
  const ownVerts = new Set([
    ...Object.keys(gs.settlements).filter(v=>gs.settlements[v]===pi),
    ...Object.keys(gs.cities).filter(v=>gs.cities[v]===pi),
    ...Object.keys(gs.roads).filter(e=>gs.roads[e]===pi).flatMap(e=>e.split('--')),
  ]);
  // During setup, the road must connect specifically to the settlement just placed,
  // not to any of the player's other settlements/roads.
  const start = fromVert ? new Set([fromVert]) : ownVerts;
  const usedEdges = new Set(Object.keys(gs.roads));
  const roads=[];
  for(const v of start){
    const [hi,rest]=v.split('v');
    const vi=parseInt(rest);
    const adj=[`${hi}v${(vi+1)%6}`,`${hi}v${(vi+5)%6}`];
    for(const a of adj){
      const eid=edgeId(v,a);
      if(!usedEdges.has(eid)) roads.push({eid,from:v,to:a});
    }
  }
  return roads;
}

function distributeRes(gs, roll) {
  const newGs={...gs, players:gs.players.map(p=>({...p,resources:{...p.resources}}))};
  for(const h of newGs.hexes){
    if(h.token!==roll||h.robber) continue;
    const res=TERRAIN_RESOURCE[h.terrain]; if(!res) continue;
    const verts=hexVerts(h.id);
    for(const v of verts){
      if(newGs.settlements[v]!==undefined) newGs.players[newGs.settlements[v]].resources[res]++;
      if(newGs.cities[v]!==undefined) newGs.players[newGs.cities[v]].resources[res]+=2;
    }
  }
  return newGs;
}

function calcVP(gs,pi){
  let vp=Object.values(gs.settlements).filter(x=>x===pi).length
    +Object.values(gs.cities).filter(x=>x===pi).length*2
    +(gs.largestArmy===pi?2:0)+(gs.longestRoad===pi?2:0);
  gs.players[pi].devCards.forEach(c=>{if(c==='vp')vp++;});
  return vp;
}

function initGS(players){
  return {
    hexes: buildBoard(),
    settlements:{},cities:{},roads:{},
    robberHex: null,
    players: players.map((p,i)=>({
      ...p,index:i,color:PLAYER_COLORS[i],
      resources:{grain:0,wool:0,lumber:0,ore:0,brick:0},
      devCards:[],knights:0
    })),
    devDeck: shuffle(['knight','knight','knight','knight','knight','knight','knight','knight','knight',
      'vp','vp','vp','vp','vp','road_building','road_building','year_of_plenty','year_of_plenty','monopoly','monopoly']),
    largestArmy:null,largestArmyN:0,longestRoad:null,longestRoadN:0,
  };
}

export default function Catan({ players, onBack }) {
  const n=players.length;
  const [gs,setGs]=useState(()=>{ const g=initGS(players); g.robberHex=g.hexes.findIndex(h=>h.terrain==='desert'); return g; });
  const [phase,setPhase]=useState('setup'); // setup, main
  const [setupIdx,setSetupIdx]=useState(0); // 0..2n-1
  const [setupStep,setSetupStep]=useState('settle'); // settle or road
  const [lastSettlement,setLastSettlement]=useState(null);
  const [curP,setCurP]=useState(0);
  const [mainPhase,setMainPhase]=useState('roll'); // roll,robber,build,end
  const [roll,setRoll]=useState(null);
  const [msg,setMsg]=useState('');
  const [winner,setWinner]=useState(null);
  const [tradeGive,setTradeGive]=useState('grain');
  const [tradeGet,setTradeGet]=useState('lumber');
  const [validS,setValidS]=useState([]);
  const [validR,setValidR]=useState([]);
  const [mode,setMode]=useState(''); // 'road' or 'settle' or 'city' to place

  // Initial valid spots
  useEffect(()=>{ setValidS(getValidSettlements(gs,0,true)); },[]);// eslint-disable-line

  const setupPi = useCallback(()=>{
    const total=n*2;
    if(setupIdx<n) return setupIdx;
    return (n*2-1-setupIdx);
  },[setupIdx,n]);

  // Bot setup actions
  useEffect(()=>{
    if(phase!=='setup') return;
    const pi=setupPi();
    if(!players[pi]?.isBot) return;
    setTimeout(()=>{
      if(setupStep==='settle'){
        const spots=getValidSettlements(gs,pi,true);
        if(!spots.length) return;
        const pick=spots[Math.floor(Math.random()*spots.length)];
        doSetupSettle(pick,pi);
      } else {
        const roads=getValidRoads(gs,pi,lastSettlement);
        if(!roads.length) return;
        const pick=roads[Math.floor(Math.random()*roads.length)];
        doSetupRoad(pick.eid,pi);
      }
    },700);
  },[phase,setupIdx,setupStep,lastSettlement]);// eslint-disable-line

  function doSetupSettle(v,pi){
    const newGs={...gs,settlements:{...gs.settlements,[v]:pi}};
    // Give resources on 2nd round
    if(setupIdx>=n){
      hexVerts.call(null); // noop
      const hId=parseInt(v.split('v')[0]);
      // actually give from all adjacent hexes (sharing this vertex)
      const adjHexes=newGs.hexes.filter((_,i)=>hexVerts(i).includes(v));
      adjHexes.forEach(h=>{
        const res=TERRAIN_RESOURCE[h.terrain]; if(!res) return;
        newGs.players=newGs.players.map((p,i)=>i===pi?{...p,resources:{...p.resources,[res]:p.resources[res]+1}}:p);
      });
    }
    setGs(newGs);
    setLastSettlement(v);
    setSetupStep('road');
    setValidR(getValidRoads(newGs,pi,v));
    setMsg(`${players[pi].name}: place a road`);
  }

  function doSetupRoad(eid,pi){
    const newGs={...gs,roads:{...gs.roads,[eid]:pi}};
    setGs(newGs);
    setLastSettlement(null);
    const next=setupIdx+1;
    const total=n*2;
    if(next>=total){
      setPhase('main');
      setMainPhase('roll');
      setCurP(0);
      setMsg(`${players[0].name}: roll the dice`);
      setValidS(getValidSettlements(newGs,0,false));
      setValidR(getValidRoads(newGs,0));
    } else {
      setSetupIdx(next);
      setSetupStep('settle');
      const nextPi=next<n?next:(n*2-1-next);
      setValidS(getValidSettlements(newGs,nextPi,true));
      setMsg(`${players[nextPi].name}: place a settlement`);
    }
  }

  // Bot main turn
  useEffect(()=>{
    if(phase!=='main') return;
    if(!players[curP]?.isBot) return;
    if(mainPhase==='roll'){
      setTimeout(()=>{
        const r=Math.floor(Math.random()*6)+1+Math.floor(Math.random()*6)+1;
        setRoll(r);
        if(r===7){
          const hi=Math.floor(Math.random()*gs.hexes.length);
          const newGs={...gs,hexes:gs.hexes.map((h,i)=>({...h,robber:i===hi})),robberHex:hi};
          setGs(newGs); setMsg(`Bot rolled 7, moved robber`); setMainPhase('build');
        } else {
          const newGs=distributeRes(gs,r);
          setGs(newGs); setMsg(`Bot rolled ${r}`); setMainPhase('build');
        }
      },700);
    } else if(mainPhase==='build'){
      setTimeout(()=>{
        let newGs={...gs};
        const p=newGs.players[curP];
        // Try road
        if(p.resources.brick>=1&&p.resources.lumber>=1){
          const roads=getValidRoads(newGs,curP);
          if(roads.length){
            const pick=roads[Math.floor(Math.random()*roads.length)];
            newGs={...newGs,roads:{...newGs.roads,[pick.eid]:curP}};
            newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,brick:pl.resources.brick-1,lumber:pl.resources.lumber-1}}:pl);
          }
        }
        // Try settlement
        if(newGs.players[curP].resources.brick>=1&&newGs.players[curP].resources.lumber>=1&&newGs.players[curP].resources.wool>=1&&newGs.players[curP].resources.grain>=1){
          const spots=getValidSettlements(newGs,curP,false);
          if(spots.length){
            const pick=spots[Math.floor(Math.random()*spots.length)];
            newGs={...newGs,settlements:{...newGs.settlements,[pick]:curP}};
            newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,brick:pl.resources.brick-1,lumber:pl.resources.lumber-1,wool:pl.resources.wool-1,grain:pl.resources.grain-1}}:pl);
          }
        }
        setGs(newGs);
        const w=checkWin(newGs); if(w!==null){setWinner(w);return;}
        endTurn(newGs);
      },700);
    }
  },[phase,mainPhase,curP]);// eslint-disable-line

  function checkWin(g){ for(let i=0;i<n;i++){if(calcVP(g,i)>=10)return i;} return null; }

  function endTurn(g=gs){
    const next=(curP+1)%n;
    setCurP(next);
    setMainPhase('roll');
    setRoll(null);
    setMode('');
    setMsg(`${players[next].name}: roll the dice`);
    setValidS(getValidSettlements(g,next,false));
    setValidR(getValidRoads(g,next));
  }

  function handleRoll(){
    const r=Math.floor(Math.random()*6)+1+Math.floor(Math.random()*6)+1;
    setRoll(r);
    if(r===7){ setMainPhase('robber'); setMsg('Rolled 7! Click a hex to move the robber.'); return; }
    const newGs=distributeRes(gs,r);
    setGs(newGs);
    setMainPhase('build');
    setMsg(`Rolled ${r}. Build or end turn.`);
  }

  function handleHexClick(hi){
    if(mainPhase==='robber'){
      const newGs={...gs,hexes:gs.hexes.map((h,i)=>({...h,robber:i===hi})),robberHex:hi};
      setGs(newGs); setMainPhase('build'); setMsg('Robber placed. Build or end turn.');
    }
  }

  function handleVertexClick(v){
    if(phase==='setup'&&setupStep==='settle'&&!players[setupPi()]?.isBot&&validS.includes(v)){
      doSetupSettle(v,setupPi());
    } else if(mode==='settle'&&validS.includes(v)){ buildSettlement(v); }
    else if(mode==='city'&&gs.settlements[v]===curP){ buildCity(v); }
  }

  function handleEdgeClick(eid){
    if(phase==='setup'&&setupStep==='road'&&!players[setupPi()]?.isBot){
      const roads=getValidRoads(gs,setupPi(),lastSettlement);
      if(roads.some(r=>r.eid===eid)) doSetupRoad(eid,setupPi());
    } else if(mode==='road'){ buildRoad(eid); }
  }

  function buildSettlement(v){
    const p=gs.players[curP];
    if(p.resources.brick<1||p.resources.lumber<1||p.resources.wool<1||p.resources.grain<1){setMsg('Need brick+lumber+wool+grain');return;}
    const newGs={...gs,settlements:{...gs.settlements,[v]:curP}};
    newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,brick:pl.resources.brick-1,lumber:pl.resources.lumber-1,wool:pl.resources.wool-1,grain:pl.resources.grain-1}}:pl);
    setGs(newGs); setMode(''); setValidS(getValidSettlements(newGs,curP,false)); setValidR(getValidRoads(newGs,curP));
    const w=checkWin(newGs); if(w!==null){setWinner(w);return;}
    setMsg('Settlement built!');
  }

  function buildCity(v){
    const p=gs.players[curP];
    if(p.resources.ore<3||p.resources.grain<2){setMsg('Need 3 ore + 2 grain');return;}
    if(gs.settlements[v]!==curP){return;}
    const newGsSetts={...gs.settlements}; delete newGsSetts[v];
    const newGs={...gs,settlements:newGsSetts,cities:{...gs.cities,[v]:curP}};
    newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,ore:pl.resources.ore-3,grain:pl.resources.grain-2}}:pl);
    setGs(newGs); setMode('');
    const w=checkWin(newGs); if(w!==null){setWinner(w);return;}
    setMsg('City built!');
  }

  function buildRoad(eid){
    const p=gs.players[curP];
    if(p.resources.brick<1||p.resources.lumber<1){setMsg('Need brick+lumber');return;}
    const newGs={...gs,roads:{...gs.roads,[eid]:curP}};
    newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,brick:pl.resources.brick-1,lumber:pl.resources.lumber-1}}:pl);
    setGs(newGs); setMode(''); setValidR(getValidRoads(newGs,curP)); setValidS(getValidSettlements(newGs,curP,false));
    setMsg('Road built!');
  }

  function bankTrade(){
    const p=gs.players[curP];
    if(p.resources[tradeGive]<4){setMsg('Need 4 of that resource');return;}
    const newGs={...gs};
    newGs.players=newGs.players.map((pl,i)=>i===curP?{...pl,resources:{...pl.resources,[tradeGive]:pl.resources[tradeGive]-4,[tradeGet]:pl.resources[tradeGet]+1}}:pl);
    setGs(newGs); setMsg(`Traded 4 ${tradeGive} → 1 ${tradeGet}`);
  }

  if(winner!==null){
    return(
      <div style={S.container}>
        <h2 style={S.title}>Catan — Game Over!</h2>
        <h3 style={{color:'#f39c12'}}>{players[winner].name} wins with {calcVP(gs,winner)} VP!</h3>
        {gs.players.map((p,i)=><div key={i} style={S.row}>{p.name}: {calcVP(gs,i)} VP</div>)}
        <button style={S.btn} onClick={onBack}>Back</button>
      </div>
    );
  }

  const pi=phase==='setup'?setupPi():curP;
  const isHuman=!players[pi]?.isBot;
  const pRes=gs.players[curP]?.resources||{};

  // Render board as rows of hexes
  const rowCounts=[3,4,5,4,3];
  let hexIdx=0;

  return(
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <h2 style={S.title}>Catan</h2>
        <span style={{color:'#bdc3c7',fontSize:13}}>{msg}</span>
      </div>

      <HowToPlay>
        <p>First player to reach 10 Victory Points wins. Points come from Settlements (1 each), Cities (2 each), Largest Army (2), Longest Road (2), and any Victory Point development cards you hold.</p>
        <p><strong>Turns:</strong> Rotates through all seated players (2-4). The board and everyone's built structures are always public, and (in this simplified build) every player's resource cards are shown openly too — there's no concealed hand to hide between turns. Play opens with a Setup phase where players take turns, in snake order (1→n, then n→1), placing their first two settlements and roads.</p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>On your turn, roll two dice — every settlement/city next to a hex matching the roll produces 1 (or 2, for a city) of that hex's resource for its owner.</li>
          <li>Rolling a 7 doesn't produce resources — instead you move the Robber onto a hex, blocking its production until it's moved again.</li>
          <li>Build a Road (1 brick + 1 lumber), a Settlement (1 brick + 1 lumber + 1 wool + 1 grain), or upgrade a Settlement to a City (3 ore + 2 grain, worth 2 VP instead of 1).</li>
          <li>You can also trade 4 of any one resource to the bank for 1 of another.</li>
        </ul>
        <p><strong>Play:</strong> Tap the Settlement / City / Road buttons to enter that build mode, then tap a highlighted valid spot on the board — or use the easier-to-tap list of valid spots that appears below the board — to build there. Tap a hex to move the Robber after rolling a 7. Use the dropdown selectors and "Trade 4:1" to trade with the bank.</p>
      </HowToPlay>

      {roll&&<div style={{textAlign:'center',fontSize:28,marginBottom:4}}>🎲 {roll}</div>}

      {/* Board */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,margin:'8px 0'}}>
        {rowCounts.map((count,row)=>{
          const rowHexes=[];
          for(let c=0;c<count;c++) rowHexes.push(gs.hexes[hexIdx++] || gs.hexes[hexIdx-1]);
          // Reset hexIdx bug: recalculate
          return null;
        })}
        {(()=>{
          let hi=0;
          return rowCounts.map((count,row)=>{
            const rowHexes=gs.hexes.slice(hi,hi+count);
            hi+=count;
            return(
              <div key={row} style={{display:'flex',gap:3}}>
                {rowHexes.map(hex=>{
                  const verts=hexVerts(hex.id);
                  const sVerts=verts.filter(v=>gs.settlements[v]!==undefined||gs.cities[v]!==undefined);
                  return(
                    <div key={hex.id}
                      style={{...S.hex,background:TERRAIN_COLORS[hex.terrain],border:hex.robber?'3px solid #000':'2px solid rgba(0,0,0,0.2)',cursor:(mainPhase==='robber'&&isHuman&&phase==='main')?'pointer':'default'}}
                      onClick={()=>handleHexClick(hex.id)}
                    >
                      <div style={{fontSize:'clamp(7px, 1.8vw, 9px)',color:'#2c3e50',fontWeight:'bold'}}>{hex.terrain.slice(0,3).toUpperCase()}</div>
                      {hex.token&&<div style={{fontSize:'clamp(12px, 3.2vw, 16px)',fontWeight:'bold',color:hex.token===6||hex.token===8?'#c00':'#2c3e50'}}>{hex.token}</div>}
                      {hex.robber&&<div style={{fontSize:'clamp(8px, 2vw, 10px)'}}>🦹</div>}
                      <div style={{display:'flex',gap:1,flexWrap:'wrap',justifyContent:'center',maxWidth:'90%'}}>
                        {verts.map(v=>{
                          const pi2=gs.settlements[v]; const ci=gs.cities[v];
                          const isValidS=validS.includes(v)&&(mode==='settle'||(phase==='setup'&&setupStep==='settle'))&&isHuman;
                          return(
                            <div key={v}
                              style={{width:isValidS?12:8,height:isValidS?12:8,borderRadius:ci!==undefined?2:'50%',
                                background:pi2!==undefined?PLAYER_COLORS[pi2]:(ci!==undefined?PLAYER_COLORS[ci]:(isValidS?'rgba(255,255,255,0.5)':'transparent')),
                                border:isValidS?'1px solid #fff':'none',cursor:isValidS?'pointer':'default',transition:'all 0.15s'}}
                              onClick={e=>{e.stopPropagation();handleVertexClick(v);}}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      {/* Settlement placement list — the on-board vertex dots are only ~12px,
          too small for reliable touch, so mirror the road pattern below with
          a list of full-size tap targets for every valid settlement spot. */}
      {((mode==='settle')||(phase==='setup'&&setupStep==='settle'))&&isHuman&&(
        <div style={S.spotsArea}>
          <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Tap a settlement spot:</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {validS.map(v=>(
              <button key={v} style={S.spotBtn} onClick={()=>handleVertexClick(v)}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {/* City upgrade list — same touch-target reasoning as settlements above */}
      {mode==='city'&&isHuman&&(
        <div style={S.spotsArea}>
          <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Tap a settlement to upgrade to a city:</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {Object.keys(gs.settlements).filter(v=>gs.settlements[v]===curP).map(v=>(
              <button key={v} style={S.spotBtn} onClick={()=>buildCity(v)}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {/* Roads overlay (simplified text list) */}
      {mode==='road'&&isHuman&&(
        <div style={S.spotsArea}>
          <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Click a road position:</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {validR.map(r=>(
              <button key={r.eid} style={S.spotBtn} onClick={()=>handleEdgeClick(r.eid)}>
                {r.from}↔{r.to}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Setup road selection */}
      {phase==='setup'&&setupStep==='road'&&isHuman&&(
        <div style={S.spotsArea}>
          <div style={{fontSize:12,color:'#bdc3c7',marginBottom:4}}>Click a road position:</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {getValidRoads(gs,setupPi(),lastSettlement).slice(0,10).map(r=>(
              <button key={r.eid} style={S.spotBtn} onClick={()=>handleEdgeClick(r.eid)}>{r.from}↔{r.to}</button>
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      <div style={S.playersRow}>
        {gs.players.map((p,i)=>(
          <div key={i} style={{...S.playerCard,border:`2px solid ${(i===curP&&phase==='main')||(i===setupPi()&&phase==='setup')?p.color:'#34495e'}`}}>
            <div style={{color:p.color,fontWeight:'bold',fontSize:12}}>{p.name} — {calcVP(gs,i)} VP</div>
            <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>
              {RESOURCES.map(r=>(<span key={r} style={{fontSize:10,background:RESOURCE_COLORS[r],color:'#fff',borderRadius:4,padding:'1px 4px'}}>{r.slice(0,2).toUpperCase()}:{p.resources[r]}</span>))}
            </div>
            <div style={{fontSize:10,color:'#bdc3c7',marginTop:2}}>Dev:{p.devCards.length}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {phase==='main'&&!players[curP]?.isBot&&(
        <div style={S.actionBar}>
          {mainPhase==='roll'&&<button style={S.btn} onClick={handleRoll}>🎲 Roll Dice</button>}
          {mainPhase==='build'&&(
            <>
              <button style={S.btn} onClick={()=>setMode(mode==='settle'?'':'settle')}>
                {mode==='settle'?'Cancel':'🏠 Settlement (B+L+W+G)'}
              </button>
              <button style={{...S.btn,background:'#9b59b6'}} onClick={()=>setMode(mode==='city'?'':'city')}>
                {mode==='city'?'Cancel':'🏙 City (3O+2G)'}
              </button>
              <button style={{...S.btn,background:'#e67e22'}} onClick={()=>setMode(mode==='road'?'':'road')}>
                {mode==='road'?'Cancel':'🛤 Road (B+L)'}
              </button>
              <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                <select style={S.sel} value={tradeGive} onChange={e=>setTradeGive(e.target.value)}>
                  {RESOURCES.map(r=><option key={r} value={r}>{r}({pRes[r]})</option>)}
                </select>
                <span style={{color:'#bdc3c7'}}>→</span>
                <select style={S.sel} value={tradeGet} onChange={e=>setTradeGet(e.target.value)}>
                  {RESOURCES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <button style={{...S.btn,margin:0}} onClick={bankTrade}>Trade 4:1</button>
              </div>
              <button style={{...S.btn,background:'#7f8c8d'}} onClick={()=>endTurn()}>End Turn</button>
            </>
          )}
          {mainPhase==='robber'&&<div style={{color:'#bdc3c7',fontSize:13}}>Click a hex on the board to place the robber.</div>}
        </div>
      )}
    </div>
  );
}

const S={
  container:{background:'#1a2634',minHeight:'100vh',padding:12,color:'#ecf0f1',fontFamily:'Arial,sans-serif',overflowX:'hidden',boxSizing:'border-box'},
  header:{display:'flex',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'},
  title:{margin:0,fontSize:22,color:'#f39c12',flex:1},
  backBtn:{background:'#7f8c8d',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',minHeight:40,boxSizing:'border-box'},
  btn:{background:'#27ae60',color:'#fff',border:'none',padding:'10px 14px',borderRadius:8,cursor:'pointer',fontSize:13,margin:'0 4px',minHeight:42,boxSizing:'border-box'},
  hex:{width:'clamp(46px, 13vw, 72px)',height:'clamp(36px, 10.1vw, 56px)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:2,transition:'border 0.15s',boxSizing:'border-box',flexShrink:0},
  spotsArea:{background:'#2c3e50',borderRadius:8,padding:'8px 12px',marginBottom:8},
  spotBtn:{background:'#34495e',color:'#bdc3c7',border:'none',borderRadius:4,padding:'6px 10px',cursor:'pointer',fontSize:11,margin:2,minHeight:40,boxSizing:'border-box'},
  playersRow:{display:'flex',gap:8,flexWrap:'wrap',marginTop:8,marginBottom:8},
  playerCard:{background:'#2c3e50',borderRadius:8,padding:'8px 10px',flex:1,minWidth:130},
  actionBar:{background:'#2c3e50',borderRadius:8,padding:10,display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'},
  sel:{background:'#34495e',color:'#ecf0f1',border:'1px solid #555',borderRadius:4,padding:'6px',fontSize:13,minHeight:34,boxSizing:'border-box'},
  row:{padding:'6px 12px',background:'#2c3e50',borderRadius:6,marginBottom:4},
};
