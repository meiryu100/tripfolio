/**
 * Demo community for local development (npm run db:seed). Seed photos use the
 * "seed:emoji:hue" scheme and render as illustrated covers.
 */

import travelers from "./seed-travelers.json";

export const SEED_PASSWORD = "tripfolio123";
export const DEMO_EMAIL = "demo@tripfolio.app";

export interface SeedUser {
  id: string;
  firstName: string;
  gender: "male" | "female";
  lastName: string;
  username: string;
  bio: string;
  location: string;
  visited: string[];
  wishlist: string[];
  isPrivate?: boolean;
  trips: Array<{
    country: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    cities?: string[];
    notes?: string;
    photoIds: string[];
  }>;
}

const photo = (emoji: string, hue: number) => `seed:${emoji}:${hue}`;

export const SEED_USERS: SeedUser[] = [
  {
    id: "u_demo",
    gender: "male",
    firstName: "Meir",
    lastName: "Yoshvaev",
    username: "meir",
    bio: "Traveling the world 🌎",
    location: "Tel Aviv",
    visited: ["JP", "IT", "GR", "FR", "ES", "PT", "TH", "US", "GB", "DE", "NL", "CZ", "HU", "AT", "CY", "TR", "GE", "AE", "MX", "VN", "KR", "HR", "ME", "IS", "CH", "BE", "IL"],
    wishlist: ["PE", "AR", "NZ", "AU", "ZA", "MA", "NO", "CA", "CL", "EG", "ID", "LK", "KE", "TZ", "BR", "IN", "CO", "PH"],
    trips: [
      { country: "JP", title: "Japan Adventure", startDate: "2025-03-12", endDate: "2025-03-25", cities: ["Tokyo", "Kyoto", "Osaka"], notes: "Japan was incredible. Cherry blossoms in Kyoto, ramen at 2am in Shinjuku, and the quietest morning of my life at Fushimi Inari.", photoIds: [photo("🗻", 350), photo("⛩️", 10), photo("🍜", 30), photo("🌸", 330), photo("🏯", 200), photo("🚅", 210), photo("🍣", 15), photo("🎋", 120)] },
      { country: "IT", title: "Amalfi & Rome", startDate: "2024-09-02", endDate: "2024-09-14", cities: ["Rome", "Positano", "Naples"], notes: "Pasta, lemons, and way too many stairs.", photoIds: [photo("🏛️", 30), photo("🍋", 55), photo("🍝", 20)] },
      { country: "GR", title: "Greek Islands", startDate: "2024-06-18", endDate: "2024-06-28", cities: ["Athens", "Santorini", "Naxos"], notes: "", photoIds: [photo("🏝️", 200), photo("⛵", 210)] },
      { country: "TH", title: "Thailand backpacking", startDate: "2023-12-01", endDate: "2023-12-22", cities: ["Bangkok", "Chiang Mai", "Koh Lanta"], notes: "Three weeks that felt like three months.", photoIds: [photo("🛕", 45), photo("🐘", 90), photo("🥭", 40)] },
      { country: "JP", title: "Japan 2023", startDate: "2023-04-02", endDate: "2023-04-09", cities: ["Tokyo"], notes: "First time in Tokyo.", photoIds: [photo("🗼", 0)] },
    ],
  },
  {
    id: "u_david",
    gender: "male",
    firstName: "David",
    lastName: "Cohen",
    username: "davidtravel",
    bio: "Exploring the world 🌎",
    location: "London",
    visited: ["JP", "IT", "TH", "FR", "ES", "US", "MX", "PE", "AR", "BR", "CL", "CO", "EC", "BO", "CR", "PA", "CU", "CA", "IS", "NO", "SE", "FI", "DK", "DE", "PL", "CZ", "AT", "HU", "HR", "SI", "GR", "TR", "EG", "MA", "ZA", "KE", "TZ", "IN", "NP", "LK", "VN", "KH", "LA", "MY", "SG", "ID", "PH", "AU", "NZ", "KR", "CN", "MN", "GB", "IE", "PT", "NL", "BE", "CH", "RO", "BG", "RS", "AL", "ME", "BA", "MK", "GE", "AM", "AZ", "UZ", "KZ", "KG", "JO", "IL", "AE", "OM", "QA", "TN", "NA", "BW", "ZW", "MG", "UY", "PY"],
    wishlist: ["BT", "IR", "PG", "FJ"],
    trips: [
      { country: "PE", title: "Inca Trail", startDate: "2025-07-04", endDate: "2025-07-15", cities: ["Cusco", "Machu Picchu", "Lima"], notes: "Four days of hiking to the most beautiful sunrise.", photoIds: [photo("🏔️", 140), photo("🦙", 30)] },
      { country: "IT", title: "Dolomites", startDate: "2025-05-10", endDate: "2025-05-17", cities: ["Cortina", "Bolzano"], photoIds: [photo("⛰️", 190)] },
      { country: "TH", title: "Island hopping", startDate: "2024-11-20", endDate: "2024-12-03", cities: ["Phuket", "Krabi"], photoIds: [photo("🏝️", 180), photo("🐠", 190)] },
      { country: "JP", title: "Hokkaido in winter", startDate: "2024-01-15", endDate: "2024-01-28", cities: ["Sapporo", "Niseko"], notes: "Powder snow and onsen.", photoIds: [photo("❄️", 210), photo("♨️", 20)] },
    ],
  },
  {
    id: "u_sarah",
    gender: "female",
    firstName: "Sarah",
    lastName: "Levi",
    username: "sarahwanders",
    bio: "Slow travel, good coffee ☕",
    location: "Berlin",
    visited: ["DE", "FR", "IT", "ES", "PT", "NL", "BE", "AT", "CH", "CZ", "PL", "DK", "SE", "NO", "GR", "HR", "MA", "JP", "KR", "VN", "TH", "ID", "US", "CA", "MX", "IS", "IE", "GB", "TR", "GE", "IL", "JO"],
    wishlist: ["PE", "CL", "NZ", "AU", "IN", "EG", "KE"],
    trips: [
      { country: "PT", title: "Lisbon slow week", startDate: "2025-08-03", endDate: "2025-08-10", cities: ["Lisbon", "Sintra"], notes: "Pastéis de nata count: 14.", photoIds: [photo("🚋", 45), photo("🥐", 35)] },
      { country: "MA", title: "Morocco", startDate: "2025-02-14", endDate: "2025-02-24", cities: ["Marrakech", "Fes", "Chefchaouen"], photoIds: [photo("🕌", 25), photo("🐪", 35), photo("🫖", 200)] },
      { country: "IS", title: "Ring Road", startDate: "2024-08-01", endDate: "2024-08-12", cities: ["Reykjavík", "Vík", "Akureyri"], notes: "Waterfalls every 20 minutes.", photoIds: [photo("🌋", 10), photo("🐋", 210)] },
    ],
  },
  {
    id: "u_noa",
    gender: "female",
    firstName: "Noa",
    lastName: "Ben-David",
    username: "noa.abroad",
    bio: "Mountains > beaches",
    location: "Haifa",
    visited: ["NP", "IN", "LK", "TH", "VN", "KH", "LA", "IL", "GR", "IT", "FR", "CH", "AT", "GE", "AM", "TR", "PE", "BO", "AR", "CL"],
    wishlist: ["JP", "NZ", "PK", "BT", "KG", "TJ", "IS"],
    trips: [
      { country: "NP", title: "Annapurna Circuit", startDate: "2025-04-01", endDate: "2025-04-21", cities: ["Pokhara", "Manang"], notes: "Thorong La at 5,416 m.", photoIds: [photo("🏔️", 220), photo("🙏", 30)] },
      { country: "GE", title: "Svaneti", startDate: "2024-07-10", endDate: "2024-07-18", cities: ["Mestia", "Ushguli"], photoIds: [photo("🏰", 120)] },
    ],
  },
  {
    id: "u_lucas",
    gender: "male",
    firstName: "Lucas",
    lastName: "Martin",
    username: "lucasgoes",
    bio: "Photographer. 1 backpack.",
    location: "Lyon",
    visited: ["FR", "ES", "IT", "GR", "HR", "ME", "AL", "BA", "RS", "HU", "RO", "BG", "TR", "EG", "JO", "MA", "TN", "SN", "GH", "ZA", "NA", "BW", "KE", "TZ", "UG", "RW", "ET", "MG", "MU", "IN", "LK", "MV", "AE", "OM", "US", "CU", "MX", "GT", "BZ", "CR", "NI", "HN", "CO", "EC"],
    wishlist: ["JP", "KR", "MN", "AU"],
    trips: [
      { country: "NA", title: "Namib desert", startDate: "2025-06-02", endDate: "2025-06-16", cities: ["Windhoek", "Sossusvlei", "Swakopmund"], notes: "Dune 45 at sunrise.", photoIds: [photo("🏜️", 25), photo("🦓", 40), photo("🌅", 15)] },
      { country: "GT", title: "Guatemala", startDate: "2024-10-05", endDate: "2024-10-19", cities: ["Antigua", "Lake Atitlán", "Tikal"], photoIds: [photo("🌋", 100), photo("🦜", 140)] },
    ],
  },
  {
    id: "u_maya",
    gender: "female",
    firstName: "Maya",
    lastName: "Rosen",
    username: "mayamaps",
    bio: "Private travel diary ✈️",
    location: "New York",
    isPrivate: true,
    visited: ["US", "CA", "MX", "GB", "FR", "IT", "ES", "JP"],
    wishlist: ["GR", "PT", "TH"],
    trips: [{ country: "MX", title: "Tulum", startDate: "2025-01-03", endDate: "2025-01-09", cities: ["Tulum"], photoIds: [photo("🌴", 170)] }],
  },
];

export const SEED_FOLLOWS: Array<[string, string, number]> = [
  // [follower, followee, daysAgo]
  ["u_david", "u_demo", 40],
  ["u_sarah", "u_demo", 22],
  ["u_demo", "u_david", 38],
  ["u_demo", "u_noa", 12],
  ["u_sarah", "u_david", 60],
  ["u_noa", "u_david", 50],
  ["u_lucas", "u_david", 30],
  ["u_maya", "u_david", 10],
  ["u_david", "u_lucas", 29],
  ["u_noa", "u_sarah", 20],
  ["u_lucas", "u_sarah", 18],
];


// ─── A traveler with real photos ─────────────────────────────────────────────

export interface CommonsPhoto {
  /** File name on Wikimedia Commons (without the "File:" prefix). */
  file: string;
  artist: string;
  license: string;
}

export interface PhotoTraveler {
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  username: string;
  email: string;
  bio: string;
  location: string;
  wishlist: string[];
  /** Usernames this traveler follows. */
  follows: string[];
  trips: Array<{
    country: string;
    title: string;
    startDate: string;
    endDate: string;
    cities: string[];
    notes: string;
    photos: CommonsPhoto[];
  }>;
}

/**
 * Travelers whose trips use freely licensed photos from Wikimedia Commons.
 * Photos are downloaded at seed time (not stored in the repo) and credited in
 * each trip, as CC BY / CC BY-SA require. The 20 community travelers live in
 * seed-travelers.json.
 */
export const PHOTO_TRAVELER: PhotoTraveler = {
  firstName: "Daniel",
  gender: "male",
  lastName: "Avraham",
  username: "daniel.wanders",
  email: "daniel@example.com",
  bio: "Chasing sunrises and street food 🌅",
  location: "Haifa, Israel",
  wishlist: ["NZ", "NO", "MA", "AR", "VN"],
  follows: ["meir", "davidtravel", "sarahwanders"],
  trips: [
    {
      country: "JP",
      title: "Autumn in Japan",
      startDate: "2024-11-08",
      endDate: "2024-11-21",
      cities: ["Tokyo", "Fujiyoshida", "Kyoto"],
      notes:
        "Climbed the 398 steps at Chureito at sunrise for that Fuji view, then got lost (happily) in the thousand torii of Fushimi Inari. Kiyomizu-dera in full autumn colour was unreal.",
      photos: [
        { file: "Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg", artist: "Basile Morin", license: "CC BY-SA 4.0" },
        { file: "Chureito Pagoda and Mount Fuji 2023-03-07.jpg", artist: "Stjepko Krehula", license: "CC BY 4.0" },
        { file: "Kiyomizu-dera, Kyoto, November 2016 -01.jpg", artist: "Martin Falbisoner", license: "CC BY-SA 4.0" },
      ],
    },
    {
      country: "PE",
      title: "Andes & Machu Picchu",
      startDate: "2025-05-03",
      endDate: "2025-05-16",
      cities: ["Lima", "Cusco", "Aguas Calientes"],
      notes: "Four days on the Inca Trail to reach the Sun Gate at dawn. Rainbow Mountain at 5,200 m nearly broke me — worth every breath.",
      photos: [
        { file: "99 - Machu Picchu - Juin 2009.edit3.jpg", artist: "Martin St-Amant (S23678)", license: "CC BY-SA 3.0" },
        { file: "Vinicunca (Rainbow Mountain).jpg", artist: "Steve FUNG", license: "CC BY-SA 4.0" },
      ],
    },
    {
      country: "IS",
      title: "Iceland Ring Road",
      startDate: "2025-02-10",
      endDate: "2025-02-20",
      cities: ["Reykjavík", "Vík", "Höfn", "Grundarfjörður"],
      notes:
        "Ten days of waterfalls, black sand and icebergs. Skógafoss soaked us, Jökulsárlón was silent and blue, and Kirkjufell under snow looked painted.",
      photos: [
        { file: "Skógafoss July 2014.JPG", artist: "Martin Falbisoner", license: "CC BY-SA 4.0" },
        { file: "Icebergs in the Jökulsárlón Glacier Lagoon, Iceland.jpg", artist: "Marine SABRES", license: "CC BY 4.0" },
        { file: "Kirkjufell in winter.jpg", artist: "Beardhatcode", license: "CC0" },
      ],
    },
    {
      country: "IT",
      title: "Cinque Terre & Rome",
      startDate: "2025-08-22",
      endDate: "2025-09-01",
      cities: ["Manarola", "Vernazza", "Rome"],
      notes: "Hiked between the five villages, swam off the rocks in Manarola, then a few hot days of pasta and ruins in Rome.",
      photos: [
        { file: "Manarola NW Cinque Terre Sep23 A7C 07233.jpg", artist: "Timothy A. Gonsalves", license: "CC BY-SA 4.0" },
        { file: "Rome Colosseum exterior 2.jpg", artist: "Nicholas Hartmann", license: "CC BY-SA 4.0" },
      ],
    },
    {
      country: "TH",
      title: "Bangkok to the Islands",
      startDate: "2026-01-05",
      endDate: "2026-01-19",
      cities: ["Bangkok", "Krabi", "Koh Phi Phi"],
      notes: "Temples by the river in Bangkok, then island hopping. Maya Bay at 7am before the boats arrived was pure turquoise.",
      photos: [
        { file: "Templo Wat Arun, Bangkok, Tailandia, 2013-08-22, DD 30.jpg", artist: "Diego Delso", license: "CC BY-SA 3.0" },
        { file: "Maya Bay, Koh Phi Phi, Krabi, Thailand.jpg", artist: "Vyacheslav Argenberg", license: "CC BY 4.0" },
      ],
    },
  ],
};

export const COMMUNITY_TRAVELERS = travelers as PhotoTraveler[];
