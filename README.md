# arXiv Scientific Preprint, PDF & Author Intelligence Miner

> **arXiv Paper Scraper | Computer Science, Physics & Math Preprints** — R&D & technical research tool: queries the official arXiv Atom API to extract research preprints, full abstracts, author lists, categories, and direct PDF URLs.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`arxiv-paper-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "robotics"
  ],
  "maxItemsPerTarget": 10
}
```
