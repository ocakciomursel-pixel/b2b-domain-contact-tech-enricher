# Global Air Quality (AQI, PM2.5, PM10, NO2, Ozone) Telemetry Feed

> **Air Quality & PM2.5 Scraper | European AQI, PM10 & Ozone Telemetry** — Environmental intelligence & smart-city telemetry: fetches real-time particulate matter (PM2.5/PM10) and gas pollutant concentrations.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`air-quality-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "coordinates": [
    "51.50,-0.12"
  ],
  "maxItemsPerTarget": 10
}
```
