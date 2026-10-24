# Bulk DNS Zone, Nameserver (NS), SOA, CAA & IPv6 Mapper

> **Bulk DNS Lookup Tool | NS, SOA, CAA, A & AAAA Infrastructure Scraper** — Cloud infrastructure & DevSecOps mapping tool: resolves NS, CAA, A, and AAAA records to fingerprint DNS providers and certificate restrictions.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`dns-zone-mapped`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "domains": [
    "google.com",
    "github.com"
  ],
  "maxItemsPerTarget": 10
}
```
