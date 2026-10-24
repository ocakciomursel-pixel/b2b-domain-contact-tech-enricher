# ECB Central Bank Multi-Currency Forex & Cross-Rate Feed

> **European Central Bank (ECB) Live Forex & Currency Exchange Scraper** — Automated treasury & accounting FX feed: retrieves official daily reference exchange rates across 30+ global currencies from European Central Bank data.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`fx-rate-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "baseCurrencies": [
    "USD",
    "EUR"
  ],
  "maxItemsPerTarget": 10
}
```
