require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
}));
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET'],
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
});
app.use('/api/', limiter);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TICKER_REGEX = /^[A-Z]{1,5}$/;

const SYSTEM_PROMPT = `You are a professional financial research analyst specializing in small-cap stocks (market cap $50M–$2B). Your job is to produce concise, factual research briefings for retail investors.

Use the web_search tool to find current, accurate information about the requested ticker before generating your briefing. Search for:
1. The company's current business description and recent filings
2. The most recent meaningful news or catalyst (last 30–90 days)
3. Current analyst sentiment and any recent price action

After gathering information via web search, respond with ONLY a valid JSON object — no markdown code fences, no preamble, no explanation text. Just the raw JSON.

The JSON must have exactly these fields:
{
  "companyName": "Full company name (string)",
  "ticker": "TICKER (uppercase string)",
  "whatTheyDo": "2–3 sentence plain-English description of business model and revenue source (string)",
  "recentCatalyst": "1–2 sentence description of the most meaningful recent news, event, or data point affecting the stock (string)",
  "risks": ["Risk 1 description", "Risk 2 description", "Risk 3 description"],
  "whatToWatch": "2–3 forward-looking signals or upcoming events an investor should monitor (string)",
  "sentimentLabel": "Bullish" | "Cautious" | "Bearish",
  "sentimentReason": "One sentence explaining the current market sentiment read (string)"
}

Rules:
- Use only information you found or confirmed via web search — cite data as of your search date
- Be specific: name actual products, actual numbers, actual events when possible
- Keep each field concise but substantive
- If a ticker does not correspond to a real publicly traded company, return: {"error": "Ticker not found or not a publicly traded company"}
- Never include financial advice, price targets, or buy/sell recommendations
- The "risks" array must have exactly 3 strings`;

app.post('/api/briefing', async (req, res) => {
  const { ticker } = req.body;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker symbol is required.' });
  }

  const normalized = ticker.trim().toUpperCase();

  if (!TICKER_REGEX.test(normalized)) {
    return res.status(400).json({ error: 'Invalid ticker format. Use 1–5 uppercase letters (e.g., AAPL, MARA).' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  try {
    const messages = [
      {
        role: 'user',
        content: `Research the stock ticker ${normalized} and produce a briefing JSON as specified. Use web search to find current information first.`,
      },
    ];

    let finalContent = null;
    let inputTokens = 0;
    let outputTokens = 0;

    // Agentic loop — model may call web_search multiple times before returning JSON
    while (true) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages,
      });

      inputTokens += response.usage?.input_tokens || 0;
      outputTokens += response.usage?.output_tokens || 0;

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text');
        if (textBlock) {
          finalContent = textBlock.text;
        }
        break;
      }

      if (response.stop_reason === 'tool_use') {
        // Add assistant's message with tool use blocks
        messages.push({ role: 'assistant', content: response.content });

        // Build tool results for each tool_use block
        const toolResults = response.content
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: b.type === 'tool_use' ? (b.content || '') : '',
          }));

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop reason — try to extract text anyway
      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock) finalContent = textBlock.text;
      break;
    }

    if (!finalContent) {
      return res.status(502).json({ error: 'No response received from AI. Please try again.' });
    }

    // Parse JSON — strip any accidental markdown fences
    let cleaned = finalContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let briefing;
    try {
      briefing = JSON.parse(cleaned);
    } catch {
      // Attempt to extract JSON substring
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          briefing = JSON.parse(jsonMatch[0]);
        } catch {
          return res.status(502).json({ error: 'AI returned malformed data. Please try again.' });
        }
      } else {
        return res.status(502).json({ error: 'AI returned unexpected format. Please try again.' });
      }
    }

    if (briefing.error) {
      return res.status(404).json({ error: briefing.error });
    }

    return res.json({
      ...briefing,
      _meta: { inputTokens, outputTokens, generatedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Anthropic API error:', err);

    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid API key. Contact the administrator.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'API rate limit reached. Please try again in a moment.' });
    }
    if (err.status === 529 || err.message?.includes('overloaded')) {
      return res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a few seconds.' });
    }

    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React build in production (Docker / AWS deployment)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Small-Cap Spotlight server running on port ${PORT}`);
});
