# US CISA Known Exploited Vulnerabilities (KEV) Catalog Monitor

> **CISA KEV Catalog Scraper | Actively Exploited CVEs & Ransomware Feed** — Enterprise SecOps & patch management feed: queries the official CISA KEV catalog for actively exploited vulnerabilities and remediation deadlines.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`kev-vulnerability-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "keywords": [
    "Microsoft"
  ],
  "maxItemsPerTarget": 10
}
```
