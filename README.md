# NHTSA Automotive Vehicle Safety Recall & Defect Intelligence

> **NHTSA Vehicle Recall Scraper | Auto Manufacturer Defect & Safety Data** — Automotive, insurance & legal intelligence: queries the official US National Highway Traffic Safety Administration (NHTSA) API for vehicle safety recalls and defect remedies.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`recall-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "makes": [
    "TESLA"
  ],
  "maxItemsPerTarget": 10
}
```
