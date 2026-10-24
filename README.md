# OpenFDA Pharmaceutical NDC Directory & Drug Manufacturer Spy

> **FDA NDC Drug Directory Scraper & Pharma Manufacturer Lead Tool** — Pharmaceutical supply-chain & B2B intelligence: extracts registered drug products, labeler company names, generic/brand names, dosage forms, and active ingredients from the FDA NDC Directory.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`drug-record-extracted`)**: Transparent event-based pricing ($0.004 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "ibuprofen"
  ],
  "maxItemsPerTarget": 10
}
```
