# NCBI PubChem Chemical Compound, SMILES, Formula & Mass Enricher

> **PubChem Compound Scraper | Molecular Formula, Weight, SMILES & InChIKey** — Cheminformatics, chemical supply & pharma R&D tool: fetches verified physicochemical properties and structure identifiers from NCBI PubChem.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`compound-enriched`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "compounds": [
    "aspirin",
    "caffeine"
  ],
  "maxItemsPerTarget": 10
}
```
