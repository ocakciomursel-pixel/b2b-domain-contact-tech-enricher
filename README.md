# OpenFDA FAERS Adverse Drug Event & Pharmacovigilance Monitor

> **FDA FAERS Adverse Event Scraper | Drug Side Effects & Safety Signals** — Pharmacovigilance, medical affairs & legal mass-tort intelligence: extracts adverse drug event safety reports from the FDA FAERS database.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`adverse-event-extracted`)**: Transparent event-based pricing ($0.004 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "drugs": [
    "ibuprofen"
  ],
  "maxItemsPerTarget": 10
}
```
