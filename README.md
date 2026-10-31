# Apple App Store Scraper — iOS App Reviews, Ratings & ASO

> **Apple App Store Scraper | ASO Keyword Research & 1-Star Review Miner** — Mobile App & Gaming intelligence Actor: extracts iOS App Store ratings, version velocity, developer websites, and mines recent user reviews to identify 1-2 star bug/complaint themes.

---

## 🚀 Why Choose This Actor?

1. **Ultra-Low Compute Cost (No Headless Browser Overhead)**: Built on a high-efficiency HTTP & structured-data parsing engine instead of heavy Chromium instances. Runs **10x faster** and consumes minimal Apify platform RAM/CPU.
2. **Transparent Pay-Per-Event Pricing**: You only pay for actual results delivered (`app-analyzed`), never for wasted idle time.
3. **100% MCP & AI Agent Ready**: Designed with strict JSON schemas so **Claude Desktop, Cursor, OpenAI Agents, LangChain, n8n, Make.com, Zapier, and Clay** can call this Actor autonomously as a tool.
4. **Clean, Structured Export**: Download results in **JSON, CSV, Excel, XML, or RSS** directly from the Apify dataset tab or via REST API.

---

## 🎯 Target Industries & High-ROI Use Cases

- **Mobile App Studios & Indie Developers**
- **App Store Optimization (ASO) & UA Agencies**
- **Mobile SDK & Ad-Tech Sales Teams**
- **Product Managers Analyzing Competitor Weaknesses**

### Popular Workflows
- **Automated B2B Prospecting & Enrichment**: Feed a list of targets from Clay, HubSpot, Salesforce, or Google Sheets and enrich every record automatically.
- **Autonomous AI Agent Tooling (MCP)**: Connect this Actor to Claude or Cursor via the official `@apify/actors-mcp-server` so your AI assistant can gather real-time live web intelligence on demand.
- **Scheduled Monitoring**: Schedule recurring runs (daily/weekly) on Apify and push fresh intelligence to Slack, Webhook, Email, or PostgreSQL/Supabase.

---

## 📥 Input Parameters Example

```json
{
  "searchTerms": [
    "habit tracker",
    "invoice maker"
  ],
  "maxAppsPerTerm": 5
}
```

---

## 📤 Output Dataset Sample

Each extracted record is pushed to the default Apify Dataset in clean JSON format:

```json
{
  "trackName": "Habit Tracker Pro",
  "sellerName": "Productive Labs LLC",
  "averageUserRating": 4.75,
  "userRatingCount": 18420,
  "lowStarComplaintsCount": 6,
  "complaintThemes": [
    "subscription-paywall-pricing",
    "login-sync-account"
  ],
  "sellerUrl": "https://productivelabs.example.com"
}
```

---

## 🤖 How to Use with AI Agents (Claude / Cursor MCP) & Automation

### 1. Model Context Protocol (MCP)
Add this Actor to your `claude_desktop_config.json` or Cursor MCP settings using the Apify MCP Server:
```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": [
        "-y",
        "@apify/actors-mcp-server",
        "--actors",
        "lucacelli/apple-appstore-aso-competitor-review-intel"
      ],
      "env": {
        "APIFY_TOKEN": "YOUR_APIFY_API_TOKEN"
      }
    }
  }
}
```

### 2. Call via Apify REST API (cURL / n8n / Make / Clay)
```bash
curl -X POST "https://api.apify.com/v2/acts/lucacelli~apple-appstore-aso-competitor-review-intel/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchTerms":["habit tracker","invoice maker"],"maxAppsPerTerm":5}'
```

### 3. Node.js SDK
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('lucacelli/apple-appstore-aso-competitor-review-intel').call({"searchTerms":["habit tracker","invoice maker"],"maxAppsPerTerm":5});
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

---

## ❓ Frequently Asked Questions (FAQ)

### Does this Actor require paid external API keys or residential proxies?
No! It works out of the box with zero external API keys required.

### Can I export the data to CSV, Excel, or Google Sheets?
Yes. Every run stores structured records in an Apify Dataset that can be exported with one click to **CSV, XLSX (Excel), JSON, or JSONL**, or synced directly to Google Sheets via Make/Zapier/n8n.

### Keywords & Tags
`Apple App Store scraper, iOS review scraper, ASO competitor research, mobile app lead generation, user complaint analysis, SensorTower alternative`


---
**Search Keywords:** app store scraper, ios app reviews scraper, apple app store api, mobile aso tool, app competitor research
