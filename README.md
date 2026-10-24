# OSV.dev Open-Source Dependency Vulnerability & Advisory Scanner

> **OSV.dev Vulnerability Scraper | npm, PyPI, Go & Maven Security Advisories** — Software supply-chain security (SCA) tool: queries Google OSV.dev API to retrieve known security advisories for open-source packages.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`osv-advisory-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "packages": [
    "lodash"
  ],
  "maxItemsPerTarget": 10
}
```
