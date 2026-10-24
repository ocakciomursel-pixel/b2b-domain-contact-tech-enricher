# ClinicalTrials.gov & OpenFDA Drug Safety & Biotech Lead Intelligence (MCP Ready)

> **ClinicalTrials.gov Scraper & OpenFDA Adverse Event Drug Safety Tool** — Enterprise Healthcare & Pharma intelligence Actor: combines ClinicalTrials.gov API v2 and OpenFDA to extract active clinical trials, phases, lead sponsors, principal investigator contacts, and FDA adverse event safety signals.

---

## 🚀 Why Choose This Actor?

1. **Ultra-Low Compute Cost (No Headless Browser Overhead)**: Built on a high-efficiency HTTP & structured-data parsing engine instead of heavy Chromium instances. Runs **10x faster** and consumes minimal Apify platform RAM/CPU.
2. **Transparent Pay-Per-Event Pricing**: You only pay for actual results delivered (`study-enriched`), never for wasted idle time.
3. **100% MCP & AI Agent Ready**: Designed with strict JSON schemas so **Claude Desktop, Cursor, OpenAI Agents, LangChain, n8n, Make.com, Zapier, and Clay** can call this Actor autonomously as a tool.
4. **Clean, Structured Export**: Download results in **JSON, CSV, Excel, XML, or RSS** directly from the Apify dataset tab or via REST API.

---

## 🎯 Target Industries & High-ROI Use Cases

- **Clinical Research Organizations (CROs) & Biotech Sales**
- **Healthcare Venture Capital & Pharma Analysts**
- **Medical Affairs & Pharmacovigilance Teams**
- **Life Sciences AI Research Agents**

### Popular Workflows
- **Automated B2B Prospecting & Enrichment**: Feed a list of targets from Clay, HubSpot, Salesforce, or Google Sheets and enrich every record automatically.
- **Autonomous AI Agent Tooling (MCP)**: Connect this Actor to Claude or Cursor via the official `@apify/actors-mcp-server` so your AI assistant can gather real-time live web intelligence on demand.
- **Scheduled Monitoring**: Schedule recurring runs (daily/weekly) on Apify and push fresh intelligence to Slack, Webhook, Email, or PostgreSQL/Supabase.

---

## 📥 Input Parameters Example

```json
{
  "conditionsOrDrugs": [
    "semaglutide"
  ],
  "maxStudiesPerQuery": 10,
  "enrichFdaSafety": true
}
```

---

## 📤 Output Dataset Sample

Each extracted record is pushed to the default Apify Dataset in clean JSON format:

```json
{
  "nctId": "NCT03552757",
  "briefTitle": "Effect and Safety of Semaglutide 2.4 mg Once-weekly",
  "overallStatus": "COMPLETED",
  "phases": [
    "PHASE3"
  ],
  "leadSponsor": "Novo Nordisk A/S",
  "fdaAdverseEventsTotal": 3609,
  "studyUrl": "https://clinicaltrials.gov/study/NCT03552757"
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
        "lucacelli/clinical-trials-fda-drug-safety-intel"
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
curl -X POST "https://api.apify.com/v2/acts/lucacelli~clinical-trials-fda-drug-safety-intel/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conditionsOrDrugs":["semaglutide"],"maxStudiesPerQuery":10,"enrichFdaSafety":true}'
```

### 3. Node.js SDK
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('lucacelli/clinical-trials-fda-drug-safety-intel').call({"conditionsOrDrugs":["semaglutide"],"maxStudiesPerQuery":10,"enrichFdaSafety":true});
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
`ClinicalTrials.gov scraper, OpenFDA adverse events, biotech lead generation, clinical research organization CRO leads, pharma competitive intelligence, principal investigator finder`
