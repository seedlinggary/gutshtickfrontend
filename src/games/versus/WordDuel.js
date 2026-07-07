import React, { useState, useEffect, useRef } from 'react';
import HowToPlay from '../HowToPlay';

// ~1000 common English words (representative sample)
const WORD_LIST = new Set([
  'ace','act','add','age','ago','aid','aim','air','ale','all','and','ant','ape','apt','arc','are','ark',
  'arm','art','ash','ask','ate','awe','axe','aye','back','bad','bag','ban','bar','bat','bay','bed','bet',
  'bid','big','bit','bow','box','boy','bud','bug','bun','bus','but','buy','cab','can','cap','car','cat',
  'caw','cod','cog','cop','cot','cow','cry','cub','cup','cut','dad','dam','day','den','dew','did','dig',
  'dim','dip','dog','dot','dug','dye','ear','eat','egg','ego','elf','elk','elm','end','era','eve','ewe',
  'eye','fad','fan','far','fat','fax','foe','fog','for','fox','fur','gag','gap','gas','gel','gem','get',
  'gig','gin','gnu','god','got','gum','gun','gut','guy','gym','had','ham','has','hat','hay','her','him',
  'hip','his','hit','hog','hop','hot','how','hub','hue','hug','hum','hut','ice','ill','imp','inn','ion',
  'ivy','jab','jag','jam','jar','jaw','jay','jet','jig','job','jot','joy','jug','jut','keg','key','kid',
  'kit','lab','lag','lap','law','lay','led','leg','let','lid','lip','lit','log','lot','low','lug','mad',
  'man','map','mar','mat','maw','men','met','mix','mob','mop','mud','mug','nag','nap','net','new','nil',
  'nit','nod','nor','not','now','nun','oak','oar','odd','off','oil','old','one','opt','orb','ore','our',
  'owe','owl','own','pad','pan','pap','par','pat','paw','pay','pea','peg','pen','pep','per','pet','pie',
  'pig','pin','pit','ply','pod','pop','pot','pox','pro','pub','pug','pun','pup','pus','put','rag','ram',
  'ran','rap','rat','raw','ray','red','ref','rep','rid','rig','rim','rip','rob','rod','rot','rub','rug',
  'rum','run','rut','rye','sac','sad','sag','sap','sat','saw','say','sea','set','sew','sir','sis','sit',
  'six','ski','sky','sly','sob','sod','son','sop','sow','spa','spy','sty','sub','sum','sun','sup','tab',
  'tan','tap','tar','tea','ten','the','tie','tin','tip','toe','too','top','toy','try','tub','tug','two',
  'urn','use','van','vat','vet','vow','wad','war','was','wax','way','web','wed','wet','who','why','wig',
  'win','wit','woe','wok','won','woo','wow','yam','yap','yew','you','zap','zit','able','acid','aged',
  'aide','also','arch','area','army','aunt','baby','back','bake','bald','ball','band','bank','bare','bark',
  'barn','base','bath','bead','beak','beam','bean','bear','beat','been','beef','beer','bell','belt','bend',
  'best','bile','bill','bind','bird','bite','blow','blue','blur','boar','boat','body','bold','bolt','bone',
  'book','boom','born','boss','both','bout','bowl','brow','buck','bulk','bull','bump','burn','burp','buzz',
  'cage','cake','calf','call','calm','came','camp','cape','care','carp','cart','case','cash','cast','cave',
  'cell','cent','chef','chin','chip','chop','city','clam','clap','claw','clay','clip','club','clue','coal',
  'coat','code','coil','cold','come','cone','cook','cool','cope','copy','cord','core','corn','cost','cozy',
  'crab','crew','crop','crow','cure','curl','cute','dame','dare','dark','dart','data','date','dead','deaf',
  'deal','dear','deck','deed','deep','dent','desk','dial','dice','dine','dirt','disk','dive','dock','dome',
  'done','doom','door','dorm','dose','down','drag','draw','drew','drip','drop','drum','dual','dude','dull',
  'dump','dung','dusk','dust','duty','each','earl','earn','east','edge','else','emit','epic','even','ever',
  'evil','exam','exit','face','fact','fade','fail','faint','fake','fall','fame','farm','fast','fate','fault',
  'fear','feat','feed','feel','feet','fell','felt','fern','file','fill','find','fine','fire','firm','fish',
  'fist','five','flag','flat','flew','flex','flip','flow','foam','fold','folk','fond','font','food','foot',
  'ford','fore','fork','form','fort','four','free','from','frog','fuel','full','fume','fund','fuse','gain',
  'gale','game','gang','gate','gave','gaze','gear','germ','gift','girl','give','glad','glow','glue','goal',
  'goat','goes','gold','golf','gone','good','gore','grab','grad','gram','gray','grew','grim','grip','grit',
  'grew','grow','gulf','gulp','gust','half','hall','halt','hand','hang','hard','harm','harp','hash','haul',
  'have','hawk','head','heal','heap','heat','heel','held','help','here','hero','high','hike','hill','hint',
  'hire','hold','hole','holy','home','hood','hook','hope','horn','host','hour','howl','hull','hunt','hurt',
  'hymn','icon','idea','inch','into','iron','isle','item','jerk','join','joke','jump','just','keen','keep',
  'kept','kill','kind','king','knew','knit','knob','knot','know','lack','lake','lamb','lamp','land','lane',
  'lard','lark','lash','last','late','lava','lead','leaf','leak','lean','leap','left','lend','lens','lick',
  'life','lift','like','limb','lime','link','lion','list','live','load','loan','lock','loft','lone','long',
  'look','loop','lore','lore','lore','lark','lore','lose','loss','lost','loud','love','luck','lung','lure',
  'lust','made','mail','main','make','male','mall','many','mark','mars','mast','mate','math','meal','mean',
  'meat','meet','melt','memo','menu','mere','mesh','mild','mile','milk','mill','mind','mine','mint','miss',
  'mist','mode','mole','mood','moon','more','moss','most','moth','move','much','mule','muse','must','myth',
  'nail','name','navy','near','neck','need','nest','next','nice','nine','node','none','noon','norm','note',
  'noun','nude','null','numb','obey','once','only','open','orca','over','page','paid','pain','pair','pale',
  'palm','park','part','pass','past','path','peak','peel','peer','perk','pest','pick','pine','pink','pipe',
  'plan','play','plea','plot','plow','plug','plus','poem','poet','pole','poll','pond','pool','poor','pope',
  'pork','port','pose','post','pour','pray','prey','prod','prop','pull','pure','push','rack','rage','raid',
  'rail','rain','rake','ramp','rank','rare','rate','read','real','reap','rear','reel','rely','rent','rest',
  'rich','ride','ring','riot','risk','roam','roar','roast','robe','rock','role','roll','roof','room','root',
  'rope','rose','rout','rude','ruin','rule','rush','rust','safe','sage','sail','sake','salt','same','sand',
  'sane','sang','sank','save','scan','scar','seal','seam','seat','seed','seek','seem','seen','sell','send',
  'sent','sewn','shed','shin','ship','shoe','shop','shot','show','shut','sick','side','sigh','sign','silk',
  'sill','sing','sink','site','size','skin','skip','slab','slam','slap','slim','slip','slot','slow','slug',
  'slum','snap','snob','snow','soak','soap','sock','soft','soil','sold','sole','solo','some','song','soon',
  'sore','sort','soul','soup','sour','span','spar','spin','spot','spur','stab','star','stay','stem','step',
  'stew','stir','stop','stow','stub','stun','such','suit','sung','sunk','sure','swap','swat','swim','swam',
  'tale','tall','tame','task','taut','team','tear','teem','tell','temp','tend','tent','term','test','text',
  'than','that','them','then','they','thin','this','thou','thus','tick','tide','till','time','tire','toad',
  'told','toll','tomb','tome','tone','tong','took','tool','tore','torn','toss','tour','town','tree','trim',
  'trio','trip','trot','true','tube','tune','turf','turn','tusk','type','ugly','unit','upon','used','user',
  'vain','vale','vary','vast','very','view','vine','visa','vote','wade','wage','wake','walk','wall','wand',
  'want','ward','warm','warn','warp','wash','wave','weak','wean','wear','weed','week','well','went','were',
  'west','wide','wife','wild','will','wilt','wind','wine','wire','wise','wish','with','woke','wolf','wood',
  'wool','word','work','worm','worn','wrap','wren','writ','yard','yarn','year','yell','your','zero','zone',
  // longer words
  'about','above','abuse','actor','acute','admit','adopt','adult','after','again','agent','agile','agree',
  'ahead','alarm','album','alike','alive','alley','allow','alone','along','aloud','alter','amber','amend',
  'angel','angry','anime','ankle','annex','antic','apart','apple','apply','April','arena','argue','arise',
  'arose','array','arrow','ashes','aside','asset','atlas','atone','attic','audio','audit','avoid','awake',
  'award','aware','awful','badly','baker','banjo','basic','basis','batch','beach','began','begin','being',
  'below','bench','berry','bevel','black','blade','blame','bland','blank','blaze','bleat','blend','bless',
  'blind','block','blood','bloom','blown','board','bonus','boost','bored','boxer','brace','brain','brand',
  'brave','bread','break','breed','brick','bride','brief','brine','bring','brook','brush','brute','build',
  'built','bunny','buyer','bylaw','cabin','candy','cargo','carry','catch','cause','cease','chain','chair',
  'chase','cheap','check','cheek','cheer','chess','chest','chief','child','chimp','choir','chore','chose',
  'civic','civil','claim','class','clean','clear','clerk','click','cliff','climb','cling','clock','clone',
  'close','cloth','cloud','coach','cobra','comet','comic','comma','coral','could','count','court','cover',
  'covet','crane','crash','crazy','cream','creek','crimp','crime','crisp','cross','crowd','crown','cruel',
  'crush','crust','curve','cycle','daily','dance','decay','defer','deity','demon','depot','depth','derby',
  'devil','digit','dirty','disco','ditch','diver','dizzy','dodge','dowry','draft','drain','drape','dream',
  'dried','drift','drive','drone','drove','drunk','dryer','eagle','early','earth','eight','elect','elite',
  'empty','enemy','enjoy','enter','entry','equal','error','essay','event','every','exact','exist','extra',
  'fable','facet','fancy','fatal','feast','fence','ferry','fever','fiber','field','fifth','fifty','fight',
  'final','first','fixed','flare','flash','fleet','flesh','flint','flock','flood','floor','flora','flour',
  'fluid','flunk','flush','flute','flyer','focus','force','forge','found','frame','franc','fraud','fresh',
  'front','frost','frown','froze','fruit','fungi','funky','furry','funny','genre','ghost','giant','given',
  'giver','gland','glare','glass','glide','globe','gloom','gloss','glove','glued','going','grace','grade',
  'grand','grant','graph','grasp','grass','grave','great','green','greet','grief','grill','groan','groin',
  'groom','grope','gross','group','grout','grove','guard','guide','guild','guise','gusto','habit','haste',
  'haven','heart','hence','herbs','hinge','hippo','hoist','honor','horse','hotel','house','human','humor',
  'hurry','image','imply','indie','infer','inner','input','inter','intro','issue','ivory','japan','jewel',
  'joint','juice','juicy','karma','kneel','knife','knock','label','large','laser','later','laugh','layer',
  'learn','lease','least','leave','legal','level','light','limit','liner','liver','local','lodge','lofty',
  'logic','lusty','lyric','magic','major','manor','maple','march','match','maxim','mayor','medic','merit',
  'merge','metal','might','minor','minus','model','money','month','moral','mount','mouse','mouth','movie',
  'multi','mural','music','naive','nasty','naval','night','noble','noisy','north','novel','nurse','nymph',
  'occur','ocean','other','ought','outer','owing','oxide','ozone','paint','panel','panic','paper','party',
  'pause','peace','pearl','penny','perch','phase','phone','photo','piano','pilot','pitch','pixel','pizza',
  'place','plain','plane','plant','plead','pleat','plumb','plume','plunk','point','polar','poppy','porch',
  'power','price','pride','prime','print','prior','prize','probe','prone','proof','prose','prove','proxy',
  'psalm','pulse','pupil','purse','queen','query','quest','queue','quick','quiet','quota','quote','rabbi',
  'radar','radio','raise','rally','range','rapid','ratio','reach','ready','rebel','refer','reign','relay',
  'repay','repel','reply','rider','rifle','right','risky','rival','river','roast','robot','rocky','rouge',
  'rough','round','route','royal','rugby','ruler','rural','saint','salad','sauce','scale','scene','score',
  'scout','screw','serif','seven','sewage','shaft','shake','shall','shame','shape','share','sharp','shave',
  'shell','shelf','shift','shirt','shock','short','shout','shove','sieve','silly','since','sixth','sixty',
  'skill','skirt','skull','slant','slash','sleet','slime','slope','smile','smoke','snake','solar','solid',
  'solve','sorry','south','space','spare','spark','speak','speed','spend','spice','spill','spine','spite',
  'split','spoke','spoon','sport','spray','squad','stack','staff','stage','stain','stake','stale','stall',
  'stamp','stand','stark','state','steal','steel','steep','steer','stick','stiff','sting','stock','stone',
  'store','storm','story','stout','stove','strap','straw','strip','stuck','study','stuff','stump','style',
  'sugar','suite','super','surge','swamp','swear','sweep','sweet','swept','swift','sword','swore','sworn',
  'table','talon','tempo','tense','tepid','their','there','these','thick','thing','think','third','those',
  'three','threw','throw','timer','tired','title','today','token','total','touch','tough','toxic','trace',
  'track','trade','trail','train','trait','tread','treat','trend','trial','troop','truck','truly','trunk',
  'trust','truth','tumor','tuner','twirl','twist','ultra','under','unify','union','until','upper','upset',
  'urban','usual','utter','valid','value','valve','vapor','vault','video','vigor','viral','virus','visit',
  'vital','vivid','vocal','voice','voter','vague','wagon','waist','waste','watch','water','weary','weave',
  'wedge','weird','whale','wheat','wheel','where','which','while','white','whole','whose','witch','woman',
  'women','world','worry','worse','worst','worth','would','wound','wrath','write','wrong','wrote','yacht',
  'yield','young','youth','zebra',
]);

const EASY_LETTERS = 'AAEEIOUUBCDGLMNRST';
const MEDIUM_LETTERS = 'AEIOUABCDFGLMNPRST';
const HARD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateLetters(difficulty) {
  const src = difficulty === 'easy' ? EASY_LETTERS : difficulty === 'medium' ? MEDIUM_LETTERS : HARD_LETTERS;
  const arr = src.split('');
  // Pick 7 random letters
  const result = [];
  for (let i = 0; i < 7; i++) {
    result.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return result;
}

const TIMES = { easy: 60, medium: 45, hard: 30 };

function canMakeWord(word, letters) {
  const available = [...letters];
  for (const ch of word.toUpperCase()) {
    const idx = available.indexOf(ch);
    if (idx < 0) return false;
    available.splice(idx, 1);
  }
  return true;
}

function isValidWord(word, letters) {
  const w = word.toLowerCase().trim();
  if (w.length < 2) return false;
  if (!canMakeWord(w, letters)) return false;
  return WORD_LIST.has(w);
}

function getBotWord(letters, difficulty) {
  const available = letters.map(l => l.toLowerCase());
  let best = '';
  // Try all words in list
  for (const word of WORD_LIST) {
    if (canMakeWord(word, available.map(l => l.toUpperCase())) && word.length > best.length) {
      best = word;
    }
  }

  if (difficulty === 'easy') {
    // Pick 3-letter word, falling back to the best real word found (never
    // an arbitrary substring, which likely isn't a valid dictionary word)
    const threes = [...WORD_LIST].filter(w => w.length === 3 && canMakeWord(w, available.map(l => l.toUpperCase())));
    return threes[0] || best || '';
  }
  if (difficulty === 'medium') {
    const fours = [...WORD_LIST].filter(w => w.length === 4 && canMakeWord(w, available.map(l => l.toUpperCase())));
    return fours[0] || best || '';
  }
  return best;
}

export default function WordDuel({ mode, difficulty, onBack }) {
  const [letters, setLetters] = useState(() => generateLetters(difficulty || 'medium'));
  const [timeLeft, setTimeLeft] = useState(TIMES[difficulty || 'medium']);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'result'
  const [p1Word, setP1Word] = useState('');
  const [p2Word, setP2Word] = useState('');
  const [p1Submitted, setP1Submitted] = useState(false);
  const [p2Submitted, setP2Submitted] = useState(false);
  const [p1SubmitTime, setP1SubmitTime] = useState(null);
  const [p2SubmitTime, setP2SubmitTime] = useState(null);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);

  const isBot = mode === 'vs_computer';

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Bot submits based on difficulty
  useEffect(() => {
    if (!isBot || p2Submitted || phase !== 'playing') return;
    const totalTime = TIMES[difficulty || 'medium'];
    const botDelay = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.3;
    const delay = totalTime * botDelay * 1000;
    const t = setTimeout(() => {
      const word = getBotWord(letters, difficulty);
      setP2Word(word);
      setP2Submitted(true);
      setP2SubmitTime(Date.now());
    }, delay);
    return () => clearTimeout(t);
  }, [isBot, p2Submitted, phase, letters, difficulty]);

  // End phase when both submitted
  useEffect(() => {
    if (p1Submitted && (p2Submitted || !isBot)) {
      // In local mode wait for both; in bot mode bot submits automatically
    }
    if (isBot && p1Submitted && p2Submitted && phase === 'playing') {
      clearInterval(timerRef.current);
      setPhase('result');
    }
  }, [p1Submitted, p2Submitted, isBot, phase]);

  function submitP1() {
    if (p1Submitted || phase !== 'playing') return;
    setP1Word(p1Input.trim());
    setP1Submitted(true);
    setP1SubmitTime(Date.now());
    if (!isBot && p2Submitted) {
      clearInterval(timerRef.current);
      setPhase('result');
    }
  }

  function submitP2() {
    if (p2Submitted || phase !== 'playing' || isBot) return;
    setP2Word(p2Input.trim());
    setP2Submitted(true);
    setP2SubmitTime(Date.now());
    if (p1Submitted) {
      clearInterval(timerRef.current);
      setPhase('result');
    }
  }

  function reset() {
    const newLetters = generateLetters(difficulty || 'medium');
    setLetters(newLetters);
    setTimeLeft(TIMES[difficulty || 'medium']);
    setPhase('playing');
    setP1Word(''); setP2Word('');
    setP1Input(''); setP2Input('');
    setP1Submitted(false); setP2Submitted(false);
    setP1SubmitTime(null); setP2SubmitTime(null);
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';

  // Determine winner
  let winnerMsg = '';
  if (phase === 'result') {
    const p1Valid = isValidWord(p1Word, letters);
    const p2Valid = isValidWord(p2Word, letters);
    const p1Len = p1Valid ? p1Word.trim().length : 0;
    const p2Len = p2Valid ? p2Word.trim().length : 0;

    if (p1Len > p2Len) winnerMsg = `${p1label} wins! (${p1Word.trim()}: ${p1Len} letters)`;
    else if (p2Len > p1Len) winnerMsg = `${p2label} wins! (${p2Word.trim()}: ${p2Len} letters)`;
    else if (p1Len === 0 && p2Len === 0) winnerMsg = "No valid words!";
    else if (p1Len === p2Len && p1Len > 0) {
      // Tiebreak by submission time
      if (p1SubmitTime && p2SubmitTime) {
        winnerMsg = p1SubmitTime < p2SubmitTime ? `${p1label} wins by tiebreak! (submitted first)` : `${p2label} wins by tiebreak! (submitted first)`;
      } else {
        winnerMsg = 'Tie!';
      }
    }
  }

  const urgent = timeLeft <= 10;

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Word Duel</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>Build the longest valid English word you can before time runs out.</p>
        <ul>
          <li>Both players see the same 7 random letters at the top of the screen.</li>
          <li>Type a word using only those letters (each letter can be used at most as many times as it appears) into your input box, then tap Submit (or press Enter).</li>
          <li>You have a time limit that depends on difficulty: 60 seconds on easy, 45 on medium, 30 on hard. If time runs out before you submit, you're scored with no word.</li>
          <li>Scoring: whoever's word is longer and valid wins. If both words are the same length, whoever submitted first wins the tiebreak. An invalid (not-a-real-word) or misspelled entry scores as if you submitted nothing.</li>
          <li>In Pass & Play, both players type on the same device at the same time — your input box shows dots instead of letters so the other player can't read your word over your shoulder while they type theirs.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot (harder bots submit faster and find longer words). <strong>Pass & Play</strong> lets two people play head-to-head on this device.</p>
      </HowToPlay>

      {/* Letters */}
      <div style={{ display: 'flex', gap: 'clamp(4px, 2vw, 8px)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        {letters.map((l, i) => (
          <div key={i} style={{
            width: 'clamp(34px, 11vw, 52px)', height: 'clamp(39px, 12.7vw, 60px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)',
            border: '2px solid var(--accent)',
            borderRadius: 8,
            fontSize: 'clamp(17px, 5.5vw, 26px)', fontWeight: 800,
            color: 'var(--text)',
          }}>
            {l}
          </div>
        ))}
      </div>

      {/* Timer */}
      {phase === 'playing' && (
        <div style={{
          fontSize: 48, fontWeight: 900, textAlign: 'center',
          color: urgent ? 'var(--danger)' : 'var(--text)',
          animation: urgent ? 'pulse-timer 0.6s ease-in-out infinite alternate' : 'none',
          marginBottom: 20,
        }}>
          {timeLeft}s
        </div>
      )}

      {phase === 'result' && (
        <div className="game-msg success" style={{ marginBottom: 20 }}>{winnerMsg}</div>
      )}

      {/* Input areas */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Player 1 */}
        <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{p1label}</div>
          {phase === 'result' ? (
            <div style={{
              padding: '12px 16px',
              background: isValidWord(p1Word, letters) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `2px solid ${isValidWord(p1Word, letters) ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius: 8,
              fontSize: 20, fontWeight: 800, textTransform: 'uppercase',
            }}>
              {p1Word || '(no submission)'}
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: 'var(--muted)' }}>
                {p1Word ? (isValidWord(p1Word, letters) ? `Valid — ${p1Word.trim().length} letters` : 'Invalid word') : '—'}
              </div>
            </div>
          ) : p1Submitted ? (
            <div className="game-msg success">Submitted! Waiting...</div>
          ) : (
            <>
              <input
                className="gs-input"
                type={mode === 'local' ? 'password' : 'text'}
                value={p1Input}
                onChange={e => setP1Input(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && submitP1()}
                placeholder="Type your word..."
                style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontSize: 16 }}
                disabled={p1Submitted}
              />
              <button className="gs-btn gs-btn-primary" style={{ width: '100%' }} onClick={submitP1} disabled={!p1Input.trim()}>
                Submit
              </button>
            </>
          )}
        </div>

        {/* Player 2 / Bot */}
        {!isBot && (
          <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{p2label}</div>
            {phase === 'result' ? (
              <div style={{
                padding: '12px 16px',
                background: isValidWord(p2Word, letters) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `2px solid ${isValidWord(p2Word, letters) ? 'var(--success)' : 'var(--danger)'}`,
                borderRadius: 8,
                fontSize: 20, fontWeight: 800, textTransform: 'uppercase',
              }}>
                {p2Word || '(no submission)'}
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: 'var(--muted)' }}>
                  {p2Word ? (isValidWord(p2Word, letters) ? `Valid — ${p2Word.trim().length} letters` : 'Invalid word') : '—'}
                </div>
              </div>
            ) : p2Submitted ? (
              <div className="game-msg success">Submitted! Waiting...</div>
            ) : (
              <>
                <input
                  className="gs-input"
                  type={mode === 'local' ? 'password' : 'text'}
                  value={p2Input}
                  onChange={e => setP2Input(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && submitP2()}
                  placeholder="Type your word..."
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontSize: 16 }}
                  disabled={p2Submitted}
                />
                <button className="gs-btn gs-btn-primary" style={{ width: '100%' }} onClick={submitP2} disabled={!p2Input.trim()}>
                  Submit
                </button>
              </>
            )}
          </div>
        )}

        {isBot && phase === 'playing' && (
          <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{p2label}</div>
            <div className="game-msg info">
              {p2Submitted ? 'Computer submitted!' : 'Computer is thinking...'}
            </div>
          </div>
        )}

        {isBot && phase === 'result' && (
          <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{p2label}</div>
            <div style={{
              padding: '12px 16px',
              background: isValidWord(p2Word, letters) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `2px solid ${isValidWord(p2Word, letters) ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius: 8,
              fontSize: 20, fontWeight: 800, textTransform: 'uppercase',
            }}>
              {p2Word || '(no submission)'}
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: 'var(--muted)' }}>
                {p2Word ? (isValidWord(p2Word, letters) ? `Valid — ${p2Word.trim().length} letters` : 'Invalid word') : '—'}
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === 'result' && (
        <div className="game-controls">
          <button className="gs-btn gs-btn-outline" onClick={reset}>Play Again</button>
        </div>
      )}

      <div style={{ marginTop: 20, padding: '10px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', maxWidth: 500, margin: '20px auto 0' }}>
        <strong>Rules:</strong> Both players see the same 7 letters. Make the longest valid English word using only those letters. Longer word wins. Tiebreak: who submitted first.
      </div>
    </div>
  );
}
