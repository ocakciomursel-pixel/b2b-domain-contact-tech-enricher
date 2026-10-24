# Open-Meteo Commercial Weather, Wind Speed & Solar Radiation Feed

> **Open-Meteo Weather & Solar Scraper | Temperature, Wind & Irradiance** — Energy trading, agriculture & supply-chain weather telemetry: queries Open-Meteo API for live meteorological observations by coordinate.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`weather-forecast-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "coordinates": [
    "52.52,13.41",
    "40.71,-74.01"
  ],
  "maxItemsPerTarget": 10
}
```
