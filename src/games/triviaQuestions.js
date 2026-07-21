// Trivia Rush question bank. Deliberately evergreen (no current-events or
// time-sensitive facts) so this never goes stale without maintenance.
// Each day samples QUESTIONS_PER_DAY questions from this bank via a
// date-seeded shuffle (see todaysQuestions() below) rather than needing a
// literal hand-authored set per day -- the bank just needs to be large
// enough that the combination of "which 10 + what order" doesn't feel
// repetitive for a long stretch, which a much smaller pool than Categories'
// needs to achieve the same effect.
const QUESTIONS = [
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1, cat: 'Science' },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3, cat: 'Geography' },
  { q: 'How many strings does a standard violin have?', options: ['4', '5', '6', '8'], answer: 0, cat: 'Music' },
  { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2, cat: 'Science' },
  { q: 'Which country has the most natural lakes?', options: ['USA', 'Russia', 'Canada', 'Finland'], answer: 2, cat: 'Geography' },
  { q: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'], answer: 1, cat: 'Literature' },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2, cat: 'Math' },
  { q: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer: 2, cat: 'Science' },
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2, cat: 'Geography' },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2, cat: 'Geography' },
  { q: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2, cat: 'Science' },
  { q: 'Which organ pumps blood through the human body?', options: ['Liver', 'Lungs', 'Heart', 'Kidney'], answer: 2, cat: 'Science' },
  { q: 'In what year did the Titanic sink?', options: ['1905', '1912', '1918', '1923'], answer: 1, cat: 'History' },
  { q: 'What is the tallest mountain in the world?', options: ['K2', 'Kilimanjaro', 'Denali', 'Everest'], answer: 3, cat: 'Geography' },
  { q: 'How many players are on a soccer team on the field at once?', options: ['9', '10', '11', '12'], answer: 2, cat: 'Sports' },
  { q: 'What is the main ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Onion', 'Lime'], answer: 1, cat: 'Food' },
  { q: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Mars', 'Uranus'], answer: 1, cat: 'Science' },
  { q: 'What language has the most native speakers worldwide?', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], answer: 2, cat: 'Language' },
  { q: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], answer: 1, cat: 'Art' },
  { q: 'What is the freezing point of water in Celsius?', options: ['-10°', '0°', '10°', '32°'], answer: 1, cat: 'Science' },
  { q: 'Which country invented pizza as we know it today?', options: ['France', 'Greece', 'Italy', 'Spain'], answer: 2, cat: 'Food' },
  { q: 'How many bones are in the adult human body?', options: ['186', '206', '226', '246'], answer: 1, cat: 'Science' },
  { q: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], answer: 1, cat: 'Geography' },
  { q: 'Which shape has 8 sides?', options: ['Hexagon', 'Heptagon', 'Octagon', 'Pentagon'], answer: 2, cat: 'Math' },
  { q: 'What is the currency of Japan?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], answer: 2, cat: 'Geography' },
  { q: 'Which instrument has 88 keys?', options: ['Organ', 'Piano', 'Accordion', 'Harpsichord'], answer: 1, cat: 'Music' },
  { q: 'What do bees collect from flowers to make honey?', options: ['Pollen', 'Nectar', 'Sap', 'Dew'], answer: 1, cat: 'Science' },
  { q: 'How many time zones does mainland USA have?', options: ['3', '4', '5', '6'], answer: 1, cat: 'Geography' },
  { q: 'What is the largest mammal on Earth?', options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], answer: 1, cat: 'Science' },
  { q: 'Which of these is NOT a primary color of light?', options: ['Red', 'Green', 'Yellow', 'Blue'], answer: 2, cat: 'Science' },
  { q: 'What do you call a group of lions?', options: ['Pack', 'Herd', 'Pride', 'Flock'], answer: 2, cat: 'Nature' },
  { q: 'How many sides does a stop sign have?', options: ['6', '7', '8', '9'], answer: 2, cat: 'General' },
  { q: 'What is the smallest country in the world by area?', options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'], answer: 2, cat: 'Geography' },
  { q: 'Which sea creature has three hearts?', options: ['Shark', 'Octopus', 'Dolphin', 'Jellyfish'], answer: 1, cat: 'Science' },
  { q: 'What is the main gas found in the air we breathe?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], answer: 2, cat: 'Science' },
  { q: 'Who developed the theory of relativity?', options: ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Galileo Galilei'], answer: 1, cat: 'Science' },
  { q: 'What is the tallest land animal?', options: ['Elephant', 'Giraffe', 'Camel', 'Moose'], answer: 1, cat: 'Nature' },
  { q: 'How many colors are in a rainbow?', options: ['5', '6', '7', '8'], answer: 2, cat: 'General' },
  { q: 'What is the capital of Canada?', options: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], answer: 2, cat: 'Geography' },
  { q: 'Which fruit is known for keeping the doctor away?', options: ['Banana', 'Apple', 'Orange', 'Grape'], answer: 1, cat: 'Food' },
  { q: 'What do you call baby dogs?', options: ['Kits', 'Cubs', 'Puppies', 'Pups'], answer: 2, cat: 'Nature' },
  { q: 'How many minutes are in a full day?', options: ['1440', '1240', '1400', '1000'], answer: 0, cat: 'Math' },
  { q: 'Which country gifted the Statue of Liberty to the USA?', options: ['England', 'France', 'Spain', 'Netherlands'], answer: 1, cat: 'History' },
  { q: 'What is the study of weather called?', options: ['Geology', 'Meteorology', 'Astronomy', 'Ecology'], answer: 1, cat: 'Science' },
  { q: 'Which of these animals is a marsupial?', options: ['Koala', 'Panda', 'Sloth', 'Otter'], answer: 0, cat: 'Nature' },
  { q: 'What is the largest desert in the world?', options: ['Sahara', 'Gobi', 'Antarctic', 'Arabian'], answer: 2, cat: 'Geography' },
  { q: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], answer: 1, cat: 'Science' },
  { q: 'What is the national sport of Japan?', options: ['Karate', 'Judo', 'Sumo Wrestling', 'Baseball'], answer: 2, cat: 'Sports' },
  { q: 'Which planet is closest to the sun?', options: ['Venus', 'Earth', 'Mercury', 'Mars'], answer: 2, cat: 'Science' },
  { q: 'What is the main ingredient in traditional hummus?', options: ['Lentils', 'Chickpeas', 'Black Beans', 'Peas'], answer: 1, cat: 'Food' },
  { q: 'How many players are on a basketball team on the court at once?', options: ['4', '5', '6', '7'], answer: 1, cat: 'Sports' },
  { q: 'Which is the only mammal capable of true flight?', options: ['Flying Squirrel', 'Bat', 'Sugar Glider', 'Flying Fish'], answer: 1, cat: 'Science' },
  { q: 'What is the capital of Israel?', options: ['Tel Aviv', 'Haifa', 'Jerusalem', 'Eilat'], answer: 2, cat: 'Geography' },
  { q: 'How many squares are on a chessboard?', options: ['32', '48', '64', '81'], answer: 2, cat: 'Games' },
  { q: 'What do you call a shape with 5 sides?', options: ['Hexagon', 'Pentagon', 'Octagon', 'Nonagon'], answer: 1, cat: 'Math' },
  { q: 'Which fruit has its seeds on the outside?', options: ['Kiwi', 'Strawberry', 'Fig', 'Raspberry'], answer: 1, cat: 'Food' },
  { q: 'What is the largest organ in the human body?', options: ['Liver', 'Brain', 'Skin', 'Lungs'], answer: 2, cat: 'Science' },
  { q: 'Which country is home to the kangaroo in the wild?', options: ['South Africa', 'Australia', 'New Zealand', 'Brazil'], answer: 1, cat: 'Nature' },
  { q: 'How many wheels does a standard tricycle have?', options: ['2', '3', '4', '5'], answer: 1, cat: 'General' },
  { q: 'What is the speed of light approximately (in a vacuum)?', options: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s'], answer: 0, cat: 'Science' },
  { q: 'Which of these is the largest planet in our solar system?', options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], answer: 2, cat: 'Science' },
  { q: 'What do you call a word that is spelled the same forwards and backwards?', options: ['Homonym', 'Palindrome', 'Anagram', 'Synonym'], answer: 1, cat: 'Language' },
  { q: 'How many teeth does an adult human typically have?', options: ['28', '30', '32', '34'], answer: 2, cat: 'Science' },
  { q: 'Which continent is the Sahara Desert located on?', options: ['Asia', 'Africa', 'South America', 'Australia'], answer: 1, cat: 'Geography' },
  { q: 'What is the process by which plants make their own food called?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'], answer: 1, cat: 'Science' },
  { q: 'Which utensil is traditionally used to eat sushi?', options: ['Fork', 'Spoon', 'Chopsticks', 'Skewer'], answer: 2, cat: 'Food' },
  { q: 'What is the largest island in the world?', options: ['Madagascar', 'Borneo', 'Greenland', 'New Guinea'], answer: 2, cat: 'Geography' },
  { q: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], answer: 1, cat: 'Math' },
  { q: 'Which bird is known for its ability to mimic human speech?', options: ['Eagle', 'Parrot', 'Owl', 'Sparrow'], answer: 1, cat: 'Nature' },
  { q: 'What is the boiling point of water in Celsius at sea level?', options: ['90°', '100°', '110°', '120°'], answer: 1, cat: 'Science' },
  { q: 'Which sport is played at Wimbledon?', options: ['Golf', 'Cricket', 'Tennis', 'Rugby'], answer: 2, cat: 'Sports' },
  { q: 'What is the name of the galaxy that contains our solar system?', options: ['Andromeda', 'Milky Way', 'Whirlpool', 'Triangulum'], answer: 1, cat: 'Science' },
  { q: 'Which spice is derived from the crocus flower and is the most expensive by weight?', options: ['Paprika', 'Saffron', 'Turmeric', 'Cardamom'], answer: 1, cat: 'Food' },
  { q: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], answer: 2, cat: 'Science' },
  { q: 'What is the smallest unit of life?', options: ['Atom', 'Molecule', 'Cell', 'Tissue'], answer: 2, cat: 'Science' },
  { q: 'Which country has the largest population in the world?', options: ['USA', 'India', 'China', 'Indonesia'], answer: 1, cat: 'Geography' },
  { q: 'What do you call an animal that eats both plants and meat?', options: ['Herbivore', 'Carnivore', 'Omnivore', 'Insectivore'], answer: 2, cat: 'Nature' },
  { q: 'How many keys (black and white) does a standard piano have?', options: ['76', '88', '96', '108'], answer: 1, cat: 'Music' },
  { q: 'Which vegetable is the primary ingredient in a classic latke?', options: ['Carrot', 'Potato', 'Zucchini', 'Beet'], answer: 1, cat: 'Food' },
  { q: 'What is the name of Earth\'s natural satellite?', options: ['Mars', 'The Moon', 'Titan', 'Europa'], answer: 1, cat: 'Science' },
  { q: 'Which shape has no straight sides?', options: ['Square', 'Circle', 'Triangle', 'Rectangle'], answer: 1, cat: 'Math' },
  { q: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Gazelle'], answer: 1, cat: 'Nature' },
  { q: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'South Korea', 'Japan', 'Thailand'], answer: 2, cat: 'Geography' },
  { q: 'How many rings are on the Olympic flag?', options: ['4', '5', '6', '7'], answer: 1, cat: 'Sports' },
  { q: 'What is the powerhouse of the cell called?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Cytoplasm'], answer: 2, cat: 'Science' },
  { q: 'Which of these numbers is a perfect square?', options: ['20', '36', '48', '50'], answer: 1, cat: 'Math' },
  { q: 'What is the traditional bread eaten during Passover?', options: ['Challah', 'Matzah', 'Pita', 'Rye Bread'], answer: 1, cat: 'Food' },
  { q: 'Which animal is the largest species of big cat?', options: ['Lion', 'Tiger', 'Jaguar', 'Leopard'], answer: 1, cat: 'Nature' },
  { q: 'How many degrees are in a right angle?', options: ['45', '90', '180', '360'], answer: 1, cat: 'Math' },
  { q: 'What do you call the study of stars and planets?', options: ['Geology', 'Astronomy', 'Biology', 'Chemistry'], answer: 1, cat: 'Science' },
  { q: 'Which country is famous for inventing the sandwich?', options: ['France', 'England', 'Italy', 'Germany'], answer: 1, cat: 'Food' },
  { q: 'What is the tallest type of grass in the world?', options: ['Wheat', 'Bamboo', 'Corn', 'Sugarcane'], answer: 1, cat: 'Nature' },
  { q: 'How many strings does a standard acoustic guitar have?', options: ['4', '5', '6', '7'], answer: 2, cat: 'Music' },
  { q: 'Which ocean is the smallest in the world?', options: ['Indian', 'Atlantic', 'Southern', 'Arctic'], answer: 3, cat: 'Geography' },
  { q: 'What is the human body\'s largest bone?', options: ['Humerus', 'Femur', 'Tibia', 'Pelvis'], answer: 1, cat: 'Science' },
  { q: 'Which of these is a leap year?', options: ['2023', '2024', '2025', '2026'], answer: 1, cat: 'Math' },
  { q: 'What do you call a scientist who studies fossils?', options: ['Biologist', 'Paleontologist', 'Archaeologist', 'Geologist'], answer: 1, cat: 'Science' },
  { q: 'Which fruit is known as the "king of fruits" in Southeast Asia?', options: ['Mango', 'Durian', 'Dragonfruit', 'Lychee'], answer: 1, cat: 'Food' },
  { q: 'How many chambers does the human heart have?', options: ['2', '3', '4', '5'], answer: 2, cat: 'Science' },
];

const QUESTIONS_PER_DAY = 10;

export function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// A simple seeded PRNG (mulberry32) so "today's shuffle" is fully
// deterministic from the date string alone -- same for every visitor,
// reproducible on refresh, no server round-trip needed.
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function todaysQuestions(dateKey) {
  const rng = seededRandom(dateKey);
  return seededShuffle(QUESTIONS, rng).slice(0, QUESTIONS_PER_DAY);
}

export function practiceQuestions() {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUESTIONS_PER_DAY);
}

export default QUESTIONS;
