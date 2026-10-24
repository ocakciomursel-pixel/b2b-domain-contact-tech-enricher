# DefiLlama Global Stablecoin Market Cap, Peg & Chain Flow Monitor

> **Stablecoin Market Cap & Peg Scraper | USDT, USDC & On-Chain Supply** — Institutional crypto & treasury intelligence: queries DefiLlama Stablecoins API to monitor stablecoin peg stability and circulating supply changes.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`stablecoin-analyzed`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "symbols": [
    "USDT",
    "USDC"
  ],
  "maxItemsPerTarget": 10
}
```
