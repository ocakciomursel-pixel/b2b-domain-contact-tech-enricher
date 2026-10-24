# OpenLibrary ISBN, Book Publisher, Author & Edition Enricher

> **ISBN & Book Metadata Scraper | Publishers, Authors & Editions** — Book publishing & catalog enrichment tool: queries OpenLibrary Search API to extract bibliographic metadata, authors, publishers, and edition histories.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`book-metadata-enriched`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "economics"
  ],
  "maxItemsPerTarget": 10
}
```
