# Small-Cap Spotlight

> AI-powered research briefings for the 2,000+ small-cap stocks Wall Street ignores.

[![Not Financial Advice](https://img.shields.io/badge/⚠%20NOT-Financial%20Advice-yellow)](.)
[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20AI-00d4aa)](https://anthropic.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)

**Live demo:** [small-cap-spotlight.onrender.com](https://small-cap-spotlight.onrender.com/)

---

## The Problem

**58 million Americans** own stocks without a financial advisor. The tools they rely on — Yahoo Finance, Robinhood, Reddit — give them headlines, not analysis.

Perplexity Finance and Bloomberg cover Apple, Tesla, and Microsoft well. But **2,000+ small-cap stocks** ($50M–$2B market cap) sit in a data desert. No analyst reports. No earnings summaries. No structured risk breakdowns. These are exactly the stocks where retail investors get burned — not because data doesn't exist, but because nobody has organized it for them.

**Small-Cap Spotlight fills that gap.**

---

## What It Does

Type any stock ticker → get a structured, AI-generated research briefing in seconds, powered by **live web search**.

| Section | What You Get |
|---|---|
| 🏢 **What They Do** | Plain-English business model and revenue source |
| ⚡ **Recent Catalyst** | Most meaningful news or event from the last 30–90 days |
| ⚠️ **Key Risks** | 3 specific risks: regulatory, dilution, competition, or macro |
| 👁️ **What to Watch** | 2–3 forward-looking signals an investor should monitor |
| 📊 **Sentiment Snapshot** | AI read on current market sentiment: Bullish / Cautious / Bearish |

### The #1 Differentiator

Claude's `web_search` tool is enabled on every single request. The model **actively searches the web** before generating your briefing — so you get current, real information, not stale training data from months ago. This is what makes Small-Cap Spotlight meaningfully different from ChatGPT, Perplexity, or any static AI finance tool.

---

## Who It's For

- Retail investors who trade small-cap and mid-cap stocks without institutional support
- Anyone who wants a fast, structured overview before doing deeper research
- Investors tired of sifting through press releases and Reddit threads for basic context

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, plain CSS (no UI library) |
| Backend | Node.js + Express |
| AI Model | Anthropic Claude (`claude-sonnet-4-6`) |
| Live Data | Anthropic `web_search_20250305` tool |
| Security | `helmet`, CORS, server-side API key, rate limiting |
| Deployment | Docker + AWS Elastic Beanstalk or EC2 |

---

## Running Locally

### Prerequisites
- Node.js 18+ — download at [nodejs.org](https://nodejs.org)
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourname/small-cap-spotlight
cd small-cap-spotlight

# 2. Install all dependencies (frontend + backend)
npm run install:all

# 3. Create your environment file
cp .env.example server/.env
# Open server/.env and set: ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the backend (Terminal window 1)
cd server && npm start
# → Running on http://localhost:3001

# 5. Start the frontend (Terminal window 2)
cd client && npm run dev
# → Running on http://localhost:3000
```

Open **http://localhost:3000** in your browser and enter any ticker symbol.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Your Anthropic API key |
| `PORT` | No | `3001` | Express server port |
| `CLIENT_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |

---

## Deploying to AWS

### Option A — Docker + Elastic Beanstalk (recommended)

```bash
# 1. Build the production Docker image
docker build -t small-cap-spotlight .

# 2. Test locally before deploying
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e NODE_ENV=production \
  small-cap-spotlight

# 3. Push to Amazon ECR
aws ecr create-repository --repository-name small-cap-spotlight
aws ecr get-login-password | docker login --username AWS --password-stdin <your-ecr-url>
docker tag small-cap-spotlight:latest <your-ecr-url>/small-cap-spotlight:latest
docker push <your-ecr-url>/small-cap-spotlight:latest

# 4. Create Elastic Beanstalk environment
# Platform: Docker
# Set environment properties: ANTHROPIC_API_KEY, NODE_ENV=production
```

### Option B — EC2 Manual Deploy

```bash
# On your EC2 instance
sudo yum install -y nodejs npm git
git clone https://github.com/yourname/small-cap-spotlight
cd small-cap-spotlight
npm run install:all

# Build the React frontend
cd client && npm run build && cd ..

# Copy the build into server so Express can serve it
cp -r client/build server/public

# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export NODE_ENV=production

# Start with PM2 for process management
npm install -g pm2
pm2 start server/index.js --name small-cap-spotlight
pm2 save
```

### Production Security Checklist
- [ ] Set `CLIENT_ORIGIN` to your actual frontend domain
- [ ] Store `ANTHROPIC_API_KEY` in AWS Secrets Manager or Parameter Store (never commit it to git)
- [ ] Put the app behind an Application Load Balancer with HTTPS/SSL
- [ ] Enable AWS WAF to supplement the built-in rate limiter (10 req/min)

---

## API Reference

### `POST /api/briefing`

**Request:**
```json
{ "ticker": "IONQ" }
```

**Response:**
```json
{
  "companyName": "IonQ Inc.",
  "ticker": "IONQ",
  "whatTheyDo": "IonQ develops trapped-ion quantum computers...",
  "recentCatalyst": "IonQ announced a new contract with the U.S. Air Force...",
  "risks": [
    "Still pre-revenue at scale — commercialization timeline is uncertain",
    "Heavy competition from IBM, Google, and well-funded startups",
    "Dilution risk from ongoing capital raises to fund R&D"
  ],
  "whatToWatch": "Monitor quarterly revenue growth and new enterprise contract announcements...",
  "sentimentLabel": "Cautious",
  "sentimentReason": "Exciting long-term thesis but near-term profitability remains distant.",
  "_meta": {
    "inputTokens": 1230,
    "outputTokens": 480,
    "generatedAt": "2026-06-12T18:00:00.000Z"
  }
}
```

### `GET /health`
Returns `{ "status": "ok" }` — used for AWS load balancer health checks.

---

## Project Structure

```
small-cap-spotlight/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Main UI component
│   │   ├── App.css          # Dark fintech styles
│   │   └── index.jsx        # React entry point
│   ├── index.html
│   └── vite.config.js
├── server/                  # Express backend
│   └── index.js             # API routes + Anthropic integration
├── Dockerfile               # Multi-stage production build
├── .env.example             # Environment variable template
└── README.md
```

---

## Social Impact

**58 million Americans own stocks without a financial advisor.** They're left relying on headlines, Reddit threads, and incomplete data — especially for the 2,000+ small-cap stocks ($50M–$2B market cap) that institutional research largely ignores. That gap isn't just inconvenient; it's where unadvised retail investors are most likely to make uninformed decisions and get burned.

Small-Cap Spotlight is built to close that gap responsibly:
- **Democratizes access** to structured, current research that was previously available only through paid analyst tools or institutional terminals
- **Uses live web search**, not stale training data, so every briefing reflects real, current information
- **Never gives financial advice** — every briefing focuses on facts (business model, catalysts, risks, signals to watch) and explicitly avoids price targets or buy/sell recommendations, paired with a clear disclaimer
- **Lowers the barrier to informed investing** for the millions of retail investors who don't have — and may never have — access to a financial advisor

The goal isn't to replace professional advice. It's to give unadvised investors the same starting point a junior analyst would get, so they can ask better questions and do better research on their own.

---

## Disclaimer

**This application is for research and educational purposes only. Nothing on this platform constitutes financial advice, a recommendation to buy or sell any security, or a solicitation of any kind. Always consult a licensed financial advisor before making investment decisions. Past performance does not predict future results. AI-generated content may be incomplete or inaccurate.**

---

## Built With

- [Claude AI](https://anthropic.com) by Anthropic — AI model + live web search
- [React](https://react.dev) — frontend framework
- [Express](https://expressjs.com) — backend server
- [Vite](https://vitejs.dev) — frontend build tool
