# OpenFDA MAUDE Medical Device Adverse Event & Malfunction Spy

> **FDA MAUDE Medical Device Adverse Event Scraper | MedTech Safety Data** — MedTech QA, regulatory affairs & mass-tort legal intelligence: extracts medical device adverse event reports from OpenFDA.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`device-event-extracted`)**: Transparent event-based pricing ($0.004 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "pacemaker"
  ],
  "maxItemsPerTarget": 10
}
```
