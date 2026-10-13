/** Public origin of the site, without a trailing slash. */
export const siteUrl = (process.env.APP_URL || "https://www.trip-folio.com").replace(/\/$/, "");
