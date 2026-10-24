# Bulk SPF, DMARC, MX & Email Deliverability Security Auditor

> **SPF, DMARC & MX Record Checker | Cold Email Deliverability & Security** — Cold email agency & cybersecurity lead magnet: queries DNS TXT and MX records to verify SPF, DMARC enforcement levels, and email gateway providers.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`email-dns-audited`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "domains": [
    "apify.com",
    "cloudflare.com"
  ],
  "maxItemsPerTarget": 10
}
```
