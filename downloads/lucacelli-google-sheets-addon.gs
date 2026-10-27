/**
 * ============================================================================
 * LUCACELLI B2B CLOUD — GOOGLE SHEETS™ CUSTOM FORMULAS & SIDEBAR ADD-ON
 * ============================================================================
 * Powered by https://apify.com/lucacelli (Includes $5.00/Month Free Apify Credit)
 * Transparent Single-Event Pricing ($0.50 - $1.50 per 1,000 results).
 *
 * HOW TO INSTALL IN 30 SECONDS:
 * 1. Open any Google Sheet -> Extensions -> Apps Script.
 * 2. Paste this entire file into Code.gs and click Save (Ctrl+S).
 * 3. Reload your Google Sheet -> Click "⚡ Lucacelli B2B Cloud" -> "Set Apify API Token".
 * 4. Use formulas in any cell:
 *    =LUCACELLI_ENRICH("stripe.com")
 *    =LUCACELLI_SEO("https://stripe.com")
 *    =LUCACELLI_WP_SPY("techcrunch.com")
 *    =LUCACELLI_SHOPIFY("gymshark.com")
 *    =LUCACELLI_GMAPS("dentists in Austin TX", 5)
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Lucacelli B2B Cloud')
    .addItem('🔑 Set Free Apify API Token ($5/Mo Credit)', 'setLucacelliApiToken')
    .addItem('🚀 Enrich Selected Domain Cells', 'enrichSelectedRows')
    .addSeparator()
    .addItem('🌐 Open @lucacelli Apify Store (14 Live Actors)', 'openStoreInfo')
    .addToUi();
}

function setLucacelliApiToken() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt(
    'Lucacelli B2B Cloud — Set Apify API Token',
    'Paste your Apify API token (apify_api_...). Every free Apify account includes $5.00/month in renewable credit (https://console.apify.com/settings/integrations):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty('LUCACELLI_APIFY_TOKEN', res.getResponseText().trim());
    ui.alert('✅ Apify Token saved! You can now use =LUCACELLI_ENRICH(A2), =LUCACELLI_GMAPS(), =LUCACELLI_SEO(), etc.');
  }
}

function openStoreInfo() {
  SpreadsheetApp.getUi().alert('Visit https://apify.com/lucacelli to view all 14 Public B2B & AI Actors.');
}

function callLucacelliActor_(actorSlug, payload, tokenOverride) {
  var token = tokenOverride || PropertiesService.getUserProperties().getProperty('LUCACELLI_APIFY_TOKEN');
  if (!token) {
    return [['ERROR: Click "⚡ Lucacelli B2B Cloud -> Set Free Apify API Token" or pass token as 2nd parameter']];
  }
  var url = 'https://api.apify.com/v2/acts/lucacelli~' + encodeURIComponent(actorSlug) + '/run-sync-get-dataset-items?token=' + encodeURIComponent(token);
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

/**
 * Enriches a domain with Emails, Phones, Social Profiles, SPF & Tech Stack ($0.50/1k).
 * @param {string} domain The domain to enrich (e.g. "stripe.com").
 * @param {string} apiToken Optional Apify API token override.
 * @return Horizontal row: [Emails, Phones, Tech Stack, SPF Status, Title]
 * @customfunction
 */
function LUCACELLI_ENRICH(domain, apiToken) {
  if (!domain) return '';
  var clean = String(domain).replace(/^https?:\/\//i, '').split('/')[0].trim();
  var items = callLucacelliActor_('b2b-domain-contact-tech-enricher', { domains: [clean] }, apiToken);
  if (!Array.isArray(items) || !items.length || !items[0].domain) return items;
  var r = items[0];
  return [[
    (r.emails || []).join(', '),
    (r.phones || []).join(', '),
    (r.technologies || r.techStack || []).join(', '),
    r.hasSpf ? 'SPF Valid' : 'No SPF',
    r.title || ''
  ]];
}

/**
 * Audits a URL for Technical SEO, Broken Links, Schema.org & Security Headers ($0.50/1k).
 * @param {string} url The webpage URL (e.g. "https://stripe.com").
 * @param {string} apiToken Optional Apify API token override.
 * @return Horizontal row: [SEO Score/Status, Title, Word Count, Schema Types, Broken Links]
 * @customfunction
 */
function LUCACELLI_SEO(url, apiToken) {
  if (!url) return '';
  var clean = String(url).trim();
  if (clean.indexOf('http') !== 0) clean = 'https://' + clean;
  var items = callLucacelliActor_('seo-technical-audit-broken-link-schema-analyzer', { urls: [clean] }, apiToken);
  if (!Array.isArray(items) || !items.length) return items;
  var r = items[0];
  return [[
    r.seoScore || r.statusCode || 200,
    r.title || '',
    r.wordCount || 0,
    (r.schemaTypes || []).join(', '),
    r.brokenLinksCount || 0
  ]];
}

/**
 * Detects WordPress Themes, Plugins & WooCommerce Store Signals ($0.80/1k).
 * @param {string} domain Domain to inspect (e.g. "techcrunch.com").
 * @param {string} apiToken Optional Apify API token override.
 * @return Horizontal row: [Is WordPress, Theme, Detected Plugins, Is WooCommerce]
 * @customfunction
 */
function LUCACELLI_WP_SPY(domain, apiToken) {
  if (!domain) return '';
  var clean = String(domain).replace(/^https?:\/\//i, '').split('/')[0].trim();
  var items = callLucacelliActor_('wordpress-woocommerce-site-spy', { domains: [clean] }, apiToken);
  if (!Array.isArray(items) || !items.length) return items;
  var r = items[0];
  return [[
    Boolean(r.isWordPress),
    r.themeName || r.theme || 'N/A',
    (r.plugins || []).join(', '),
    Boolean(r.isWooCommerce)
  ]];
}

/**
 * Extracts Shopify Store Products, Prices, Stock & Merchant Contacts ($0.80/1k).
 * @param {string} domain Shopify store domain (e.g. "gymshark.com").
 * @param {string} apiToken Optional Apify API token override.
 * @return Horizontal row: [Store Title, Product Count, Average Price, Sample Products]
 * @customfunction
 */
function LUCACELLI_SHOPIFY(domain, apiToken) {
  if (!domain) return '';
  var clean = String(domain).replace(/^https?:\/\//i, '').split('/')[0].trim();
  var items = callLucacelliActor_('shopify-store-product-contact-spy', { domains: [clean], maxProductsPerStore: 5 }, apiToken);
  if (!Array.isArray(items) || !items.length) return items;
  var r = items[0];
  return [[
    r.storeName || r.domain || clean,
    r.productCount || items.length,
    r.averagePrice || r.price || '',
    r.title || (r.products ? r.products.map(function(p){return p.title;}).join('; ') : '')
  ]];
}

/**
 * Scrapes Google Maps Places, Emails, Phone Numbers & Reviews directly into rows ($1.50/1k).
 * @param {string} query Search query (e.g. "dentists in Austin TX").
 * @param {number} maxResults Number of leads to return (default 5).
 * @param {string} apiToken Optional Apify API token override.
 * @return Multi-row table of [Title, Phone, Email/Website, Rating, Address]
 * @customfunction
 */
function LUCACELLI_GMAPS(query, maxResults, apiToken) {
  if (!query) return '';
  var items = callLucacelliActor_('google-maps-scraper-places-emails-contacts-reviews', {
    queries: [String(query)],
    maxResultsPerQuery: Number(maxResults) || 5
  }, apiToken);
  if (!Array.isArray(items) || !items.length) return items;
  var rows = [['Business Name', 'Phone', 'Website / Email', 'Rating', 'Address']];
  for (var i = 0; i < items.length; i++) {
    var x = items[i];
    rows.push([
      x.title || x.name || '',
      x.phone || '',
      (x.emails && x.emails.length ? x.emails.join(', ') : (x.website || '')),
      x.rating || x.totalScore || '',
      x.address || ''
    ]);
  }
  return rows;
}

function enrichSelectedRows() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getActiveRange();
  var values = range.getValues();
  var domains = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) domains.push(String(values[i][0]).replace(/^https?:\/\//i, '').split('/')[0].trim());
  }
  if (!domains.length) return;
  var items = callLucacelliActor_('b2b-domain-contact-tech-enricher', { domains: domains });
  if (!Array.isArray(items)) return;
  var startRow = range.getRow();
  var startCol = range.getColumn() + 1;
  for (var j = 0; j < items.length; j++) {
    var r = items[j];
    sheet.getRange(startRow + j, startCol, 1, 4).setValues([[
      (r.emails || []).join(', '),
      (r.phones || []).join(', '),
      (r.technologies || r.techStack || []).join(', '),
      r.hasSpf ? 'SPF Valid' : 'No SPF'
    ]]);
  }
}
