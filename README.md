# PubMed NCBI Biomedical Study, Journal & Author Lead Miner

> **PubMed Scraper | NCBI Biomedical Papers, PMIDs & Author Affiliations** — Healthcare & life-sciences research tool: queries NCBI Entrez E-utilities (PubMed) to extract biomedical study metadata, journal sources, author lists, and DOIs.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`pubmed-article-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "immunotherapy"
  ],
  "maxItemsPerTarget": 10
}
```
