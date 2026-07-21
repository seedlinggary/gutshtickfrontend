// Daily "Categories" puzzle bank — NYT Connections-style: 16 words sorted into
// 4 hidden groups of 4. Difficulty color climbs yellow (straightforward) →
// green → blue → purple (trickiest, usually wordplay/double-meaning), same
// convention as the game that popularized this format. One puzzle is shown
// per calendar day (see Categories.js's date-seeded picker) — the bank cycles
// once every PUZZLES.length days, so keep this list growing over time rather
// than shipping it small.
const PUZZLES = [
  { groups: [
    { category: 'COFFEE ORDERS', color: 'yellow', words: ['LATTE', 'MOCHA', 'CORTADO', 'AMERICANO'] },
    { category: 'CARD GAMES', color: 'green', words: ['RUMMY', 'HEARTS', 'SPADES', 'EUCHRE'] },
    { category: 'THINGS WITH A SPINE', color: 'blue', words: ['BOOK', 'CACTUS', 'HUMAN', 'ANTHOLOGY'] },
    { category: 'SOUND LIKE NUMBERS', color: 'purple', words: ['WON', 'FOR', 'ATE', 'TOO'] },
  ] },
  { groups: [
    { category: 'PIZZA TOPPINGS', color: 'yellow', words: ['PEPPERONI', 'MUSHROOM', 'OLIVE', 'BASIL'] },
    { category: 'TYPES OF BEAR', color: 'green', words: ['GRIZZLY', 'POLAR', 'PANDA', 'KOALA'] },
    { category: 'WHAT A JUDGE BANGS', color: 'blue', words: ['GAVEL', 'HAMMER', 'MALLET', 'FIST'] },
    { category: '___ SCHOOL', color: 'purple', words: ['HIGH', 'OLD', 'GRAD', 'FISH'] },
  ] },
  { groups: [
    { category: 'ICE CREAM FLAVORS', color: 'yellow', words: ['VANILLA', 'PISTACHIO', 'ROCKY ROAD', 'SHERBET'] },
    { category: 'CHESS PIECES', color: 'green', words: ['BISHOP', 'KNIGHT', 'ROOK', 'PAWN'] },
    { category: 'WORDS BEFORE "STORM"', color: 'blue', words: ['BRAIN', 'THUNDER', 'SAND', 'FIRE'] },
    { category: 'HOMOPHONES OF BIRDS', color: 'purple', words: ['TOUCAN', 'RAVEN', 'HERON', 'DOE'] },
  ] },
  { groups: [
    { category: 'SANDWICH BREADS', color: 'yellow', words: ['RYE', 'PITA', 'BAGEL', 'CIABATTA'] },
    { category: 'BOARD GAME PIECES', color: 'green', words: ['THIMBLE', 'TOP HAT', 'DICE', 'TOKEN'] },
    { category: 'THINGS THAT GET "CRACKED"', color: 'blue', words: ['JOKE', 'CODE', 'KNUCKLE', 'EGG'] },
    { category: 'SOUND LIKE LETTERS', color: 'purple', words: ['SEA', 'BEE', 'WHY', 'ARE'] },
  ] },
  { groups: [
    { category: 'TYPES OF DANCE', color: 'yellow', words: ['TANGO', 'WALTZ', 'SALSA', 'FOXTROT'] },
    { category: 'KITCHEN UTENSILS', color: 'green', words: ['WHISK', 'LADLE', 'SPATULA', 'TONGS'] },
    { category: 'WORDS BEFORE "LIGHT"', color: 'blue', words: ['SPOT', 'MOON', 'DAY', 'FLASH'] },
    { category: 'PALINDROMES', color: 'purple', words: ['LEVEL', 'RADAR', 'KAYAK', 'ROTOR'] },
  ] },
  { groups: [
    { category: 'DELI MEATS', color: 'yellow', words: ['PASTRAMI', 'SALAMI', 'BOLOGNA', 'CORNED BEEF'] },
    { category: 'MONOPOLY LOCATIONS', color: 'green', words: ['BOARDWALK', 'JAIL', 'PARK PLACE', 'GO'] },
    { category: 'THINGS THAT CAN BE "GRAND"', color: 'blue', words: ['PIANO', 'CANYON', 'SLAM', 'PRIZE'] },
    { category: 'HOMOPHONES OF BODY PARTS', color: 'purple', words: ['SOLE', 'HEEL', 'HAIR', 'WAIST'] },
  ] },
  { groups: [
    { category: 'TYPES OF CLOUDS', color: 'yellow', words: ['CUMULUS', 'CIRRUS', 'STRATUS', 'NIMBUS'] },
    { category: 'FAMOUS DUOS', color: 'green', words: ['SALT AND PEPPER', 'THUNDER AND LIGHTNING', 'BREAD AND BUTTER', 'PEN AND PAPER'] },
    { category: 'WORDS BEFORE "BALL"', color: 'blue', words: ['BASKET', 'MEAT', 'SNOW', 'ODD'] },
    { category: 'SILENT LETTER STARTS', color: 'purple', words: ['KNIGHT', 'GNOME', 'WRIST', 'PSALM'] },
  ] },
  { groups: [
    { category: 'FARM ANIMALS', color: 'yellow', words: ['ROOSTER', 'GOAT', 'DONKEY', 'PIG'] },
    { category: 'TYPES OF KNOTS', color: 'green', words: ['SQUARE', 'GRANNY', 'SLIP', 'BOWLINE'] },
    { category: 'THINGS THAT CAN BE "STALE"', color: 'blue', words: ['BREAD', 'JOKE', 'AIR', 'NEWS'] },
    { category: 'ANAGRAMS OF FRUITS', color: 'purple', words: ['MULP', 'GAREON', 'RAPEG', 'ANABAN'] },
  ] },
  { groups: [
    { category: 'SOUP VARIETIES', color: 'yellow', words: ['MATZO BALL', 'MINESTRONE', 'BISQUE', 'CHOWDER'] },
    { category: 'TOOLS IN A TOOLBOX', color: 'green', words: ['WRENCH', 'PLIERS', 'CHISEL', 'AWL'] },
    { category: 'WORDS BEFORE "CUT"', color: 'blue', words: ['SHORT', 'CLEAR', 'CRAZY', 'UPPER'] },
    { category: 'CONTAIN A SMALLER ANIMAL', color: 'purple', words: ['CATERPILLAR', 'HAMSTRING', 'DOGMA', 'RATIO'] },
  ] },
  { groups: [
    { category: 'TYPES OF HATS', color: 'yellow', words: ['FEDORA', 'BERET', 'BEANIE', 'BOWLER'] },
    { category: 'THINGS IN A TOOLBOX FOR WRITING', color: 'green', words: ['QUILL', 'STYLUS', 'MARKER', 'CHALK'] },
    { category: 'WORDS AFTER "SNAP"', color: 'blue', words: ['SHOT', 'DRAGON', 'CHAT', 'JUDGMENT'] },
    { category: 'SYNONYMS FOR "STINGY"', color: 'purple', words: ['CHEAP', 'TIGHT', 'FRUGAL', 'MISERLY'] },
  ] },
  { groups: [
    { category: 'PASTA SHAPES', color: 'yellow', words: ['PENNE', 'FUSILLI', 'ORZO', 'ROTINI'] },
    { category: 'THINGS THAT "RING"', color: 'green', words: ['DOORBELL', 'PHONE', 'ALARM', 'BOXING'] },
    { category: 'WORDS BEFORE "HOUSE"', color: 'blue', words: ['GREEN', 'PENT', 'DOLL', 'FIRE'] },
    { category: 'START WITH SILENT "H"', color: 'purple', words: ['HOUR', 'HONEST', 'HEIR', 'HERB'] },
  ] },
  { groups: [
    { category: 'TYPES OF BOATS', color: 'yellow', words: ['CANOE', 'KAYAK', 'YACHT', 'FERRY'] },
    { category: 'THINGS THAT ARE "SHARP"', color: 'green', words: ['KNIFE', 'WIT', 'PAIN', 'CHEDDAR'] },
    { category: 'WORDS BEFORE "WORK"', color: 'blue', words: ['HOME', 'NET', 'FRAME', 'ARTHUR'] },
    { category: 'BAGEL TOPPINGS', color: 'purple', words: ['LOX', 'SCHMEAR', 'CAPER', 'CHIVE'] },
  ] },
  { groups: [
    { category: 'PLANETS', color: 'yellow', words: ['VENUS', 'MARS', 'SATURN', 'NEPTUNE'] },
    { category: 'CHESS OPENINGS', color: 'green', words: ['SICILIAN', 'CARO-KANN', 'RUY LOPEZ', 'FRENCH'] },
    { category: 'WORDS BEFORE "PRINT"', color: 'blue', words: ['FOOT', 'FINGER', 'BLUE', 'NEWS'] },
    { category: 'ROMAN NUMERALS HIDING IN WORDS', color: 'purple', words: ['LIVID', 'MIXER', 'CIVIL', 'VIXEN'] },
  ] },
  { groups: [
    { category: 'TYPES OF PASTRY', color: 'yellow', words: ['CROISSANT', 'STRUDEL', 'ECLAIR', 'RUGELACH'] },
    { category: 'BASKETBALL TERMS', color: 'green', words: ['REBOUND', 'AIRBALL', 'DUNK', 'TRAVEL'] },
    { category: 'WORDS BEFORE "SIDE"', color: 'blue', words: ['CURB', 'SEA', 'BLIND', 'DOWN'] },
    { category: 'DAYS OF THE WEEK IN OTHER LANGUAGES', color: 'purple', words: ['LUNES', 'MARDI', 'SONNTAG', 'SHABBAT'] },
  ] },
  { groups: [
    { category: 'ZODIAC SIGNS', color: 'yellow', words: ['ARIES', 'TAURUS', 'GEMINI', 'LEO'] },
    { category: 'THINGS WITH KEYS', color: 'green', words: ['PIANO', 'KEYBOARD', 'MAP', 'CAR'] },
    { category: 'WORDS BEFORE "BOARD"', color: 'blue', words: ['SURF', 'CHESS', 'CARD', 'KEY'] },
    { category: 'SOUND LIKE TWO WORDS', color: 'purple', words: ['INVEST', 'ATTIRE', 'AVENUE', 'ANYONE'] },
  ] },
  { groups: [
    { category: 'HERBS AND SPICES', color: 'yellow', words: ['PAPRIKA', 'OREGANO', 'CUMIN', 'DILL'] },
    { category: 'THINGS THAT GET "SHUFFLED"', color: 'green', words: ['CARDS', 'FEET', 'PLAYLIST', 'PAPERS'] },
    { category: 'WORDS BEFORE "MARK"', color: 'blue', words: ['BOOK', 'TRADE', 'BENCH', 'LAND'] },
    { category: 'CONTAIN A COLOR', color: 'purple', words: ['GREENHOUSE', 'REDACT', 'BLUEPRINT', 'GOLDFISH'] },
  ] },
  { groups: [
    { category: 'DOG BREEDS', color: 'yellow', words: ['BEAGLE', 'POODLE', 'BOXER', 'COLLIE'] },
    { category: 'PARTS OF A SHOE', color: 'green', words: ['SOLE', 'LACE', 'TONGUE', 'HEEL'] },
    { category: 'WORDS BEFORE "BREAKER"', color: 'blue', words: ['ICE', 'DEAL', 'RECORD', 'CIRCUIT'] },
    { category: 'FOODS THAT ARE ALSO VERBS', color: 'purple', words: ['DATE', 'ORANGE', 'GRILL', 'FISH'] },
  ] },
  { groups: [
    { category: 'TYPES OF TEA', color: 'yellow', words: ['CHAMOMILE', 'OOLONG', 'MATCHA', 'EARL GREY'] },
    { category: 'WEDDING TRADITIONS', color: 'green', words: ['BOUQUET', 'TOAST', 'VOWS', 'CHUPPAH'] },
    { category: 'WORDS BEFORE "STONE"', color: 'blue', words: ['MILE', 'CORNER', 'GEM', 'LIME'] },
    { category: 'HIDDEN SMALL NUMBERS', color: 'purple', words: ['TENNIS', 'ATTEND', 'SONATA', 'ONETIME'] },
  ] },
  { groups: [
    { category: 'BREAKFAST FOODS', color: 'yellow', words: ['PANCAKE', 'OMELET', 'WAFFLE', 'GRANOLA'] },
    { category: 'THINGS THAT CAN BE "STEEP"', color: 'green', words: ['HILL', 'PRICE', 'TEA', 'LEARNING CURVE'] },
    { category: 'WORDS BEFORE "ROOM"', color: 'blue', words: ['MUSH', 'BATH', 'CLASS', 'LOCKER'] },
    { category: 'YIDDISH WORDS IN ENGLISH', color: 'purple', words: ['CHUTZPAH', 'KLUTZ', 'SCHMOOZE', 'GLITCH'] },
  ] },
  { groups: [
    { category: 'CITRUS FRUITS', color: 'yellow', words: ['LEMON', 'LIME', 'GRAPEFRUIT', 'TANGERINE'] },
    { category: 'THINGS WITH A "TRUNK"', color: 'green', words: ['ELEPHANT', 'TREE', 'CAR', 'SWIM'] },
    { category: 'WORDS BEFORE "FALL"', color: 'blue', words: ['WATER', 'PIT', 'RAIN', 'NIGHT'] },
    { category: 'CONTAIN A SMALLER BODY OF WATER', color: 'purple', words: ['SEAWEED', 'LAKESIDE', 'BAYONET', 'PONDER'] },
  ] },
  { groups: [
    { category: 'TYPES OF PASTA SAUCE', color: 'yellow', words: ['MARINARA', 'ALFREDO', 'PESTO', 'BOLOGNESE'] },
    { category: 'THINGS AT A CARNIVAL', color: 'green', words: ['FERRIS WHEEL', 'COTTON CANDY', 'CAROUSEL', 'TICKET'] },
    { category: 'WORDS BEFORE "LINE"', color: 'blue', words: ['DEAD', 'BASE', 'PUNCH', 'HAIR'] },
    { category: 'ONE LETTER OFF FROM A COUNTRY', color: 'purple', words: ['CHILE', 'IRAN', 'CHAD', 'TURKEY'] },
  ] },
  { groups: [
    { category: 'TYPES OF SANDWICHES', color: 'yellow', words: ['REUBEN', 'CLUB', 'GYRO', 'PANINI'] },
    { category: 'WAYS TO COOK AN EGG', color: 'green', words: ['POACHED', 'SCRAMBLED', 'SUNNY SIDE UP', 'HARD-BOILED'] },
    { category: 'WORDS BEFORE "BURN"', color: 'blue', words: ['SUN', 'HEART', 'FREEZER', 'SLOW'] },
    { category: 'FAMOUS BAGEL SHOP EXPRESSIONS', color: 'purple', words: ['SCHMEAR', 'NOSH', 'TOASTED', 'EVERYTHING'] },
  ] },
  { groups: [
    { category: 'THINGS IN A GARDEN', color: 'yellow', words: ['TROWEL', 'HOSE', 'TRELLIS', 'COMPOST'] },
    { category: 'MOVIE GENRES', color: 'green', words: ['THRILLER', 'ROM-COM', 'WESTERN', 'DOCUMENTARY'] },
    { category: 'WORDS BEFORE "OVER"', color: 'blue', words: ['MAKE', 'TAKE', 'LEFT', 'SLEEP'] },
    { category: 'CAN FOLLOW "SUN"', color: 'purple', words: ['FLOWER', 'GLASSES', 'BURN', 'DIAL'] },
  ] },
  { groups: [
    { category: 'ROOT VEGETABLES', color: 'yellow', words: ['CARROT', 'BEET', 'TURNIP', 'RADISH'] },
    { category: 'THINGS THAT "CHIME"', color: 'green', words: ['CLOCK', 'DOORBELL', 'WIND CHIME', 'BELL'] },
    { category: 'WORDS BEFORE "KEEPER"', color: 'blue', words: ['GATE', 'BEE', 'ZOO', 'HOUSE'] },
    { category: 'HOMOPHONES OF WEATHER WORDS', color: 'purple', words: ['REIGN', 'HEIR', 'MIST', 'HAIL'] },
  ] },
  { groups: [
    { category: 'MUSICAL INSTRUMENTS', color: 'yellow', words: ['CLARINET', 'TROMBONE', 'CELLO', 'ACCORDION'] },
    { category: 'THINGS THAT ARE "BAKED"', color: 'green', words: ['BREAD', 'POTATO', 'ALASKA', 'GOODS'] },
    { category: 'WORDS BEFORE "SCRAPER"', color: 'blue', words: ['SKY', 'ICE', 'WIND', 'MUD'] },
    { category: 'JEWISH HOLIDAYS, SLIGHTLY MISSPELLED', color: 'purple', words: ['PURRIM', 'SHAVUOTT', 'SUKOTH', 'CHANUKKA'] },
  ] },
  { groups: [
    { category: 'TYPES OF NUTS', color: 'yellow', words: ['PISTACHIO', 'CASHEW', 'PECAN', 'HAZELNUT'] },
    { category: 'THINGS THAT CAN BE "CRACKED"', color: 'green', words: ['NUT', 'CODE', 'RIB', 'WHIP'] },
    { category: 'WORDS AFTER "OVER"', color: 'blue', words: ['TIME', 'BOARD', 'SIGHT', 'HAUL'] },
    { category: 'CONTAIN A UTENSIL', color: 'purple', words: ['FORKLIFT', 'SPOONFUL', 'KNIFELIKE', 'LADLED'] },
  ] },
  { groups: [
    { category: 'TYPES OF BRIDGE', color: 'yellow', words: ['SUSPENSION', 'DRAWBRIDGE', 'ARCH', 'BEAM'] },
    { category: 'THINGS THAT "FOLD"', color: 'green', words: ['LAUNDRY', 'POKER HAND', 'CHAIR', 'BATTER'] },
    { category: 'WORDS BEFORE "WALK"', color: 'blue', words: ['BOARD', 'CAT', 'JAY', 'SLEEP'] },
    { category: 'ANAGRAMS OF "LISTEN"', color: 'purple', words: ['SILENT', 'TINSEL', 'ENLIST', 'INLETS'] },
  ] },
  { groups: [
    { category: 'TYPES OF SALAD', color: 'yellow', words: ['CAESAR', 'COBB', 'GREEK', 'WALDORF'] },
    { category: 'THINGS THAT "SIMMER"', color: 'green', words: ['SOUP', 'SAUCE', 'TENSION', 'STEW'] },
    { category: 'WORDS BEFORE "POINT"', color: 'blue', words: ['VIEW', 'CHECK', 'PIN', 'MATCH'] },
    { category: 'DELI COUNTER LINGO', color: 'purple', words: ['NUMBER', 'HALF-POUND', 'SLICED THIN', 'ON RYE'] },
  ] },
  { groups: [
    { category: 'PARTS OF A TREE', color: 'yellow', words: ['TRUNK', 'BRANCH', 'ROOT', 'BARK'] },
    { category: 'THINGS A DOG DOES', color: 'green', words: ['FETCH', 'BEG', 'ROLL OVER', 'HOWL'] },
    { category: 'WORDS BEFORE "YARD"', color: 'blue', words: ['BACK', 'JUNK', 'COURT', 'GRAVE'] },
    { category: 'CONTAIN A HIDDEN INSECT', color: 'purple', words: ['BEELINE', 'ANTIQUE', 'WASPISH', 'MOTHER'] },
  ] },
];

// Deterministic date → puzzle index, same for every visitor. Uses local
// calendar date (YYYY-MM-DD), not a UTC timestamp, so the puzzle changes at
// local midnight the way a "daily" game is expected to, not at a fixed UTC
// hour that could roll over mid-afternoon somewhere.
export function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function puzzleForDate(dateKey) {
  const idx = hashString(dateKey) % PUZZLES.length;
  return PUZZLES[idx];
}

export function randomPuzzle(excludeIdx) {
  let idx = Math.floor(Math.random() * PUZZLES.length);
  if (PUZZLES.length > 1 && idx === excludeIdx) idx = (idx + 1) % PUZZLES.length;
  return PUZZLES[idx];
}

export default PUZZLES;
