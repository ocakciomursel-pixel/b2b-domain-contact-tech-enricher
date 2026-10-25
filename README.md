# OpenFDA Pharmaceutical Drug Recall & Enforcement Report Tracker

> **FDA Drug Recall Enforcement Scraper | Pharma Lot Recalls & Firms** — Pharmacy supply-chain & healthcare compliance intelligence: queries OpenFDA Drug Enforcement API for active drug recalls.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`drug-recall-extracted`)**: Transparent event-based pricing ($0.004 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "tablet"
  ],
  "maxItemsPerTarget": 10
}
```
