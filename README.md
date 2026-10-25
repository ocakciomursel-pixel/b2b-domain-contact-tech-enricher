# US CPSC Consumer Product Safety Recall & Injury Hazard Tracker

> **CPSC Product Recall Scraper | Defective Products, Hazards & Retailers** — E-commerce marketplace compliance & product liability law intelligence: queries the official SaferProducts.gov CPSC Recall REST API.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`cpsc-recall-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "queries": [
    "battery"
  ],
  "maxItemsPerTarget": 10
}
```
