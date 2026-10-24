# Domain Cybersecurity, DNS (SPF/DMARC), Email Provider & Security Header Auditor (MCP Ready)

> **Domain Cybersecurity Auditor | SPF, DMARC, DNS & HTTP Security Headers** — Enterprise Cybersecurity & MSP Lead Actor: audits any domain for SPF, DMARC, MX email security providers, CAA records, HTTP security headers (HSTS, CSP, X-Frame-Options), and computes a 0-100 Security Posture Score.

---

## 🚀 Why Choose This Actor?

1. **Ultra-Low Compute Cost (No Headless Browser Overhead)**: Built on a high-efficiency HTTP & structured-data parsing engine instead of heavy Chromium instances. Runs **10x faster** and consumes minimal Apify platform RAM/CPU.
2. **Transparent Pay-Per-Event Pricing**: You only pay for actual results delivered (`domain-security-audited`), never for wasted idle time.
3. **100% MCP & AI Agent Ready**: Designed with strict JSON schemas so **Claude Desktop, Cursor, OpenAI Agents, LangChain, n8n, Make.com, Zapier, and Clay** can call this Actor autonomously as a tool.
4. **Clean, Structured Export**: Download results in **JSON, CSV, Excel, XML, or RSS** directly from the Apify dataset tab or via REST API.

---

## 🎯 Target Industries & High-ROI Use Cases

- **Managed Security Service Providers (MSPs / MSSPs)**
- **Penetration Testing & Security Consultancies**
- **Cyber Insurance Underwriting & Risk Teams**
- **DevSecOps & Compliance Automation**

### Popular Workflows
- **Automated B2B Prospecting & Enrichment**: Feed a list of targets from Clay, HubSpot, Salesforce, or Google Sheets and enrich every record automatically.
- **Autonomous AI Agent Tooling (MCP)**: Connect this Actor to Claude or Cursor via the official `@apify/actors-mcp-server` so your AI assistant can gather real-time live web intelligence on demand.
- **Scheduled Monitoring**: Schedule recurring runs (daily/weekly) on Apify and push fresh intelligence to Slack, Webhook, Email, or PostgreSQL/Supabase.

---

## 📥 Input Parameters Example

```json
{
  "domains": [
    "cloudflare.com",
    "news.ycombinator.com"
  ]
}
```

---

## 📤 Output Dataset Sample

Each extracted record is pushed to the default Apify Dataset in clean JSON format:

```json
{
  "domain": "news.ycombinator.com",
  "securityScore": 68,
  "emailProvider": "Google Workspace",
  "hasSpf": true,
  "hasDmarc": true,
  "hasHsts": true,
  "hasCsp": false,
  "vulnerabilities": [
    "MEDIUM: Missing Content-Security-Policy (CSP) header"
  ]
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
        "lucacelli/domain-cybersecurity-ssl-dns-vulnerability-auditor"
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
curl -X POST "https://api.apify.com/v2/acts/lucacelli~domain-cybersecurity-ssl-dns-vulnerability-auditor/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domains":["cloudflare.com","news.ycombinator.com"]}'
```

### 3. Node.js SDK
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('lucacelli/domain-cybersecurity-ssl-dns-vulnerability-auditor').call({"domains":["cloudflare.com","news.ycombinator.com"]});
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
`Cybersecurity lead generation, SPF DMARC checker bulk, MSP prospecting tool, HTTP security header scanner, email gateway detector, attack surface monitor`
