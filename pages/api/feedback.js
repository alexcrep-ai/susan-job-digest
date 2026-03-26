import { kv } from "@vercel/kv";

const QUOTES_UP = [
  "Your instincts are sharp — that's exactly what lands the right role.",
  "You know what you want. That clarity is rare and powerful.",
  "The right opportunity recognises itself. You just did.",
  "Great judgment. The best careers are built one good call at a time.",
  "Knowing what excites you is the whole game. Well played.",
];

const QUOTES_DOWN = [
  "Every pass brings you closer to the one that truly fits.",
  "Knowing what you don't want is just as valuable as knowing what you do.",
  "Discernment is a superpower in a job search. You have it.",
  "The right role is out there. You just narrowed the field.",
  "Standards aren't stubbornness — they're self-respect. Keep them high.",
];

export default async function handler(req, res) {
  const { rating, company, title } = req.query;

  if (!rating || !["up", "down"].includes(rating)) {
    return res.status(400).send("Invalid request");
  }

  const co = (company || "").replace(/\+/g, " ").trim();
  const ti = (title || "").replace(/\+/g, " ").trim();

  // Store feedback in Redis
  try {
    const entry = JSON.stringify({ company: co, title: ti, ts: Date.now() });
    await kv.lpush(`feedback:${rating}`, entry);
    await kv.ltrim(`feedback:${rating}`, 0, 199); // keep last 200

    if (rating === "up") {
      if (co) await kv.sadd("feedback:liked:companies", co);
      if (ti) await kv.sadd("feedback:liked:titles", ti);
    } else {
      if (co) await kv.sadd("feedback:disliked:companies", co);
      if (ti) await kv.sadd("feedback:disliked:titles", ti);
    }
  } catch (err) {
    console.error("Feedback store error:", err);
    // Page still renders even if Redis fails
  }

  const isUp = rating === "up";
  const quotes = isUp ? QUOTES_UP : QUOTES_DOWN;
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const emoji = isUp ? "👍" : "👎";
  const headline = isUp ? "Great choice noted." : "Feedback recorded.";
  const accentColor = isUp ? "#4ade80" : "#f87171";
  const accentBg = isUp ? "#0a2016" : "#1e0f0f";
  const accentBorder = isUp ? "#164a2a" : "#4a1a1a";

  const jobLine = ti && co ? `${ti} · ${co}` : ti || co || "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Feedback · Susan's Job Digest</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #0c0c0e;
      color: #f0ede8;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #16151a;
      border: 1px solid #2a2830;
      border-radius: 20px;
      padding: 48px 40px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${accentBg};
      color: ${accentColor};
      border: 1px solid ${accentBorder};
      border-radius: 100px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 28px;
    }
    .emoji { font-size: 20px; }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 600;
      color: #f0ede8;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .job-line {
      font-size: 12px;
      color: #5a5650;
      letter-spacing: 0.3px;
      margin-bottom: 32px;
      min-height: 16px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #c9a96e55, transparent);
      margin-bottom: 28px;
    }
    .quote-label {
      font-size: 9px;
      letter-spacing: 2.5px;
      color: #3d3b45;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .quote {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      font-style: italic;
      color: #c9a96e;
      line-height: 1.7;
    }
    .close-hint {
      font-size: 11px;
      color: #2d2b35;
      margin-top: 32px;
    }
    .wordmark {
      font-size: 10px;
      letter-spacing: 2px;
      color: #2d2b35;
      text-transform: uppercase;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="emoji">${emoji}</span> ${headline}</div>
    <h1>Thanks for<br>your feedback!</h1>
    <p class="job-line">${jobLine}</p>
    <div class="divider"></div>
    <p class="quote-label">A thought</p>
    <p class="quote">"${quote}"</p>
    <p class="close-hint">You can close this tab.</p>
    <p class="wordmark">Susan's Job Digest</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}
