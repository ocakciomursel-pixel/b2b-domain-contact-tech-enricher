# Crypto Market Cap, Volume, ATH Drawdown & Valuation Scanner

> **CoinGecko Crypto Market Data, Volume & Valuation Ratio Scraper** — Digital asset market intelligence: extracts live spot prices, 24h volume-to-market-cap ratios, supply inflation metrics, and all-time-high drawdown percentages for top crypto assets.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`asset-analyzed`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "currencies": [
    "usd"
  ],
  "maxItemsPerTarget": 10
}
```
