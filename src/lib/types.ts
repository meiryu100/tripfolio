/** API data shapes shared by the server and the client. */

export type CountryStatus = "visited" | "wishlist";
export type Theme = "light" | "dark" | "system";
export type Gender = "male" | "female";

export interface Country {
  code: string;
  name: string;
  capital: string;
  region: string;
  continent: string;
  subregion: string;
  flag: string;
  /** Counts toward "% of the world" (UN members + observer states). */
  sovereign: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Relationship {
  /** Viewer follows them (accepted). */
  following: boolean;
  /** Viewer asked to follow a private profile and is waiting. */
  requested: boolean;
  followsYou: boolean;
  /** Following each other. */
  friends: boolean;
}

export interface Visibility {
  visited: boolean;
  wishlist: boolean;
  trips: boolean;
  photos: boolean;
}

export interface Profile extends UserSummary {
  bio: string;
  location: string;
  website: string;
  isPrivate: boolean;
  joinedAt: string;
  isMe: boolean;
  relationship: Relationship;
  /** What the viewer is allowed to see. */
  canView: Visibility;
  /** The viewer may open a chat with them (see services/messages → canStartChat). */
  canMessage: boolean;
  /** The viewer has blocked them. */
  blocked: boolean;
  counts: {
    followers: number;
    following: number;
    visited: number | null;
    wishlist: number | null;
    trips: number | null;
    photos: number | null;
  };
}

export interface Me extends UserSummary {
  publicId: string;
  gender: Gender;
  email: string;
  bio: string;
  location: string;
  website: string;
  onboarded: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  createdAt: string;
  unreadNotifications: number;
  pendingRequests: number;
  /** Inbox conversations with unread messages. */
  unreadMessages: number;
  /** Message requests waiting for an answer. */
  messageRequests: number;
  settings: {
    isPrivate: boolean;
    showVisited: boolean;
    showWishlist: boolean;
    showTrips: boolean;
    showPhotos: boolean;
    notifyFollows: boolean;
    notifyTrips: boolean;
    notifyEmail: boolean;
    theme: Theme;
  };
}

export interface Photo {
  id: string;
  /** Full-size URL, or a "seed:emoji:hue" illustration reference. */
  src: string;
  thumb: string;
  isCover: boolean;
  width: number | null;
  height: number | null;
}

export interface Trip {
  id: string;
  userId: string;
  countryCode: string;
  title: string;
  description: string;
  cities: string[];
  startDate: string | null;
  endDate: string | null;
  cover: Photo | null;
  photoCount: number;
  /** Present on trip detail; omitted in lists. */
  photos?: Photo[];
  author?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface MapData {
  statuses: Record<string, CountryStatus>;
  /** Countries with at least one photo the viewer may see. */
  photoCountries: string[];
  visibility: Visibility;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type NotificationType = "FOLLOW" | "FOLLOW_REQUEST" | "FOLLOW_ACCEPTED" | "UNFOLLOW" | "TRIP" | "MESSAGE_REQUEST";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: UserSummary;
  trip: { id: string; title: string; countryCode: string } | null;
  read: boolean;
  createdAt: string;
}

export type ActivityType = "COUNTRY_VISITED" | "COUNTRY_WISHLISTED" | "TRIP_ADDED";

export interface Activity {
  id: string;
  type: ActivityType;
  user: UserSummary;
  countryCode: string;
  trip: Trip | null;
  createdAt: string;
}

export interface CountryDetail {
  country: Country;
  myStatus: CountryStatus | null;
  myTrips: Trip[];
  /** People the viewer follows who've been / want to go. */
  following: { visited: UserSummary[]; wishlist: UserSummary[] };
  travelers: { visited: number; wishlist: number };
  journeys: Trip[];
}

export interface Traveler extends UserSummary {
  visited: number;
  relationship: Relationship;
}

export interface ExploreData {
  trending: { code: string; visited: number; wishlist: number }[];
  wishlisted: { code: string; count: number }[];
  topTravelers: Traveler[];
  suggestions: Traveler[];
  journeys: Trip[];
  photos: { photo: Photo; trip: Trip }[];
}

export interface SearchResults {
  users: Traveler[];
  countries: Country[];
  trips: Trip[];
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface FollowRequest {
  user: UserSummary;
  createdAt: string;
}

// ─── Direct messages ─────────────────────────────────────────────────────────

export type MessageFolder = "inbox" | "requests";

export interface MessagePhoto {
  src: string;
  thumb: string;
  width: number | null;
  height: number | null;
}

export interface Message {
  id: string;
  senderId: string;
  /** Empty when unsent or photo-only. */
  body: string;
  photo: MessagePhoto | null;
  unsent: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  other: UserSummary;
  lastMessage: { body: string; photo: boolean; fromMe: boolean; unsent: boolean; createdAt: string } | null;
  unread: boolean;
}

export interface Chat {
  other: UserSummary;
  /** null until the first message is sent. */
  conversationId: string | null;
  /** The viewer received this as a message request and hasn't accepted it yet. */
  isRequest: boolean;
  /** The viewer sent a request that hasn't been accepted yet. */
  awaitingAccept: boolean;
  canSend: boolean;
  /** Why the viewer can't send, shown above the composer. */
  notice: string | null;
  /** When the other person last read the chat; only shown once a request is accepted. */
  seenAt: string | null;
  blocked: boolean;
  /** Newest last. */
  messages: Message[];
  hasEarlier: boolean;
}
