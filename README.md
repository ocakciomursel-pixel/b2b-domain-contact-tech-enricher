# CERN Zenodo Scientific Dataset, Software & Grant Output Miner

> **Zenodo Scraper | Open Research Datasets, DOIs, Authors & Grants** — Open-science & R&D dataset intelligence: queries the official CERN Zenodo REST API for published datasets, research software, authors, and DOIs.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`zenodo-record-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "lidar"
  ],
  "maxItemsPerTarget": 10
}
```
