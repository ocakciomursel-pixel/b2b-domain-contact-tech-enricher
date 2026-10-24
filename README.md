# DefiLlama DEX On-Chain Trading Volume & 24h Market Share Spy

> **DeFi DEX Volume Scraper | Uniswap, Raydium & On-Chain Volume Tracker** — DeFi market structure & liquidity intelligence: extracts daily and weekly on-chain trading volumes across decentralized exchanges.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`dex-volume-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "Uniswap"
  ],
  "maxItemsPerTarget": 10
}
```
