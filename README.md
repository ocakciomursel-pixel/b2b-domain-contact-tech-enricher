# US NOAA National Weather Service Severe Storm & Flood Alert Feed

> **NOAA Weather Alerts Scraper | Severe Storm, Tornado & Flood Warnings** — Property restoration, roofing lead generation & logistics routing: queries NOAA NWS API for active severe weather alerts by US state.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`weather-alert-extracted`)**: Transparent event-based pricing ($0.003 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "states": [
    "TX"
  ],
  "maxItemsPerTarget": 10
}
```
