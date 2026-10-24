# EMBL-EBI ChEMBL Bioactive Molecule & Clinical Drug Phase Miner

> **ChEMBL Drug Discovery Scraper | Bioactive Molecules & Max Clinical Phase** — Drug discovery & biotech intelligence: queries EMBL-EBI ChEMBL REST API for bioactive compounds, clinical development phases, and molecular classifications.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`chembl-molecule-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "imatinib"
  ],
  "maxItemsPerTarget": 10
}
```
