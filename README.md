# Wikipedia Daily Pageviews & Brand Public Attention Tracker

> **Wikipedia Pageviews Scraper | Track Brand & Entity Search Demand** — Alternative data & brand demand intelligence: queries the official Wikimedia Pageviews REST API to measure daily attention volume for any entity.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`pageview-series-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "articles": [
    "Nvidia",
    "Shopify"
  ],
  "maxItemsPerTarget": 10
}
```
