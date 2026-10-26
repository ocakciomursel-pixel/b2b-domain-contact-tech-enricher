# Technical SEO, Broken Link, Schema.org & Security Auditor

> 🎁 **RUN FOR FREE WITH YOUR $5.00 APIFY MONTHLY CREDIT:** Every Apify account automatically receives **$5.00 in free platform usage every month** — enough to extract **3,300 to 10,000 verified records every single month for $0.00 out of pocket!** Click the green **Start** button above to test immediately.

---

## ⚡ Why Choose `lucacelli/seo-technical-audit-broken-link-schema-analyzer` Over Screaming Frog / Ahrefs Site Audit ($99–$249/mo)?

- **Ultra-Low Pay-Per-Result Pricing:** Just **$0.80 per 1,000 pages** (`$0.0008/page`) with **$0 monthly subscription** and **$0 hidden add-on charges**.
- **100% Automation & AI-Agent Ready:** Native synchronous REST API endpoint (`/run-sync-get-dataset-items`) for **n8n**, **Make.com**, **Clay.com**, **LangChain**, and **Claude Desktop / Cursor MCP**.
- **Structured JSON, CSV & Excel Output:** Clean, normalized fields ready for immediate CRM or database ingestion.

| Metric | **This Actor (`lucacelli/seo-technical-audit-broken-link-schema-analyzer`)** | **Screaming Frog / Ahrefs Site Audit ($99–$249/mo)** |
| :--- | :--- | :--- |
| **Effective Price per 1,000 pages** | **$0.80 / 1,000 pages** | $49–$299/month mandatory subscription |
| **Free Monthly Allowance** | **Up to 10,000 items/mo free (via $5 Apify credit)** | Trial / Credit Card Wall |
| **n8n / Make / Clay / Claude MCP** | **Native 1-Click Support** | Expensive Enterprise API add-on |

---

## 🔗 3x Power Combo: Chain With Our Other Cloud Actors for Full-Funnel Automation

Multiply your ROI by chaining **`lucacelli/seo-technical-audit-broken-link-schema-analyzer`** with our companion Cloud Actors in **n8n**, **Make.com**, or **Clay**:

1. **Step 1 — Discover Local Businesses & Websites:** **[Google Maps Scraper: Places, Emails, Contacts & Reviews Pro ($1.50/1k)](https://apify.com/lucacelli/google-maps-scraper-places-emails-contacts-reviews)**
2. **Step 2 — Enrich Domains, Verified Emails, DNS MX/DMARC & 38+ Tech Signatures:** **[B2B Domain Contact, Email, DNS & Tech Stack Enricher ($0.80/1k)](https://apify.com/lucacelli/b2b-domain-contact-tech-enricher)**
3. **Step 3 — Audit 45-Point Technical SEO, JSON-LD Schema & Broken Links:** **[Technical SEO, Broken Link, Schema.org & Security Auditor ($0.80/1k)](https://apify.com/lucacelli/seo-technical-audit-broken-link-schema-analyzer)**

👉 **[Download Ready-to-Import 3x Chained n8n Workflow JSON →](https://ocakciomursel-pixel.github.io/b2b-domain-contact-tech-enricher/workflows/chained-3x-pipeline-n8n.json)**

---

## 🤖 Use as a 5-in-1 AI Agent Tool in Claude Desktop, Cursor & Windsurf (MCP)

Paste this into your `claude_desktop_config.json` or Cursor MCP settings to give your AI assistant simultaneous access to **Technical SEO, Broken Link, Schema.org & Security Auditor** plus our top B2B intelligence Actors:

```json
{
  "mcpServers": {
    "lucacelli-b2b-cloud-suite": {
      "command": "npx",
      "args": [
        "-y",
        "@apify/actors-mcp-server",
        "--actors",
        "lucacelli/seo-technical-audit-broken-link-schema-analyzer,lucacelli/google-maps-scraper-places-emails-contacts-reviews,lucacelli/b2b-domain-contact-tech-enricher,lucacelli/shopify-store-product-contact-spy,lucacelli/ai-ready-website-to-markdown-rag-crawler"
      ],
      "env": {
        "APIFY_TOKEN": "YOUR_APIFY_TOKEN_HERE"
      }
    }
  }
}
```

---

## 🚀 Synchronous REST API, Python & Node.js Quickstart

### 1. Synchronous HTTP POST (n8n / Make.com / Clay / cURL)

```bash
curl -X POST "https://api.apify.com/v2/acts/lucacelli~seo-technical-audit-broken-link-schema-analyzer/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "urls": [
    "https://apify.com",
    "https://cloudflare.com"
  ],
  "checkBrokenLinks": true
}'
```

### 2. Python (`apify-client`)

```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_APIFY_TOKEN")
run = client.actor("lucacelli/seo-technical-audit-broken-link-schema-analyzer").call(run_input={
    "urls": [
        "https://apify.com",
        "https://cloudflare.com"
    ],
    "checkBrokenLinks": true
})
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)
```

---

## 🌐 Complete Suite of 14 Live Cloud Actors by [@lucacelli](https://apify.com/lucacelli)

| Cloud Actor | Price | Legacy Tool Replaced | Open in Apify Store |
| :--- | :--- | :--- | :--- |
| **[Google Maps Scraper: Places, Emails, Contacts & Reviews Pro](https://apify.com/lucacelli/google-maps-scraper-places-emails-contacts-reviews)** | **$1.50 / 1k places** | *Outscraper / PhantomBuster ($49–$199/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/google-maps-scraper-places-emails-contacts-reviews) |
| **[B2B Domain Contact, Email, DNS & Tech Stack Enricher](https://apify.com/lucacelli/b2b-domain-contact-tech-enricher)** | **$0.80 / 1k domains** | *Apollo.io / BuiltWith / Hunter ($99–$295/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/b2b-domain-contact-tech-enricher) |
| **[Shopify Store Product, Pricing, Stock & Merchant Contact Spy](https://apify.com/lucacelli/shopify-store-product-contact-spy)** | **$0.50 / 1k products** | *Koala Inspector / Commerce Inspector ($49–$99/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/shopify-store-product-contact-spy) |
| **[Website to Clean Markdown, Vector RAG Chunks & llms.txt](https://apify.com/lucacelli/ai-ready-website-to-markdown-rag-crawler)** | **$0.50 / 1k pages** | *Firecrawl / Jina Reader API ($19–$99/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/ai-ready-website-to-markdown-rag-crawler) |
| **[Technical SEO, Broken Link, Schema.org & Security Auditor](https://apify.com/lucacelli/seo-technical-audit-broken-link-schema-analyzer)** | **$0.80 / 1k pages** | *Screaming Frog / Ahrefs Site Audit ($99–$249/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/seo-technical-audit-broken-link-schema-analyzer) |
| **[GitHub Developer, Stargazer & Contributor Lead Enricher](https://apify.com/lucacelli/github-developer-recruiter-lead-enricher)** | **$0.80 / 1k developers** | *SeekOut / Gem / Clay ($149–$499/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/github-developer-recruiter-lead-enricher) |
| **[Greenhouse & Lever Company Job Board & Hiring Signal Scraper](https://apify.com/lucacelli/ats-job-board-hiring-signal-scraper)** | **$0.50 / 1k jobs** | *Clay Hiring Signals / LoneScale ($149+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/ats-job-board-hiring-signal-scraper) |
| **[Reddit Subreddit, Buyer Intent & Pain-Point Lead Miner](https://apify.com/lucacelli/reddit-community-pain-point-trend-miner)** | **$0.50 / 1k posts** | *GummySearch / Syften ($29–$79/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/reddit-community-pain-point-trend-miner) |
| **[WordPress & WooCommerce Theme, Plugin & Agency Lead Spy](https://apify.com/lucacelli/wordpress-woocommerce-site-spy)** | **$0.80 / 1k sites** | *Wappalyzer / BuiltWith ($99+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/wordpress-woocommerce-site-spy) |
| **[Hacker News Launch, Show HN & Tech Founder Lead Monitor](https://apify.com/lucacelli/hackernews-tech-launch-lead-monitor)** | **$0.50 / 1k storys** | *Harmonic.ai / PitchBook Alerts ($200+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/hackernews-tech-launch-lead-monitor) |
| **[XML Sitemap URL Inventory, SEO Freshness & Content Auditor](https://apify.com/lucacelli/sitemap-url-inventory-content-freshness-auditor)** | **$0.50 / 1k URLs** | *Visualping / Screaming Frog ($49+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/sitemap-url-inventory-content-freshness-auditor) |
| **[SaaS Pricing Page, Plan Tiers & Competitor Feature Spy](https://apify.com/lucacelli/saas-pricing-page-tier-feature-extractor)** | **$0.80 / 1k pages** | *Klue / Crayon ($500+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/saas-pricing-page-tier-feature-extractor) |
| **[ClinicalTrials.gov & OpenFDA Biotech / Pharma Lead Enricher](https://apify.com/lucacelli/clinical-trials-fda-drug-safety-intel)** | **$0.80 / 1k trials** | *Citeline / GlobalData Pharma ($500+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/clinical-trials-fda-drug-safety-intel) |
| **[Scientific Paper, Author Email & Lab Research Lead Miner](https://apify.com/lucacelli/scientific-literature-citation-author-lead-miner)** | **$0.50 / 1k papers** | *Dimensions.ai / SciLeads ($300+/mo)* | [🚀 Run Actor →](https://apify.com/lucacelli/scientific-literature-citation-author-lead-miner) |
