/**
 * 🚀 LUCACELLI GOOGLE SHEETS B2B LEAD AUTOMATION ADD-ON (Code.gs)
 *
 * How to use:
 * 1. In any Google Sheet, click Extensions -> Apps Script.
 * 2. Paste this script and press Save.
 * 3. Replace YOUR_APIFY_API_TOKEN below with your free token from https://console.apify.com/settings/integrations ($5.00/mo free credit included).
 * 4. Reload your Google Sheet and use the new "🚀 Lucacelli B2B Automation" menu!
 */

const APIFY_TOKEN = 'YOUR_APIFY_API_TOKEN';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Lucacelli B2B Automation')
    .addItem('📍 1. Pull Google Maps + Emails + Tech Stack', 'runGoogleMapsScraper')
    .addItem('📧 2. Enrich Domains in Column A (Emails + DNS + Tech)', 'enrichDomainsInSheet')
    .addToUi();
}

function runGoogleMapsScraper() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('Google Maps Lead Automation', 'Enter search query (e.g. "dentist in Miami FL" or "diş kliniği Kadıköy İstanbul"):', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const query = prompt.getResponseText().trim() || 'dentist in Miami FL';

  const url = 'https://api.apify.com/v2/acts/lucacelli~google-maps-scraper-places-emails-contacts-reviews/run-sync-get-dataset-items?token=' + encodeURIComponent(APIFY_TOKEN);
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      searchQueries: [query],
      maxPlacesPerQuery: 25,
      enrichWebsiteData: true
    }),
    muteHttpExceptions: true
  });

  const items = JSON.parse(res.getContentText() || '[]');
  const headers = ['Business Name', 'Category', 'Phone', 'WhatsApp Link', 'Primary Email', 'All Emails', 'Website', 'City', 'Address', 'Rating', 'Reviews', 'Tech Stack', 'DNS Deliverability', 'Lead Score', 'AI Cold Email Opener'];
  sheet.clear();
  sheet.appendRow(headers);

  items.forEach(function(item) {
    sheet.appendRow([
      item.title || '',
      item.categoryName || '',
      item.phone || '',
      item.whatsappUrl || '',
      item.primaryEmail || '',
      (item.emails || []).join(', '),
      item.website || '',
      item.city || '',
      item.address || '',
      item.totalScore || '',
      item.reviewsCount || '',
      (item.techStack || []).join(', '),
      item.emailDeliverability || '',
      item.leadOpportunityScore || '',
      item.coldEmailIcebreaker || ''
    ]);
  });
}

function enrichDomainsInSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const domains = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0] || '').trim(); }).filter(Boolean);
  if (domains.length === 0) return;

  const url = 'https://api.apify.com/v2/acts/lucacelli~b2b-domain-contact-tech-enricher/run-sync-get-dataset-items?token=' + encodeURIComponent(APIFY_TOKEN);
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ domains: domains, crawlContactPages: true }),
    muteHttpExceptions: true
  });
  const items = JSON.parse(res.getContentText() || '[]');
  sheet.getRange(1, 2, 1, 5).setValues([['Emails', 'Phones', 'Tech Stack', 'DNS Security', 'Cold Email Opener']]);
  items.forEach(function(it, idx) {
    sheet.getRange(idx + 2, 2, 1, 5).setValues([[
      (it.emails || []).join(', '),
      (it.phones || []).join(', '),
      (it.techStack || []).join(', '),
      JSON.stringify(it.dnsSecurity || {}),
      it.coldEmailIcebreaker || ''
    ]]);
  });
}
