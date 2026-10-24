# RIPEstat BGP Routing, IP Prefix & Autonomous System Auditor

> **RIPEstat BGP & ASN Scraper | IP Prefix Routing & Network Neighbors** — Network engineering & cybersecurity OSINT tool: queries RIPEstat Data API for authoritative BGP prefix announcements and AS holder details.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`bgp-prefix-audited`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "resources": [
    "1.1.1.1"
  ],
  "maxItemsPerTarget": 10
}
```
