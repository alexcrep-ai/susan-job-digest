import { fetchAndValidateJobs } from "../../lib/jobs.js";
import { JOB_CONFIG } from "../../lib/config.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Merge UI overrides onto file defaults
    let config = { ...JOB_CONFIG };
    let cvText = "";
    if (req.method === "POST" && req.body) {
      if (req.body.configOverrides) config = { ...config, ...req.body.configOverrides };
      if (req.body.cvText) cvText = req.body.cvText;
    }

    const jobs = await fetchAndValidateJobs(config, cvText);

    if (jobs.length === 0) {
      console.log("No matching jobs found.");
      return res.status(200).json({ message: "No matching jobs found today.", jobCount: 0 });
    }

    const emailHtml = buildEmailHtml(jobs, config);

    const subject = `Susan's Job Digest · ${jobs.length} match${jobs.length !== 1 ? "es" : ""} · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
    const recipients = (config.digestEmail || JOB_CONFIG.digestEmail)
      .split(",").map((e) => e.trim()).filter(Boolean);

    for (const recipient of recipients) {
      const emailRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
          user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: recipient,
            subject,
            email_body: emailHtml,
          },
        }),
      });
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        throw new Error(`EmailJS error sending to ${recipient}: ${errText}`);
      }
    }

    console.log(`Digest sent: ${jobs.length} jobs to ${recipients.join(", ")}`);
    return res.status(200).json({ message: "Digest sent successfully", jobCount: jobs.length, jobs });
  } catch (err) {
    console.error("Digest error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Beautiful HTML Email ─────────────────────────────────────────────────────
function buildEmailHtml(jobs, config = JOB_CONFIG) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const scoreColors = (score) =>
    score >= 85
      ? { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" }
      : score >= 72
      ? { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" }
      : { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };

  const jobCards = jobs
    .map((job, i) => {
      const sc = scoreColors(job.matchScore);
      const isLast = i === jobs.length - 1;
      return `
    <!--[if mso]><tr><td><![endif]-->
    <table width="560" cellpadding="0" cellspacing="0" border="0"
      style="width:100%;max-width:560px;background:#ffffff;border-radius:10px;
             border:1px solid #e8e3da;margin-bottom:${isLast ? "0" : "20px"};
             font-family:Arial,Helvetica,sans-serif;overflow:hidden;">
      <!-- Card header -->
      <tr>
        <td style="background:#faf8f4;padding:18px 22px 14px;border-bottom:1px solid #e8e3da;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:14px;">
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:600;
                           color:#1a1814;margin:0 0 5px;line-height:1.35;">${job.title}</p>
                <p style="font-size:12px;color:#918d87;margin:0;letter-spacing:0.2px;">
                  ${job.company}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${job.location}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${job.posted}
                </p>
              </td>
              <td align="right" valign="top" style="width:68px;white-space:nowrap;">
                <span style="display:inline-block;background:${sc.bg};color:${sc.text};
                             border:1px solid ${sc.border};border-radius:20px;
                             padding:4px 11px;font-size:12px;font-weight:700;">
                  ${job.matchScore}%
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Card body -->
      <tr>
        <td style="padding:16px 22px 20px;">
          <!-- Salary -->
          <p style="font-size:13px;font-weight:600;margin:0 0 10px;
                    color:${job.salaryFlag === "not_listed" ? "#a09c96" : "#b07d0d"};">
            ${job.salary}${job.salaryFlag === "not_listed" ? ' <span style="font-weight:400;font-size:11px;color:#b5b0aa;">(not listed)</span>' : ""}
          </p>
          <!-- Why it matches -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
            <tr>
              <td style="background:#faf8f4;border-left:3px solid #c9a96e;
                         padding:8px 12px;border-radius:0 6px 6px 0;">
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
                           font-style:italic;color:#5a5650;margin:0;line-height:1.55;">${job.reason}</p>
              </td>
            </tr>
          </table>
          <!-- Description -->
          <p style="font-size:13px;color:#6b6660;margin:0 0 18px;line-height:1.65;">${job.description}</p>
          <!-- CTA + Feedback buttons -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top:0;">
            <tr>
              <td style="padding-right:8px;">
                <a href="${job.applyUrl}"
                   style="display:inline-block;background:#0c0c0e;color:#c9a96e;
                          text-decoration:none;padding:11px 24px;border-radius:6px;
                          font-size:13px;font-weight:600;letter-spacing:0.4px;">
                  View &amp; Apply &rarr;
                </a>
              </td>
              <td style="padding-right:6px;">
                <a href="https://susan-job-digest.vercel.app/api/feedback?rating=up&amp;company=${encodeURIComponent(job.company)}&amp;title=${encodeURIComponent(job.title)}"
                   style="display:inline-block;background:#0a2016;color:#4ade80;
                          border:1px solid #164a2a;text-decoration:none;
                          padding:10px 16px;border-radius:6px;
                          font-size:13px;font-weight:600;">
                  👍
                </a>
              </td>
              <td>
                <a href="https://susan-job-digest.vercel.app/api/feedback?rating=down&amp;company=${encodeURIComponent(job.company)}&amp;title=${encodeURIComponent(job.title)}"
                   style="display:inline-block;background:#1e0f0f;color:#f87171;
                          border:1px solid #4a1a1a;text-decoration:none;
                          padding:10px 16px;border-radius:6px;
                          font-size:13px;font-weight:600;">
                  👎
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
    })
    .join("\n");

  const maxAge = config.maxAgeHours || 72;

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:#f0ece5;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center" style="padding:0;">

    <!-- ═══ HEADER ═══ -->
    <table width="600" cellpadding="0" cellspacing="0" border="0"
      style="max-width:600px;width:100%;">
      <tr>
        <td style="background:#0c0c0e;padding:42px 32px 36px;text-align:center;">
          <p style="font-size:10px;letter-spacing:3.5px;color:#5a5650;
                     text-transform:uppercase;margin:0 0 14px;">Daily Intelligence</p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:36px;
                     font-weight:700;color:#f0ede8;margin:0;line-height:1.1;">Susan's</p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:36px;
                     font-weight:700;font-style:italic;color:#c9a96e;
                     margin:0 0 20px;line-height:1.1;">Job Digest</p>
          <p style="font-size:13px;color:#5a5650;margin:0;">
            ${dateStr}&nbsp;&nbsp;&middot;&nbsp;&nbsp;<strong style="color:#918d87;">${jobs.length} verified match${jobs.length !== 1 ? "es" : ""}</strong>
          </p>
        </td>
      </tr>
      <!-- Gold accent bar -->
      <tr><td style="background:linear-gradient(90deg,#c9a96e,#e8c98a,#c9a96e);
                      height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- ═══ JOB CARDS ═══ -->
    <table width="600" cellpadding="0" cellspacing="0" border="0"
      style="max-width:600px;width:100%;background:#f0ece5;">
      <tr><td style="padding:28px 20px 12px;">
        ${jobCards}
      </td></tr>
    </table>

    <!-- ═══ FOOTER ═══ -->
    <table width="600" cellpadding="0" cellspacing="0" border="0"
      style="max-width:600px;width:100%;">
      <tr>
        <td style="background:#0c0c0e;padding:22px 32px 26px;text-align:center;
                    border-top:1px solid #1e1c20;">
          <p style="font-size:11px;color:#3d3b45;margin:0;line-height:1.8;">
            AI-validated for NYC advertising sales relevance
            &nbsp;&middot;&nbsp; Posted within ${maxAge}h
            &nbsp;&middot;&nbsp; Powered by JSearch + Claude
          </p>
        </td>
      </tr>
    </table>

  </td></tr>
</table>`;
}
