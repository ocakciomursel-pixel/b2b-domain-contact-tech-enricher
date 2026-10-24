# SSL Certificate Transparency & Subdomain Discoverer

> **Subdomain Finder & SSL Certificate Transparency Scanner (crt.sh)** — Attack surface & OSINT reconnaissance tool: queries Certificate Transparency (CT) logs to discover subdomains, SSL/TLS certificate issuers, validity periods, and expired certificates for any target domain.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`subdomain-discovered`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "domains": [
    "apify.com"
  ],
  "maxItemsPerTarget": 10
}
```
