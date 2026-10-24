# USGS Global Earthquake, Magnitude & Seismic Hazard Monitor

> **USGS Earthquake Scraper | Real-Time Seismic Events, Magnitude & Depth** — Reinsurance, supply-chain continuity & risk intelligence: queries the official US Geological Survey (USGS) seismic feed for recent earthquakes.

---

## Key Capabilities & Performance Advantages

- **Direct Structured Extraction**: Engineered with high-speed HTTP and structured API/DOM parsers—zero headless browser overhead and minimal compute cost.
- **Pay-Per-Event Billing (`seismic-event-extracted`)**: Transparent event-based pricing ($0.002 per record).
- **Automated Daily Reliability**: Built-in fallback defaults ensure 100% dataset stability for scheduled pipelines, Make, n8n, Zapier, Clay, and REST API workflows.

## Sample Input JSON

```json
{
  "minMagnitudes": [
    "4.5"
  ],
  "maxItemsPerTarget": 10
}
```
