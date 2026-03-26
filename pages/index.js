import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [triggered, setTriggered] = useState(false);

  const runDigest = async () => {
    setLoading(true);
    setStatus(null);
    setJobs([]);
    try {
      const res = await fetch("/api/send-digest", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setJobs(data.jobs || []);
        setStatus({ type: "success", message: `${data.jobCount} job${data.jobCount !== 1 ? "s" : ""} found and digest sent to a.crepault@gmail.com` });
        setTriggered(true);
      } else {
        setStatus({ type: "error", message: data.error || "Something went wrong" });
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Susan's Job Digest</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: #0c0c0e;
          color: #f0ede8;
          min-height: 100vh;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fade-up { animation: fadeUp 0.5s ease both; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 56, animation: "fadeUp 0.6s ease both" }}>
          <p style={{ fontSize: 11, letterSpacing: 3, color: "#6b6860", textTransform: "uppercase", marginBottom: 12 }}>
            Daily Intelligence
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, lineHeight: 1.15, color: "#f0ede8", marginBottom: 16 }}>
            Susan's<br />
            <span style={{ fontStyle: "italic", color: "#c9a96e" }}>Job Digest</span>
          </h1>
          <p style={{ fontSize: 14, color: "#6b6860", lineHeight: 1.7, maxWidth: 420 }}>
            Searches across LinkedIn, Indeed, Glassdoor, and Google Jobs daily for senior advertising sales and partnership roles in New York. Every listing is validated by AI before it reaches your inbox.
          </p>
        </div>

        {/* Criteria card */}
        <div style={{ background: "#16151a", border: "1px solid #2a2830", borderRadius: 12, padding: "24px 28px", marginBottom: 32, animation: "fadeUp 0.6s 0.1s ease both" }}>
          <p style={{ fontSize: 11, letterSpacing: 2, color: "#6b6860", textTransform: "uppercase", marginBottom: 16 }}>Search Criteria</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            {[
              ["Roles", "Sales Director, Exec Sales Director, Advertising Partnerships, Head of Industry, Lead Client Partner, Executive Director"],
              ["Location", "New York City (remote ok)"],
              ["Salary", "$150,000+ only"],
              ["Age", "Posted within 72 hours"],
              ["Industries", "Media, Luxury, Fashion, Tech Platforms, Publishing"],
              ["Digest to", "a.crepault@gmail.com"],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontSize: 11, color: "#6b6860", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 13, color: "#c8c4bc", lineHeight: 1.5 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trigger button */}
        <div style={{ marginBottom: 40, animation: "fadeUp 0.6s 0.2s ease both" }}>
          <button
            onClick={runDigest}
            disabled={loading}
            style={{
              background: loading ? "#2a2830" : "#c9a96e",
              color: loading ? "#6b6860" : "#0c0c0e",
              border: "none",
              borderRadius: 8,
              padding: "14px 32px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 10,
              letterSpacing: 0.3,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid #6b6860", borderTop: "2px solid #c9a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Searching and validating jobs...
              </>
            ) : (
              <>
                <span style={{ fontSize: 16 }}>&#9654;</span>
                Run Digest Now
              </>
            )}
          </button>
          <p style={{ fontSize: 12, color: "#6b6860", marginTop: 10 }}>
            Runs automatically every day at 9:00 AM EST. Or trigger manually above.
          </p>
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            background: status.type === "success" ? "#0d2818" : "#1e0f0f",
            border: `1px solid ${status.type === "success" ? "#1a4a2e" : "#4a1a1a"}`,
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 32,
            fontSize: 14,
            color: status.type === "success" ? "#4ade80" : "#f87171",
            animation: "fadeUp 0.4s ease both",
          }}>
            {status.type === "success" ? "✓" : "✕"} {status.message}
          </div>
        )}

        {/* Job results */}
        {jobs.length > 0 && (
          <div style={{ animation: "fadeUp 0.5s ease both" }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: "#6b6860", textTransform: "uppercase", marginBottom: 20 }}>
              {jobs.length} Verified Match{jobs.length !== 1 ? "es" : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {jobs.map((job, i) => (
                <div
                  key={job.id}
                  style={{
                    background: "#16151a",
                    border: "1px solid #2a2830",
                    borderRadius: 12,
                    padding: "22px 24px",
                    animation: `fadeUp 0.5s ${i * 0.07}s ease both`,
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 16 }}>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: "#f0ede8", marginBottom: 4 }}>
                        {job.title}
                      </h3>
                      <p style={{ fontSize: 13, color: "#6b6860" }}>
                        {job.company} &middot; {job.location} &middot; {job.posted}
                      </p>
                    </div>
                    <span style={{
                      background: job.matchScore >= 85 ? "#0d2818" : "#1a1608",
                      color: job.matchScore >= 85 ? "#4ade80" : "#c9a96e",
                      border: `1px solid ${job.matchScore >= 85 ? "#1a4a2e" : "#4a3a10"}`,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}>
                      {job.matchScore}%
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: "#c9a96e", fontWeight: 500, marginBottom: 8 }}>
                    {job.salary}
                    {job.salaryFlag === "not_listed" && (
                      <span style={{ color: "#6b6860", fontWeight: 400 }}> (not listed)</span>
                    )}
                  </p>

                  <p style={{ fontSize: 13, color: "#8b8780", fontStyle: "italic", marginBottom: 10 }}>
                    {job.reason}
                  </p>

                  <p style={{ fontSize: 13, color: "#6b6860", lineHeight: 1.6, marginBottom: 16 }}>
                    {job.description}
                  </p>

                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      background: "transparent",
                      color: "#c9a96e",
                      border: "1px solid #4a3a10",
                      borderRadius: 6,
                      padding: "8px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      letterSpacing: 0.5,
                    }}
                  >
                    View & Apply &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #1e1c22" }}>
          <p style={{ fontSize: 12, color: "#3d3b45" }}>
            Built for Susan. Powered by JSearch + Claude AI. Deploys on Vercel.
          </p>
        </div>
      </div>
    </>
  );
}
