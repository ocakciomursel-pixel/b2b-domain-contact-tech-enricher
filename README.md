# Bitcoin Mempool Fee Rate, Block Height & Network Telemetry

> **Bitcoin Mempool Fee & Block Telemetry Scraper (Mempool.space API)** — Bitcoin infrastructure & treasury automation feed: retrieves real-time sat/vB fee estimates and block height telemetry from Mempool.space.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`btc-telemetry-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "targets": [
    "mainnet"
  ],
  "maxItemsPerTarget": 10
}
```
