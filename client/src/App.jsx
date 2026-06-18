import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const QUICK_PICKS = ['MARA', 'CLOV', 'LMND', 'OPEN', 'BBAI', 'SMCI', 'IONQ', 'SOUN'];

const SENTIMENT_CONFIG = {
  Bullish:  { color: '#00d4aa', bg: 'rgba(0,212,170,0.1)',  icon: '▲' },
  Cautious: { color: '#ffc857', bg: 'rgba(255,200,87,0.1)', icon: '◆' },
  Bearish:  { color: '#ff5c7c', bg: 'rgba(255,92,124,0.1)', icon: '▼' },
};

function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div className="spinner-text">
        <span className="spinner-label">Searching live sources</span>
        <span className="spinner-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
      <p className="spinner-sub">Pulling real-time data via AI web search</p>
    </div>
  );
}

function BriefingCard({ icon, title, children, accent }) {
  return (
    <div className={`briefing-card${accent ? ' briefing-card--accent' : ''}`}>
      <div className="briefing-card__header">
        <span className="briefing-card__icon">{icon}</span>
        <h3 className="briefing-card__title">{title}</h3>
      </div>
      <div className="briefing-card__body">{children}</div>
    </div>
  );
}

function SentimentBadge({ label, reason }) {
  const cfg = SENTIMENT_CONFIG[label] || SENTIMENT_CONFIG.Cautious;
  return (
    <div className="sentiment-wrap">
      <div className="sentiment-label" style={{ color: cfg.color, background: cfg.bg }}>
        <span className="sentiment-arrow">{cfg.icon}</span>
        {label}
      </div>
      <p className="sentiment-reason">{reason}</p>
    </div>
  );
}

function MetaBar({ meta, ticker }) {
  if (!meta) return null;
  const ts = new Date(meta.generatedAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return (
    <div className="meta-bar">
      <span className="meta-ticker">{ticker}</span>
      <span className="meta-dot">·</span>
      <span>Generated {ts}</span>
      <span className="meta-dot">·</span>
      <span>{meta.inputTokens + meta.outputTokens} tokens</span>
      <span className="meta-dot">·</span>
      <span className="meta-live"><span className="live-dot" />Live data</span>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (ticker) => {
    const symbol = (ticker || input).trim().toUpperCase();
    if (!symbol) return;

    setLoading(true);
    setBriefing(null);
    setError(null);
    setInput(symbol);

    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An unexpected error occurred.');
        return;
      }

      setBriefing(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setError('Could not reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__inner">
          <div className="header__brand">
            <span className="header__logo">◉</span>
            <span className="header__name">Small-Cap Spotlight</span>
          </div>
          <div className="disclaimer-badge">
            <span className="disclaimer-dot">⚠</span>
            RESEARCH ONLY — NOT FINANCIAL ADVICE
          </div>
        </div>
      </header>

      <main className="main">
        {/* Hero */}
        <section className="hero">
          <div className="hero__tag">
            <span className="live-dot" />
            Powered by Claude AI + Live Web Search
          </div>
          <h1 className="hero__title">
            AI Research Briefings<br />
            <span className="hero__title--accent">for the Stocks Wall Street Ignores</span>
          </h1>
          <p className="hero__sub">
            2,000+ small-cap stocks ($50M–$2B) have no analyst coverage.<br />
            Get institutional-quality research in seconds — for free.
          </p>

          {/* Search Box */}
          <div className="search-box">
            <div className="search-input-wrap">
              <span className="search-prefix">$</span>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                placeholder="Enter ticker symbol (e.g. IONQ)"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
                onKeyDown={handleKeyDown}
                maxLength={5}
                disabled={loading}
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button
                className="search-btn"
                onClick={() => handleSearch()}
                disabled={loading || !input.trim()}
              >
                {loading ? <span className="btn-spinner" /> : 'Analyze →'}
              </button>
            </div>

            {/* Quick Picks */}
            <div className="quick-picks">
              <span className="quick-picks__label">Quick pick:</span>
              {QUICK_PICKS.map((t) => (
                <button
                  key={t}
                  className="quick-pick-btn"
                  onClick={() => { setInput(t); handleSearch(t); }}
                  disabled={loading}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error */}
        {error && !loading && (
          <div className="error-card">
            <span className="error-icon">⚠</span>
            <div>
              <strong>Couldn't generate briefing</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {briefing && !loading && (
          <section className="results" ref={resultsRef}>
            <div className="results__header">
              <div className="results__company">
                <h2 className="results__name">{briefing.companyName}</h2>
                <span className="results__ticker">{briefing.ticker}</span>
              </div>
              <MetaBar meta={briefing._meta} ticker={briefing.ticker} />
            </div>

            <div className="cards-grid">
              <BriefingCard icon="🏢" title="What They Do" accent>
                <p>{briefing.whatTheyDo}</p>
              </BriefingCard>

              <BriefingCard icon="⚡" title="Recent Catalyst">
                <p>{briefing.recentCatalyst}</p>
              </BriefingCard>

              <BriefingCard icon="⚠️" title="Key Risks">
                <ul className="risk-list">
                  {(briefing.risks || []).map((r, i) => (
                    <li key={i} className="risk-item">
                      <span className="risk-bullet">✕</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </BriefingCard>

              <BriefingCard icon="👁️" title="What to Watch">
                <p>{briefing.whatToWatch}</p>
              </BriefingCard>

              <BriefingCard icon="📊" title="Sentiment Snapshot">
                <SentimentBadge label={briefing.sentimentLabel} reason={briefing.sentimentReason} />
              </BriefingCard>
            </div>

            <div className="disclaimer-footer">
              <strong>Disclaimer:</strong> This briefing is generated by AI for research and educational purposes only.
              It is not investment advice, a recommendation to buy or sell, or a solicitation of any kind.
              Always consult a licensed financial advisor before making investment decisions.
              Data may be incomplete or inaccurate. Past performance does not predict future results.
            </div>
          </section>
        )}

        {/* Empty state */}
        {!briefing && !loading && !error && (
          <div className="empty-state">
            <div className="empty-state__grid">
              {[
                { icon: '🔍', title: 'Live Web Search', desc: 'AI pulls real-time news, filings, and market data — not just training knowledge' },
                { icon: '🏗️', title: 'Structured Analysis', desc: '5-section briefing: business model, catalyst, risks, signals, sentiment' },
                { icon: '🎯', title: 'Small-Cap Focus', desc: 'Built for the 2,000+ stocks institutional analysts skip over' },
              ].map((f) => (
                <div key={f.title} className="feature-card">
                  <span className="feature-card__icon">{f.icon}</span>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Small-Cap Spotlight · AI research aggregation tool · Built with{' '}
          <a href="https://anthropic.com" target="_blank" rel="noreferrer" className="footer-link">
            Claude AI
          </a>{' '}
          · <strong>Not financial advice</strong>
        </p>
      </footer>
    </div>
  );
}
