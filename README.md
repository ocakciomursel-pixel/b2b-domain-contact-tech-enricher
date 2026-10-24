# Global Postal & ZIP Code to City, State & Coordinate Enricher

> **Bulk ZIP & Postal Code Lookup | City, State & Lat/Long Enricher** — CRM territory routing & logistics enrichment tool: resolves postal and ZIP codes into canonical city names, states, and geographic coordinates.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`postal-code-enriched`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "postalCodes": [
    "90210",
    "10001"
  ],
  "maxItemsPerTarget": 10
}
```
