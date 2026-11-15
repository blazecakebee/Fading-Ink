// Countries: economy (salary/price multiplier), danger, qi density (how rich the land is in spiritual energy)
// and culturally accurate name pools.
export const COUNTRIES = [
  { id: 'cn', name: 'China', city: ['Chongqing', 'Hangzhou', 'Xi\'an', 'Chengdu'], econ: 0.9, danger: 0.3, qi: 1.4, currency: '¥',
    m: ['Wei', 'Hao', 'Jun', 'Lei', 'Feng', 'Long', 'Chen', 'Yu', 'Tian', 'Zhen'], f: ['Mei', 'Lan', 'Xiu', 'Ying', 'Hua', 'Lian', 'Yue', 'Ning', 'Xue', 'Ling'],
    last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Lin', 'Xu'] },
  { id: 'kr', name: 'South Korea', city: ['Seoul', 'Busan', 'Incheon', 'Daegu'], econ: 1.15, danger: 0.25, qi: 1.25, currency: '₩',
    m: ['Min-jun', 'Ji-ho', 'Seo-jun', 'Do-yun', 'Jin-woo', 'Tae-yang', 'Hyun-woo'], f: ['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Yuna', 'Soo-ah', 'Min-ji', 'Chae-won'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Han'] },
  { id: 'jp', name: 'Japan', city: ['Tokyo', 'Osaka', 'Kyoto', 'Sapporo'], econ: 1.2, danger: 0.15, qi: 1.2, currency: '¥',
    m: ['Haruto', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Riku', 'Daichi', 'Akira'], f: ['Yui', 'Hina', 'Sakura', 'Aoi', 'Rin', 'Mio', 'Hana', 'Akari'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Yamamoto'] },
  { id: 'us', name: 'United States', city: ['New York', 'Chicago', 'Los Angeles', 'Houston'], econ: 1.5, danger: 0.35, qi: 0.7, currency: '$',
    m: ['James', 'Liam', 'Noah', 'Ethan', 'Mason', 'Logan', 'Caleb', 'Tyler'], f: ['Emma', 'Olivia', 'Ava', 'Madison', 'Harper', 'Chloe', 'Riley', 'Abigail'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore'] },
  { id: 'gb', name: 'United Kingdom', city: ['London', 'Manchester', 'Leeds', 'Bristol'], econ: 1.35, danger: 0.2, qi: 0.8, currency: '£',
    m: ['Oliver', 'George', 'Harry', 'Jack', 'Alfie', 'Freddie', 'Arthur'], f: ['Amelia', 'Isla', 'Poppy', 'Florence', 'Evie', 'Ivy', 'Rosie'],
    last: ['Taylor', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hughes', 'Clarke'] },
  { id: 'br', name: 'Brazil', city: ['São Paulo', 'Rio de Janeiro', 'Salvador', 'Recife'], econ: 0.65, danger: 0.55, qi: 1.0, currency: 'R$',
    m: ['Miguel', 'Arthur', 'Heitor', 'Davi', 'Gabriel', 'Bernardo', 'Rafael'], f: ['Helena', 'Alice', 'Laura', 'Valentina', 'Beatriz', 'Manuela'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Costa'] },
  { id: 'ng', name: 'Nigeria', city: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], econ: 0.4, danger: 0.5, qi: 1.1, currency: '₦',
    m: ['Chinedu', 'Emeka', 'Tunde', 'Oluwaseun', 'Ifeanyi', 'Musa', 'Kelechi'], f: ['Chiamaka', 'Ngozi', 'Adaeze', 'Funmilayo', 'Amara', 'Zainab'],
    last: ['Okafor', 'Adeyemi', 'Okonkwo', 'Bello', 'Eze', 'Balogun', 'Nwosu', 'Abubakar'] },
  { id: 'in', name: 'India', city: ['Mumbai', 'Delhi', 'Varanasi', 'Bengaluru'], econ: 0.5, danger: 0.35, qi: 1.35, currency: '₹',
    m: ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Kabir', 'Dev', 'Ishaan'], f: ['Aanya', 'Diya', 'Priya', 'Saanvi', 'Ananya', 'Kavya', 'Meera'],
    last: ['Sharma', 'Patel', 'Singh', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Das', 'Mehta'] },
  { id: 'ru', name: 'Russia', city: ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk'], econ: 0.75, danger: 0.45, qi: 0.9, currency: '₽',
    m: ['Alexei', 'Dmitri', 'Ivan', 'Mikhail', 'Nikolai', 'Sergei', 'Artyom'], f: ['Anastasia', 'Sofia', 'Daria', 'Polina', 'Yelena', 'Katya'],
    last: ['Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Volkov', 'Morozov', 'Sokolov'] , fem: s => s + 'a' },
  { id: 'mx', name: 'Mexico', city: ['Mexico City', 'Guadalajara', 'Monterrey', 'Oaxaca'], econ: 0.6, danger: 0.5, qi: 1.05, currency: '$',
    m: ['Santiago', 'Mateo', 'Diego', 'Emiliano', 'Leonardo', 'Alejandro'], f: ['Sofía', 'Valeria', 'Ximena', 'Camila', 'Regina', 'Lucía'],
    last: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Ramírez', 'Flores'] },
  { id: 'fr', name: 'France', city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'], econ: 1.3, danger: 0.2, qi: 0.85, currency: '€',
    m: ['Louis', 'Gabriel', 'Jules', 'Hugo', 'Lucas', 'Théo', 'Raphaël'], f: ['Jade', 'Louise', 'Emma', 'Chloé', 'Léa', 'Manon', 'Camille'],
    last: ['Martin', 'Bernard', 'Dubois', 'Durand', 'Lefebvre', 'Moreau', 'Laurent', 'Fontaine'] },
  { id: 'eg', name: 'Egypt', city: ['Cairo', 'Alexandria', 'Luxor', 'Giza'], econ: 0.45, danger: 0.35, qi: 1.3, currency: 'E£',
    m: ['Omar', 'Youssef', 'Ahmed', 'Karim', 'Mostafa', 'Tarek', 'Hassan'], f: ['Nour', 'Mariam', 'Farida', 'Salma', 'Habiba', 'Layla', 'Yasmin'],
    last: ['Hassan', 'Mahmoud', 'Ibrahim', 'Mostafa', 'Abdelrahman', 'Farouk', 'Saleh'] },
];

// Starting wealth classes ("you play the hand you are dealt")
export const WEALTH = [
  { id: 'destitute', name: 'Destitute', money: [0, 50], weight: 10, parentsMoney: [0, 500] },
  { id: 'poor', name: 'Poor', money: [20, 200], weight: 22, parentsMoney: [500, 5000] },
  { id: 'working', name: 'Working Class', money: [50, 400], weight: 28, parentsMoney: [5000, 30000] },
  { id: 'middle', name: 'Middle Class', money: [100, 800], weight: 24, parentsMoney: [30000, 150000] },
  { id: 'wealthy', name: 'Wealthy', money: [500, 3000], weight: 10, parentsMoney: [150000, 1e6] },
  { id: 'rich', name: 'Rich', money: [2000, 10000], weight: 5, parentsMoney: [1e6, 2e7] },
  { id: 'royal', name: 'Royalty', money: [10000, 50000], weight: 1, parentsMoney: [5e7, 5e8] },
];

export const ERAS = ['The Peaceful Era', 'The Age of Gates', 'The Silent Sect War', 'The Neon Dynasty', 'The Fading'];
