/**
 * Known search-engine, AI and link-preview crawlers, matched by user agent. The first match wins,
 * so the more specific names (e.g. "OAI-SearchBot") come before broader ones. User agents can be
 * faked, so these numbers show who says they're visiting, not a verified count.
 */
export type BotKind = "search" | "ai-search" | "ai-training" | "preview" | "seo-tool";

export interface Bot {
  name: string;
  kind: BotKind;
}

const BOTS: [RegExp, Bot][] = [
  [/Googlebot-Image/i, { name: "Googlebot-Image", kind: "search" }],
  [/Googlebot/i, { name: "Googlebot", kind: "search" }],
  [/Google-InspectionTool/i, { name: "Google-InspectionTool", kind: "search" }],
  [/Storebot-Google|GoogleOther|Google-CloudVertexBot/i, { name: "GoogleOther", kind: "ai-training" }],
  [/bingbot|BingPreview/i, { name: "Bingbot", kind: "search" }],
  [/DuckDuckBot|DuckAssistBot/i, { name: "DuckDuckBot", kind: "search" }],
  [/YandexBot|YandexImages/i, { name: "YandexBot", kind: "search" }],
  [/Baiduspider/i, { name: "Baiduspider", kind: "search" }],
  [/Applebot-Extended/i, { name: "Applebot-Extended", kind: "ai-training" }],
  [/Applebot/i, { name: "Applebot", kind: "search" }],
  [/OAI-SearchBot/i, { name: "OAI-SearchBot", kind: "ai-search" }],
  [/ChatGPT-User/i, { name: "ChatGPT-User", kind: "ai-search" }],
  [/GPTBot/i, { name: "GPTBot", kind: "ai-training" }],
  [/Claude-SearchBot/i, { name: "Claude-SearchBot", kind: "ai-search" }],
  [/Claude-User/i, { name: "Claude-User", kind: "ai-search" }],
  [/ClaudeBot|anthropic-ai/i, { name: "ClaudeBot", kind: "ai-training" }],
  [/Perplexity-User/i, { name: "Perplexity-User", kind: "ai-search" }],
  [/PerplexityBot/i, { name: "PerplexityBot", kind: "ai-search" }],
  [/meta-externalagent|meta-externalfetcher/i, { name: "Meta-AI", kind: "ai-training" }],
  [/Amazonbot/i, { name: "Amazonbot", kind: "ai-training" }],
  [/Bytespider/i, { name: "Bytespider", kind: "ai-training" }],
  [/CCBot/i, { name: "CCBot", kind: "ai-training" }],
  [/MistralAI-User/i, { name: "MistralAI-User", kind: "ai-search" }],
  [/cohere-ai/i, { name: "Cohere", kind: "ai-training" }],
  [/facebookexternalhit|facebookcatalog/i, { name: "Facebook", kind: "preview" }],
  [/Twitterbot/i, { name: "Twitter/X", kind: "preview" }],
  [/LinkedInBot/i, { name: "LinkedIn", kind: "preview" }],
  [/WhatsApp/i, { name: "WhatsApp", kind: "preview" }],
  [/TelegramBot/i, { name: "Telegram", kind: "preview" }],
  [/Slackbot/i, { name: "Slack", kind: "preview" }],
  [/Discordbot/i, { name: "Discord", kind: "preview" }],
  [/Pinterestbot/i, { name: "Pinterest", kind: "preview" }],
  [/AhrefsBot/i, { name: "AhrefsBot", kind: "seo-tool" }],
  [/SemrushBot/i, { name: "SemrushBot", kind: "seo-tool" }],
  [/MJ12bot/i, { name: "MJ12bot", kind: "seo-tool" }],
  [/DotBot|rogerbot/i, { name: "Moz", kind: "seo-tool" }],
];

const BY_NAME = new Map(BOTS.map(([, b]) => [b.name, b]));

export function detectBot(userAgent: string | null | undefined): Bot | null {
  if (!userAgent) return null;
  for (const [re, bot] of BOTS) if (re.test(userAgent)) return bot;
  return null;
}

export function botKind(name: string): BotKind | undefined {
  return BY_NAME.get(name)?.kind;
}

export const BOT_KIND_LABEL: Record<BotKind, string> = {
  search: "מנוע חיפוש",
  "ai-search": "חיפוש AI",
  "ai-training": "אימון AI",
  preview: "תצוגה מקדימה",
  "seo-tool": "כלי SEO",
};
