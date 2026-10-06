/**
 * Demo community for local development (npm run db:seed). Seed photos use the
 * "seed:emoji:hue" scheme and render as illustrated covers.
 */

export const SEED_PASSWORD = "travora123";
export const DEMO_EMAIL = "demo@travora.app";

export interface SeedUser {
  id: string;
  firstName: string;
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

