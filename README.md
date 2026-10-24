# CVE Vulnerability, CVSS Severity & NVD Security Monitor

> **NIST NVD CVE Vulnerability Scanner & Security Advisory Feed** — DevSecOps & Vulnerability Intelligence tool: queries the official NIST National Vulnerability Database (NVD 2.0) for CVEs, CVSS severity scores, vector strings, and patch references.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`cve-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "keywords": [
    "nginx"
  ],
  "maxItemsPerTarget": 10
}
```
