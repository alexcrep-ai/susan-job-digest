// ─── Susan's Job Search Configuration ────────────────────────────────────────
// Edit this file to update search criteria. No code changes needed elsewhere.

export const JOB_CONFIG = {
  // Recipient
  digestEmail: "a.crepault@gmail.com",

  // Search queries - we run all of these and deduplicate
  searchQueries: [
    "sales director advertising New York",
    "executive sales director luxury fashion New York",
    "advertising partnerships director New York",
    "head of industry advertising New York",
    "lead client partner media New York",
    "executive director advertising sales New York",
    "director media sales luxury New York",
    "VP advertising partnerships New York",
  ],

  // Location filter - must contain one of these
  locationKeywords: ["New York", "NY", "NYC", "Remote"],

  // Job titles that are acceptable (Claude also validates)
  targetTitles: [
    "sales director",
    "executive sales director",
    "advertising",
    "partnerships director",
    "head of industry",
    "lead client partner",
    "executive director",
    "vp sales",
    "vp of sales",
    "director of sales",
    "client partner",
    "media sales",
  ],

  // Industries / company types Susan wants
  targetIndustries: [
    "media",
    "advertising",
    "luxury",
    "fashion",
    "publishing",
    "technology",
    "digital media",
    "saas",
    "social media",
    "streaming",
    "entertainment",
  ],

  // Companies known to have advertising/partnership sales teams
  targetCompanies: [
    "Meta",
    "Google",
    "Pinterest",
    "Snap",
    "TikTok",
    "LinkedIn",
    "Twitter",
    "X Corp",
    "Spotify",
    "Netflix",
    "Condé Nast",
    "Hearst",
    "Dotdash Meredith",
    "New York Times",
    "Vogue",
    "Forbes",
    "Bloomberg",
    "Salesforce",
    "Adobe",
    "Amazon",
    "Apple",
  ],

  // Minimum salary (USD). Jobs without salary data are flagged, not excluded.
  minSalary: 150000,

  // Only include jobs posted within this many hours
  maxAgeHours: 72,

  // Max jobs to include in a single digest
  maxJobsInDigest: 10,
};
