# RDAP & WHOIS Domain Ownership, Registrar & Expiry Auditor

> **Bulk RDAP WHOIS Domain Lookup, Expiry Date & Registrar Checker** — Domain portfolio & brand protection intelligence: queries official IANA RDAP registries to extract domain registration dates, expiration dates, days until expiry, registrar details, and nameservers.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with lightweight HTTP and structured API/DOM parsers—zero headless browser overhead and ultra-fast cloud execution.
- **Pay-Per-Event Billing (`domain-whois-checked`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "domains": [
    "google.com",
    "cloudflare.com"
  ],
  "maxItemsPerTarget": 10
}
```
