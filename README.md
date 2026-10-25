# GLEIF Global LEI Corporate Entity, BIC & Legal Address Lookup

> **GLEIF LEI Lookup Scraper | Global Legal Entity Identifier & KYB Data** — Banking KYB, institutional onboarding & compliance intelligence: queries the official GLEIF v1 API for verified global corporate legal entities.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`lei-entity-extracted`)**: Transparent event-based pricing ($0.004 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "companies": [
    "Siemens"
  ],
  "maxItemsPerTarget": 10
}
```
