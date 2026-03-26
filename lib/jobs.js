import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { JOB_CONFIG } from "./config.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Fetch jobs from JSearch API ──────────────────────────────────────────────
async function fetchJobsForQuery(query) {
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "2");
  url.searchParams.set("country", "us");
  url.searchParams.set("date_posted", "3days");

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "jsearch.p.rapidapi.com",
      "x-rapidapi-key": process.env.JSEARCH_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error(`JSearch error for "${query}": ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.data || [];
}

// ─── Deduplicate by job_id ─────────────────────────────────────────────────────
function deduplicateJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    if (seen.has(job.job_id)) return false;
    seen.add(job.job_id);
    return true;
  });
}

// ─── Filter by age ────────────────────────────────────────────────────────────
function filterByAge(jobs, maxAgeHours) {
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  return jobs.filter((job) => {
    if (!job.job_posted_at_datetime_utc) return false;
    return new Date(job.job_posted_at_datetime_utc).getTime() >= cutoff;
  });
}

// ─── Filter by location ───────────────────────────────────────────────────────
function filterByLocation(jobs, locationKeywords) {
  return jobs.filter((job) => {
    const loc = `${job.job_city || ""} ${job.job_state || ""} ${job.job_country || ""} ${job.job_is_remote ? "Remote" : ""}`.toLowerCase();
    return locationKeywords.some((kw) => loc.includes(kw.toLowerCase()));
  });
}

// ─── Load feedback history from Redis ─────────────────────────────────────────
async function getFeedbackContext() {
  try {
    const [likedCompanies, dislikedCompanies, likedTitles, dislikedTitles] = await Promise.all([
      kv.smembers("feedback:liked:companies"),
      kv.smembers("feedback:disliked:companies"),
      kv.smembers("feedback:liked:titles"),
      kv.smembers("feedback:disliked:titles"),
    ]);
    return { likedCompanies, dislikedCompanies, likedTitles, dislikedTitles };
  } catch (err) {
    console.warn("Could not load feedback context:", err.message);
    return { likedCompanies: [], dislikedCompanies: [], likedTitles: [], dislikedTitles: [] };
  }
}

// ─── Claude validation ────────────────────────────────────────────────────────
async function validateJobWithClaude(job, config, cvContext, feedback = {}) {
  const salaryMin = job.job_min_salary;
  const salaryMax = job.job_max_salary;
  const salaryText = salaryMin
    ? `$${salaryMin.toLocaleString()} - $${salaryMax ? salaryMax.toLocaleString() : "?"}`
    : "Not listed";

  const background = cvContext?.trim() ||
    "Senior executive advertising sales professional with 10+ years in luxury and premium advertising partnerships, data-driven advertising programs, and multi-market revenue strategy at major media companies.";

  const keywords = (config.keywords || []).join(", ");
  const industries = (config.targetIndustries || JOB_CONFIG.targetIndustries).slice(0, 8).join(", ");
  const primaryLocation = (config.locationKeywords || ["New York"])[0];
  const minSalary = config.minSalary || JOB_CONFIG.minSalary;

  // Build feedback section if we have history
  const feedbackLines = [];
  if (feedback.likedCompanies?.length) feedbackLines.push(`Previously liked companies: ${feedback.likedCompanies.join(", ")}`);
  if (feedback.dislikedCompanies?.length) feedbackLines.push(`Previously disliked companies: ${feedback.dislikedCompanies.join(", ")}`);
  if (feedback.likedTitles?.length) feedbackLines.push(`Previously liked job titles: ${feedback.likedTitles.join(", ")}`);
  if (feedback.dislikedTitles?.length) feedbackLines.push(`Previously disliked job titles: ${feedback.dislikedTitles.join(", ")}`);
  const feedbackSection = feedbackLines.length
    ? `\nCandidate feedback history (use to refine scoring — liked = boost score, disliked = lower score):\n${feedbackLines.join("\n")}\n`
    : "";

  const prompt = `You are validating a job posting for a candidate with this professional background:
${background}

They are specifically seeking roles related to: ${keywords || "luxury advertising, advertising partnerships, premium media sales"}

Target industries: ${industries}
Target location: ${primaryLocation} (or legitimate remote)
Minimum salary: $${minSalary.toLocaleString()}
${feedbackSection}
Here is the job posting:
Title: ${job.job_title}
Company: ${job.employer_name}
Location: ${job.job_city}, ${job.job_state} ${job.job_is_remote ? "(Remote)" : ""}
Salary: ${salaryText}
Description: ${(job.job_description || "").slice(0, 1500)}

Evaluate strictly:
1. Is it genuinely advertising sales, media sales, or advertising partnerships focused? (NOT generic B2B software sales, insurance, real estate, pharma sales, etc.)
2. Is it senior/executive level (Director, VP, Head, Executive Director) for someone with 10+ years of experience?
3. Is it in ${primaryLocation} or legitimately remote-eligible?
4. Is the salary at or above $${minSalary.toLocaleString()} (if listed)?
5. Is the company in media, advertising, luxury, fashion, tech platforms with advertising/partnership businesses?
6. Does it align specifically with the candidate's keywords and background above?

Respond ONLY with a JSON object, no other text:
{
  "approved": true or false,
  "reason": "One sentence that personalizes why this does or doesn't match their specific background",
  "salaryFlag": "ok" | "below_minimum" | "not_listed",
  "matchScore": 0-100
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].text.trim();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("Claude validation error:", err.message);
    return { approved: false, reason: "Validation failed", salaryFlag: "not_listed", matchScore: 0 };
  }
}

// ─── Format posting date ──────────────────────────────────────────────────────
function formatPostedDate(dateStr) {
  if (!dateStr) return "Unknown";
  const diffHours = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just posted";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

// ─── Main export: fetch, filter, validate ─────────────────────────────────────
export async function fetchAndValidateJobs(config = JOB_CONFIG, cvContext = "") {
  // Load feedback history once for all validations
  const feedback = await getFeedbackContext();
  const maxAgeHours = config.maxAgeHours || JOB_CONFIG.maxAgeHours;
  const locationKeywords = config.locationKeywords || JOB_CONFIG.locationKeywords;
  const keywords = config.keywords || JOB_CONFIG.keywords;
  const baseQueries = config.searchQueries || JOB_CONFIG.searchQueries;
  const primaryLocation = locationKeywords[0] || "New York";

  // Generate additional queries from keywords
  const keywordQueries = keywords.slice(0, 5).map(
    (kw) => `${kw} director ${primaryLocation}`
  );
  const allQueries = [...baseQueries, ...keywordQueries];

  console.log(`Running ${allQueries.length} search queries...`);
  const allResults = await Promise.all(allQueries.map(fetchJobsForQuery));

  let jobs = deduplicateJobs(allResults.flat());
  console.log(`Raw (deduped): ${jobs.length}`);

  jobs = filterByAge(jobs, maxAgeHours);
  console.log(`After age filter (${maxAgeHours}h): ${jobs.length}`);

  jobs = filterByLocation(jobs, locationKeywords);
  console.log(`After location filter: ${jobs.length}`);

  // Claude validation in batches of 5
  const validated = [];
  for (let i = 0; i < jobs.length; i += 5) {
    const batch = jobs.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (job) => ({
        job,
        validation: await validateJobWithClaude(job, config, cvContext, feedback),
      }))
    );
    validated.push(...results);
  }

  const approved = validated
    .filter((v) => v.validation.approved)
    .sort((a, b) => b.validation.matchScore - a.validation.matchScore)
    .slice(0, config.maxJobsInDigest || JOB_CONFIG.maxJobsInDigest);

  console.log(`Approved: ${approved.length}`);

  return approved.map(({ job, validation }) => ({
    id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    location: job.job_is_remote
      ? "Remote"
      : `${job.job_city || ""}, ${job.job_state || ""}`.trim().replace(/^,\s*/, ""),
    salary: job.job_min_salary
      ? `$${Math.round(job.job_min_salary / 1000)}K${job.job_max_salary ? ` – $${Math.round(job.job_max_salary / 1000)}K` : "+"}`
      : "Salary not listed",
    salaryFlag: validation.salaryFlag,
    posted: formatPostedDate(job.job_posted_at_datetime_utc),
    applyUrl: job.job_apply_link || job.job_google_link || "#",
    matchScore: validation.matchScore,
    reason: validation.reason,
    description: (job.job_description || "").slice(0, 320) + "…",
  }));
}
