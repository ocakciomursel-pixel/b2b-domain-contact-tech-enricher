# DexScreener On-Chain Token Liquidity, Volume & Pair Monitor

> **DexScreener Scraper | On-Chain Liquidity, FDV & Buy/Sell Volume** — On-chain DeFi & DEX market intelligence: extracts live decentralized exchange trading pairs, pool liquidity in USD, 24-hour buy vs. sell transaction counts, and fully diluted valuation (FDV).

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`dex-pair-analyzed`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "SOL"
  ],
  "maxItemsPerTarget": 10
}
```
