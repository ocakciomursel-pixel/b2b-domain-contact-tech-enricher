# Technical SEO, Broken Link, Schema.org & Meta Tag Auditor (MCP Ready)

> **Technical SEO Audit Tool, Broken Link Checker & Schema.org Analyzer** — Perform a 40-point technical SEO & AI-readiness audit on any URL list: HTTP latency, Title/Meta lengths, Canonical & Robots directives, H1-H6 structure, Image alt coverage, Schema.org JSON-LD validation, and live broken link detection with a 0-100 SEO Score.

---

## 🚀 Why Choose This Actor?

1. **Ultra-Low Compute Cost (No Headless Browser Overhead)**: Built on a high-efficiency HTTP & structured-data parsing engine instead of heavy Chromium instances. Runs **10x faster** and consumes minimal Apify platform RAM/CPU.
2. **Transparent Pay-Per-Event Pricing**: You only pay for actual results delivered (`page-audited`), never for wasted idle time.
3. **100% MCP & AI Agent Ready**: Designed with strict JSON schemas so **Claude Desktop, Cursor, OpenAI Agents, LangChain, n8n, Make.com, Zapier, and Clay** can call this Actor autonomously as a tool.
4. **Clean, Structured Export**: Download results in **JSON, CSV, Excel, XML, or RSS** directly from the Apify dataset tab or via REST API.

---

## 🎯 Target Industries & High-ROI Use Cases

- **SEO & Digital Marketing Agencies**
- **Automated Agency Lead Magnets**
- **Web Development & QA Teams**
- **Content Operations & Publishing Platforms**

### Popular Workflows
- **Automated B2B Prospecting & Enrichment**: Feed a list of targets from Clay, HubSpot, Salesforce, or Google Sheets and enrich every record automatically.
- **Autonomous AI Agent Tooling (MCP)**: Connect this Actor to Claude or Cursor via the official `@apify/actors-mcp-server` so your AI assistant can gather real-time live web intelligence on demand.
- **Scheduled Monitoring**: Schedule recurring runs (daily/weekly) on Apify and push fresh intelligence to Slack, Webhook, Email, or PostgreSQL/Supabase.

---

## 📥 Input Parameters Example

```json
{
  "urls": [
    "https://apify.com"
  ],
  "checkBrokenLinks": true,
  "maxLinksToVerify": 15
}
```

---

## 📤 Output Dataset Sample

Each extracted record is pushed to the default Apify Dataset in clean JSON format:

```json
{
  "url": "https://apify.com/",
  "seoScore": 92,
  "statusCode": 200,
  "responseTimeMs": 210,
  "title": "Apify: Full-stack web scraping and data extraction platform",
  "h1Count": 1,
  "imagesMissingAlt": 0,
  "brokenLinksCount": 0,
  "issues": []
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
        "lucacelli/seo-technical-audit-broken-link-schema-analyzer"
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
curl -X POST "https://api.apify.com/v2/acts/lucacelli~seo-technical-audit-broken-link-schema-analyzer/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://apify.com"],"checkBrokenLinks":true,"maxLinksToVerify":15}'
```

### 3. Node.js SDK
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('lucacelli/seo-technical-audit-broken-link-schema-analyzer').call({"urls":["https://apify.com"],"checkBrokenLinks":true,"maxLinksToVerify":15});
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
`Technical SEO audit, broken link checker, Schema.org validator, on-page SEO analyzer, meta tag scraper, Screaming Frog alternative, Ahrefs audit automation, agency SEO lead magnet`
