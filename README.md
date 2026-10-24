# OpenFEMA Disaster Declaration, Flood & Property Risk Tracker

> **FEMA Disaster Declarations Scraper | Property & Insurance Risk Data** — PropTech, real estate & P&C insurance intelligence: queries OpenFEMA API for federal disaster declarations, hazard types, and county-level designations.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`disaster-record-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "states": [
    "FL"
  ],
  "maxItemsPerTarget": 10
}
```
