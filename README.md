# MusicBrainz Artist, Record Label, Country & Catalog Enricher

> **MusicBrainz Scraper | Music Artists, Record Labels, Tags & MBIDs** — Music industry, A&R & media metadata enrichment: queries MusicBrainz Web Service v2 JSON API for artist profiles, areas, life-spans, and tags.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`artist-enriched`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "Daft Punk"
  ],
  "maxItemsPerTarget": 10
}
```
