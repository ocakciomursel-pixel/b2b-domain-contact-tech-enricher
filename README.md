# Wikipedia & Wikidata Entity Summary, Logo & Knowledge Graph

> **Wikipedia & Wikidata Entity Scraper | Summaries, Q-IDs & Thumbnails** — Entity enrichment & knowledge graph builder: retrieves verified encyclopedic summaries, Wikidata item IDs, short descriptions, and image URLs for any company, person, or concept.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`entity-enriched`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "entities": [
    "Cloudflare",
    "Stripe,_Inc."
  ],
  "maxItemsPerTarget": 10
}
```
