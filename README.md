# UniProtKB Protein Accession, Gene Symbol & Organism Extractor

> **UniProt Protein Scraper | UniProtKB Accessions, Genes & Amino Acids** — Bioinformatics & proteomics intelligence: queries the official UniProt REST API for curated protein entries, gene names, and sequence lengths.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`protein-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "BRCA1"
  ],
  "maxItemsPerTarget": 10
}
```
