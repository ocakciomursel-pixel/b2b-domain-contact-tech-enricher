# OpenFDA Food, Beverage & Supplement Safety Recall Tracker

> **FDA Food Recall Scraper | Enforcement Reports, Firms & Distribution** — Food supply-chain, retail compliance & QA intelligence: queries OpenFDA Food Enforcement API for active product recalls and recalling firms.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`food-recall-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "salmonella"
  ],
  "maxItemsPerTarget": 10
}
```
