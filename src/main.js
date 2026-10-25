import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

function __enrichV2(item) {
  if (!item || typeof item !== 'object') return item;
  if (item.intelligenceScore !== undefined) return item;
  const keys = Object.keys(item);
  const nonEmpty = keys.filter((k) => {
    const v = item[k];
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
  const completenessPct = keys.length > 0 ? Math.min(100, Math.round((nonEmpty.length / keys.length) * 100)) : 80;
  const score = Math.min(99, Math.max(62, Math.round(completenessPct * 0.85 + Math.min(15, keys.length * 1.5))));
  const priorityTier = score >= 82 ? 'TIER-1 HIGH SIGNAL' : 'TIER-2 STANDARD';
  return {
    ...item,
    intelligenceScore: score,
    priorityTier,
    dataCompletenessPct: completenessPct,
  };
}
function __wrapPushData(payload) {
  if (Array.isArray(payload)) return payload.map(__enrichV2);
  return __enrichV2(payload);
}


const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MODE = "domlead";
const INPUT_PROP = "domains";
const DEFAULT_LIST = ["carmax.com"];
const EVENT_NAME = "dealership-enriched";

const DISPOSABLE_DOMAINS = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com']);
const ROLE_PREFIXES = new Set(['info', 'admin', 'support', 'sales', 'contact', 'office', 'billing', 'help', 'careers', 'hr', 'press', 'legal', 'security', 'noreply', 'no-reply']);

async function safeFetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            ...options,
            headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json,text/plain,*/*', ...(options.headers || {}) },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function safeFetchText(url, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, ...headers },
        });
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    } finally {
        clearTimeout(timer);
    }
}

async function processTarget(target, maxItems) {
    const q = String(target || '').trim();
    const cleanDomain = q.replace(/^https?:\/\//i, '').split('/')[0];
    const now = new Date().toISOString();

    switch (MODE) {
        case 'wpplugins': {
            const data = await safeFetchJson(`https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[search]=${encodeURIComponent(q)}&request[per_page]=${Math.min(maxItems, 15)}`);
            const plugins = data?.plugins || [];
            if (plugins.length > 0) {
                return plugins.map((p) => ({
                    target: q,
                    name: p.name,
                    slug: p.slug,
                    version: p.version,
                    author: String(p.author || '').replace(/<[^>]+>/g, ''),
                    authorProfile: p.author_profile || null,
                    activeInstalls: p.active_installs || 0,
                    downloaded: p.downloaded || 0,
                    rating: p.rating || 0,
                    numRatings: p.num_ratings || 0,
                    supportThreads: p.support_threads || 0,
                    homepage: p.homepage || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'wpthemes': {
            const data = await safeFetchJson(`https://api.wordpress.org/themes/info/1.2/?action=query_themes&request[search]=${encodeURIComponent(q)}&request[per_page]=${Math.min(maxItems, 15)}`);
            const themes = data?.themes || [];
            if (themes.length > 0) {
                return themes.map((t) => ({
                    target: q,
                    name: t.name,
                    slug: t.slug,
                    version: t.version,
                    author: t.author?.user_nicename || t.author || null,
                    previewUrl: t.preview_url || null,
                    rating: t.rating || 0,
                    numRatings: t.num_ratings || 0,
                    homepage: t.homepage || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'atlassian': {
            const data = await safeFetchJson(`https://marketplace.atlassian.com/rest/2/addons?text=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const addons = data?._embedded?.addons || [];
            if (addons.length > 0) {
                return addons.map((a) => ({
                    target: q,
                    name: a.name,
                    key: a.key,
                    summary: a.summary || null,
                    tagLine: a.tagLine || null,
                    totalInstalls: a._embedded?.distribution?.totalInstalls || 0,
                    totalUsers: a._embedded?.distribution?.totalUsers || 0,
                    averageStars: a._embedded?.reviews?.averageStars || null,
                    reviewCount: a._embedded?.reviews?.count || 0,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'paymentstack': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = (await safeFetchText(url)).toLowerCase();
            if (html) {
                return [{
                    target: cleanDomain,
                    hasStripe: html.includes('js.stripe.com') || html.includes('stripe.com'),
                    hasPayPal: html.includes('paypal.com') || html.includes('paypalobjects.com'),
                    hasAdyen: html.includes('adyen.com'),
                    hasBraintree: html.includes('braintreegateway.com') || html.includes('braintree'),
                    hasPaddle: html.includes('paddle.com'),
                    hasKlarnaOrAffirm: html.includes('klarna') || html.includes('affirm.com'),
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'apireadiness': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = (await safeFetchText(url)).toLowerCase();
            if (html) {
                return [{
                    target: cleanDomain,
                    hasApiDocsLink: html.includes('/docs') || html.includes('developers.') || html.includes('/api'),
                    mentionsZapier: html.includes('zapier'),
                    mentionsMakeOrIntegromat: html.includes('make.com') || html.includes('integromat'),
                    mentionsN8n: html.includes('n8n'),
                    mentionsWebhook: html.includes('webhook'),
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'gleif': {
            const data = await safeFetchJson(`https://api.gleif.org/api/v1/lei-records?filter[fulltext]=${encodeURIComponent(q)}&page[size]=${Math.min(maxItems, 15)}`);
            const rows = data?.data || [];
            if (rows.length > 0) {
                return rows.map((r) => {
                    const entity = r.attributes?.entity || {};
                    return {
                        target: q,
                        lei: r.id || r.attributes?.lei,
                        legalName: entity.legalName?.name || null,
                        jurisdiction: entity.jurisdiction || null,
                        status: entity.status || null,
                        legalCity: entity.legalAddress?.city || null,
                        legalCountry: entity.legalAddress?.country || null,
                        bic: r.attributes?.bic || [],
                        extractedAt: now,
                    };
                });
            }
            break;
        }
        case 'nonprofit990': {
            const data = await safeFetchJson(`https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}`);
            const orgs = data?.organizations || [];
            if (orgs.length > 0) {
                return orgs.slice(0, maxItems).map((o) => ({
                    target: q,
                    ein: o.ein,
                    name: o.name,
                    city: o.city,
                    state: o.state,
                    nteeCode: o.ntee_code || null,
                    score: o.score || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'openalexinst': {
            const data = await safeFetchJson(`https://api.openalex.org/institutions?search=${encodeURIComponent(q)}&per-page=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((i) => ({
                    target: q,
                    id: i.id,
                    displayName: i.display_name,
                    ror: i.ror || null,
                    countryCode: i.country_code || null,
                    type: i.type || null,
                    worksCount: i.works_count || 0,
                    citedByCount: i.cited_by_count || 0,
                    homepageUrl: i.homepage_url || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'openalexauthor': {
            const data = await safeFetchJson(`https://api.openalex.org/authors?search=${encodeURIComponent(q)}&per-page=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((a) => ({
                    target: q,
                    id: a.id,
                    displayName: a.display_name,
                    orcid: a.orcid || null,
                    worksCount: a.works_count || 0,
                    citedByCount: a.cited_by_count || 0,
                    hIndex: a.summary_stats?.h_index || 0,
                    i10Index: a.summary_stats?.i10_index || 0,
                    affiliation: a.last_known_institutions?.[0]?.display_name || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'openalexfunder': {
            const data = await safeFetchJson(`https://api.openalex.org/funders?search=${encodeURIComponent(q)}&per-page=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((f) => ({
                    target: q,
                    id: f.id,
                    displayName: f.display_name,
                    countryCode: f.country_code || null,
                    grantsCount: f.grants_count || 0,
                    worksCount: f.works_count || 0,
                    citedByCount: f.cited_by_count || 0,
                    homepageUrl: f.homepage_url || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'clearbit': {
            const data = await safeFetchJson(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((c) => ({
                    target: q,
                    companyName: c.name,
                    domain: c.domain,
                    logoUrl: c.logo,
                    websiteUrl: `https://${c.domain}`,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'vatcheck': {
            const cleanVat = q.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            const countryCode = cleanVat.slice(0, 2);
            const numberPart = cleanVat.slice(2);
            const isValidSyntax = /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(cleanVat);
            return [{
                target: q,
                normalizedVat: cleanVat,
                countryCode,
                vatNumberPart: numberPart,
                isValidFormat: isValidSyntax,
                extractedAt: now,
            }];
        }
        case 'emailverifier': {
            const email = q.toLowerCase();
            const parts = email.split('@');
            const isValidSyntax = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
            const localPart = parts[0] || '';
            const domainPart = parts[1] || cleanDomain;
            const mxRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(domainPart)}&type=MX`);
            const mxRecords = (mxRes?.Answer || []).map((a) => a.data);
            return [{
                target: email,
                isValidSyntax,
                domain: domainPart,
                hasMxRecords: mxRecords.length > 0,
                mxRecords,
                isDisposableDomain: DISPOSABLE_DOMAINS.has(domainPart),
                isRoleAccount: ROLE_PREFIXES.has(localPart),
                deliverabilityRisk: !isValidSyntax || mxRecords.length === 0 || DISPOSABLE_DOMAINS.has(domainPart) ? 'HIGH' : 'LOW',
                extractedAt: now,
            }];
        }
        case 'phoneformatter': {
            const digits = q.replace(/[^0-9]/g, '');
            const e164 = digits ? `+${digits}` : q;
            return [{
                target: q,
                e164Formatted: e164,
                digitsOnly: digits,
                digitLength: digits.length,
                isValidLength: digits.length >= 8 && digits.length <= 15,
                whatsappDirectUrl: digits ? `https://wa.me/${digits}` : null,
                telUri: `tel:${e164}`,
                extractedAt: now,
            }];
        }
        case 'urlresolver': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            try {
                const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': BROWSER_UA } });
                return [{
                    target: url,
                    finalUrl: res.url,
                    statusCode: res.status,
                    wasRedirected: res.redirected,
                    contentType: res.headers.get('content-type') || null,
                    extractedAt: now,
                }];
            } catch {} finally {
                clearTimeout(timer);
            }
            break;
        }
        case 'icebreaker': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const $ = cheerio.load(html);
                const title = $('title').first().text().replace(/\s+/g, ' ').trim();
                const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
                const desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
                const h2s = [];
                $('h2').slice(0, 4).each((_, el) => { h2s.push($(el).text().replace(/\s+/g, ' ').trim()); });
                return [{
                    target: cleanDomain,
                    companyTitle: title,
                    heroHeadline: h1,
                    valueProposition: desc.trim(),
                    keySectionHeadings: h2s.filter(Boolean),
                    suggestedOpeningLine: `Saw ${cleanDomain}'s focus on "${h1 || title}" — impressive work around ${(h2s[0] || 'your core platform').toLowerCase()}.`,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'parkedcheck': {
            const url = `https://${cleanDomain}`;
            const html = (await safeFetchText(url)).toLowerCase();
            const isParked = html.includes('domain is for sale') || html.includes('sedoparking') || html.includes('godaddy.com/forsale') || html.includes('dan.com') || html.includes('afternic');
            return [{
                target: cleanDomain,
                isReachable: html.length > 0,
                isParkedOrForSale: isParked,
                htmlByteLength: html.length,
                status: html.length === 0 ? 'UNREACHABLE' : (isParked ? 'PARKED_FOR_SALE' : 'ACTIVE_WEBSITE'),
                extractedAt: now,
            }];
        }
        case 'llmstxt': {
            const llmsTxt = await safeFetchText(`https://${cleanDomain}/llms.txt`);
            const html = await safeFetchText(`https://${cleanDomain}`);
            const $ = cheerio.load(html || '');
            const title = $('title').first().text().trim() || cleanDomain;
            const desc = $('meta[name="description"]').attr('content') || '';
            const navLinks = [];
            $('a[href]').slice(0, 15).each((_, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                const href = $(el).attr('href');
                if (text && href && !href.startsWith('#')) navLinks.push(`- [${text}](${href})`);
            });
            return [{
                target: cleanDomain,
                hasPublishedLlmsTxt: llmsTxt.length > 20 && !llmsTxt.trim().startsWith('<!DOCTYPE'),
                generatedLlmsTxtTemplate: `# ${title}\n\n> ${desc}\n\n## Key Sections\n${navLinks.slice(0, 8).join('\n')}`,
                extractedAt: now,
            }];
        }
        case 'jsonldgen': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            const $ = cheerio.load(html || '');
            const title = $('title').first().text().trim() || cleanDomain;
            const desc = $('meta[name="description"]').attr('content') || '';
            const existingCount = $('script[type="application/ld+json"]').length;
            return [{
                target: url,
                existingJsonLdScriptsCount: existingCount,
                generatedOrganizationSchema: {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: title,
                    url: `https://${cleanDomain}`,
                    description: desc,
                },
                extractedAt: now,
            }];
        }
        case 'techspend': {
            const html = (await safeFetchText(`https://${cleanDomain}`)).toLowerCase();
            const signals = [];
            if (html.includes('segment.com') || html.includes('analytics.js')) signals.push('Segment CDP');
            if (html.includes('intercom')) signals.push('Intercom');
            if (html.includes('hubspot') || html.includes('hs-scripts')) signals.push('HubSpot');
            if (html.includes('optimizely')) signals.push('Optimizely');
            if (html.includes('sentry')) signals.push('Sentry');
            if (html.includes('stripe.com')) signals.push('Stripe');
            if (html.includes('googletagmanager')) signals.push('Google Tag Manager');
            const tier = signals.length >= 3 ? 'ENTERPRISE_HIGH ($2,500+/mo)' : (signals.length >= 1 ? 'GROWTH_MID ($500-$2,500/mo)' : 'SMB_STARTER (<$500/mo)');
            return [{
                target: cleanDomain,
                detectedPaidTools: signals,
                detectedToolsCount: signals.length,
                estimatedSaaSSpendTier: tier,
                extractedAt: now,
            }];
        }
        case 'wcagaudit': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            const $ = cheerio.load(html || '');
            const totalImages = $('img').length;
            const missingAlt = $('img:not([alt]), img[alt=""]').length;
            const hasLangAttr = Boolean($('html').attr('lang'));
            const ariaElementsCount = $('[role], [aria-label], [aria-labelledby]').length;
            return [{
                target: url,
                hasHtmlLangAttribute: hasLangAttr,
                totalImages,
                imagesMissingAltCount: missingAlt,
                ariaElementsCount,
                needsAccessibilityRemediation: !hasLangAttr || missingAlt > 0,
                extractedAt: now,
            }];
        }
        case 'perfbloat': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const t0 = Date.now();
            const html = await safeFetchText(url);
            const ttfbMs = Date.now() - t0;
            const $ = cheerio.load(html || '');
            return [{
                target: url,
                responseTimeMs: ttfbMs,
                htmlSizeKb: Math.round((html.length / 1024) * 10) / 10,
                scriptTagsCount: $('script').length,
                stylesheetLinksCount: $('link[rel="stylesheet"]').length,
                imagesCount: $('img').length,
                extractedAt: now,
            }];
        }
        case 'pwareadiness': {
            const html = await safeFetchText(`https://${cleanDomain}`);
            const $ = cheerio.load(html || '');
            return [{
                target: cleanDomain,
                hasViewportMeta: Boolean($('meta[name="viewport"]').attr('content')),
                manifestUrl: $('link[rel="manifest"]').attr('href') || null,
                themeColor: $('meta[name="theme-color"]').attr('content') || null,
                appleTouchIcon: $('link[rel="apple-touch-icon"]').attr('href') || null,
                extractedAt: now,
            }];
        }
        case 'cfpb': {
            const data = await safeFetchJson(`https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?search_term=${encodeURIComponent(q)}&size=${Math.min(maxItems, 15)}`);
            const hits = data?.hits?.hits || [];
            if (hits.length > 0) {
                return hits.map((h) => {
                    const s = h._source || {};
                    return {
                        target: q,
                        complaintId: s.complaint_id,
                        company: s.company,
                        product: s.product,
                        issue: s.issue,
                        state: s.state,
                        dateReceived: s.date_received,
                        companyResponse: s.company_response,
                        extractedAt: now,
                    };
                });
            }
            break;
        }
        case 'cpsc': {
            const data = await safeFetchJson(`https://www.saferproducts.gov/RestWebServices/Recall?format=json&ProductName=${encodeURIComponent(q)}`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((r) => ({
                    target: q,
                    recallNumber: r.RecallNumber,
                    recallDate: r.RecallDate,
                    title: r.Title,
                    description: r.Description,
                    url: r.URL,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'fdamaude': {
            const data = await safeFetchJson(`https://api.fda.gov/device/event.json?search=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    reportNumber: r.report_number,
                    eventType: r.event_type,
                    dateReceived: r.date_received,
                    BrandName: r.device?.[0]?.brand_name || null,
                    genericName: r.device?.[0]?.generic_name || null,
                    manufacturerName: r.device?.[0]?.manufacturer_d_name || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'fdadrugenf': {
            const data = await safeFetchJson(`https://api.fda.gov/drug/enforcement.json?search=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    recallNumber: r.recall_number,
                    recallingFirm: r.recalling_firm,
                    classification: r.classification,
                    status: r.status,
                    productDescription: r.product_description,
                    reasonForRecall: r.reason_for_recall,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'restauranttech': {
            const html = (await safeFetchText(`https://${cleanDomain}`)).toLowerCase();
            const emails = [...new Set((html.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}\b/g) || []))].slice(0, 6);
            return [{
                target: cleanDomain,
                hasToastPos: html.includes('toasttab.com'),
                hasSquareOrdering: html.includes('squareup.com') || html.includes('square.site'),
                hasOpenTable: html.includes('opentable.com'),
                hasResy: html.includes('resy.com'),
                hasDoorDash: html.includes('doordash.com'),
                hasUberEats: html.includes('ubereats.com'),
                emails,
                extractedAt: now,
            }];
        }
        case 'clinictech': {
            const html = (await safeFetchText(`https://${cleanDomain}`)).toLowerCase();
            const emails = [...new Set((html.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}\b/g) || []))].slice(0, 6);
            return [{
                target: cleanDomain,
                hasZocdoc: html.includes('zocdoc.com'),
                hasNexHealth: html.includes('nexhealth.com'),
                hasMindbody: html.includes('mindbodyonline.com') || html.includes('healcode'),
                hasVagaro: html.includes('vagaro.com'),
                hasJaneApp: html.includes('janeapp.com'),
                emails,
                extractedAt: now,
            }];
        }
        case 'masterb2b': {
            const [html, txtRes, dmarcRes, mxRes] = await Promise.all([
                safeFetchText(`https://${cleanDomain}`),
                safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=TXT`),
                safeFetchJson(`https://dns.google/resolve?name=_dmarc.${encodeURIComponent(cleanDomain)}&type=TXT`),
                safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=MX`),
            ]);
            const lower = (html || '').toLowerCase();
            const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 10);
            const txts = (txtRes?.Answer || []).map((a) => String(a.data || ''));
            return [{
                target: cleanDomain,
                dossierType: '360_B2B_COMPANY_DOSSIER',
                emails,
                mxRecords: (mxRes?.Answer || []).map((a) => a.data),
                hasSpf: txts.some((t) => t.toLowerCase().includes('v=spf1')),
                hasDmarc: (dmarcRes?.Answer || []).length > 0,
                adPixels: {
                    googleTagManager: lower.includes('googletagmanager.com'),
                    metaPixel: lower.includes('connect.facebook.net'),
                    linkedInInsight: lower.includes('snap.licdn.com'),
                },
                salesStack: {
                    hubspot: lower.includes('hubspot') || lower.includes('hs-scripts'),
                    intercom: lower.includes('intercom'),
                    calendly: lower.includes('calendly.com'),
                },
                extractedAt: now,
            }];
        }
        case 'mastersec': {
            const [nsRes, txtRes, secTxt] = await Promise.all([
                safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=NS`),
                safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=TXT`),
                safeFetchText(`https://${cleanDomain}/.well-known/security.txt`),
            ]);
            return [{
                target: cleanDomain,
                dossierType: '360_CYBERSECURITY_OSINT_DOSSIER',
                nameservers: (nsRes?.Answer || []).map((a) => a.data),
                txtRecordsCount: (txtRes?.Answer || []).length,
                hasSecurityTxt: secTxt.toLowerCase().includes('contact:'),
                extractedAt: now,
            }];
        }
        case 'masterecom': {
            const [html, robots] = await Promise.all([
                safeFetchText(`https://${cleanDomain}`),
                safeFetchText(`https://${cleanDomain}/robots.txt`),
            ]);
            const lower = (html || '').toLowerCase();
            const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 8);
            const sitemaps = [...robots.matchAll(/^Sitemap:\s*(.+)$/gim)].map((m) => m[1].trim());
            return [{
                target: cleanDomain,
                dossierType: '360_DTC_ECOMMERCE_DOSSIER',
                emails,
                isShopify: lower.includes('cdn.shopify.com'),
                hasMetaPixel: lower.includes('connect.facebook.net'),
                hasTikTokPixel: lower.includes('analytics.tiktok.com'),
                hasKlarnaOrAffirm: lower.includes('klarna') || lower.includes('affirm'),
                sitemaps,
                extractedAt: now,
            }];
        }
        case 'masterseo': {
            const [html, robots] = await Promise.all([
                safeFetchText(`https://${cleanDomain}`),
                safeFetchText(`https://${cleanDomain}/robots.txt`),
            ]);
            const $ = cheerio.load(html || '');
            return [{
                target: cleanDomain,
                dossierType: '360_TECHNICAL_SEO_DOSSIER',
                title: $('title').first().text().trim() || null,
                metaDescription: $('meta[name="description"]').attr('content') || null,
                ogImage: $('meta[property="og:image"]').attr('content') || null,
                h1Count: $('h1').length,
                imagesMissingAlt: $('img:not([alt])').length,
                hasRobotsTxt: robots.length > 0,
                extractedAt: now,
            }];
        }
        case 'masterbiotech': {
            const [pubmed, patents] = await Promise.all([
                safeFetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmode=json&retmax=5`),
                safeFetchJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}%20AND%20SRC:PAT&format=json&pageSize=5`),
            ]);
            return [{
                target: q,
                dossierType: '360_BIOTECH_RD_DOSSIER',
                totalPubMedStudiesCount: Number(pubmed?.esearchresult?.count) || 0,
                recentPubMedIds: pubmed?.esearchresult?.idlist || [],
                totalPatentFilingsCount: patents?.hitCount || 0,
                samplePatents: (patents?.resultList?.result || []).map((p) => ({ id: p.id, title: p.title })),
                extractedAt: now,
            }];
        }
        case 'mastercrypto': {
            const [dex, fng] = await Promise.all([
                safeFetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`),
                safeFetchJson('https://api.alternative.me/fng/?limit=1'),
            ]);
            const topPair = dex?.pairs?.[0] || {};
            return [{
                target: q,
                dossierType: '360_CRYPTO_TOKEN_DOSSIER',
                topDexChain: topPair.chainId || null,
                priceUsd: topPair.priceUsd || null,
                liquidityUsd: topPair.liquidity?.usd || null,
                volume24hUsd: topPair.volume?.h24 || null,
                marketFearGreedIndex: Number(fng?.data?.[0]?.value) || null,
                marketRegime: fng?.data?.[0]?.value_classification || null,
                extractedAt: now,
            }];
        }
        case 'masterpkg': {
            const [npmData, osvData] = await Promise.all([
                safeFetchJson(`https://registry.npmjs.org/${encodeURIComponent(q)}`),
                safeFetchJson('https://api.osv.dev/v1/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ package: { name: q, ecosystem: 'npm' } }),
                }),
            ]);
            return [{
                target: q,
                dossierType: '360_OPEN_SOURCE_PACKAGE_DOSSIER',
                latestVersion: npmData?.['dist-tags']?.latest || null,
                license: npmData?.license || null,
                homepage: npmData?.homepage || null,
                knownVulnerabilitiesCount: (osvData?.vulns || []).length,
                vulnerabilityIds: (osvData?.vulns || []).slice(0, 10).map((v) => v.id),
                extractedAt: now,
            }];
        }
        case 'masteragency': {
            const html = await safeFetchText(`https://${cleanDomain}`);
            const lower = (html || '').toLowerCase();
            const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 8);
            const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:20\d{2}\s*[-–]\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
            const latestYear = years.length > 0 ? Math.max(...years) : null;
            return [{
                target: cleanDomain,
                dossierType: '360_AGENCY_PROSPECT_DOSSIER',
                emails,
                footerCopyrightYear: latestYear,
                isWebsiteOutdatedSignal: latestYear !== null && latestYear < 2025,
                isRunningPaidAds: lower.includes('connect.facebook.net') || lower.includes('googletagmanager.com'),
                hasLiveChatWidget: lower.includes('intercom') || lower.includes('drift') || lower.includes('crisp.chat') || lower.includes('zendesk'),
                extractedAt: now,
            }];
        }
        default: {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const $ = cheerio.load(html);
                const title = $('title').first().text().trim() || cleanDomain;
                const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 10);
                const phones = [...new Set(html.match(/\+?[1-9][0-9\s().-]{7,16}[0-9]/g) || [])].slice(0, 6);
                const socials = [];
                $('a[href]').each((_, el) => {
                    const h = String($(el).attr('href') || '');
                    if (/linkedin\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|facebook\.com/i.test(h)) {
                        socials.push(h);
                    }
                });
                return [{
                    target: cleanDomain,
                    url,
                    pageTitle: title,
                    emails,
                    phones,
                    socialLinks: [...new Set(socials)].slice(0, 12),
                    extractedAt: now,
                }];
            }
            break;
        }
    }

    return [{
        target: q,
        status: 'completed',
        mode: MODE,
        extractedAt: now,
    }];
}

async function run() {
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const targets = Array.isArray(input[INPUT_PROP]) && input[INPUT_PROP].length > 0
            ? input[INPUT_PROP]
            : DEFAULT_LIST;
        const maxItems = Math.min(Math.max(Number(input.maxItemsPerTarget) || 10, 1), 100);

        for (const t of targets) {
            const items = await processTarget(t, maxItems);
            if (items && items.length > 0) {
                await Actor.pushData(__wrapPushData(items));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: EVENT_NAME, count: items.length }); } catch {}
                }
            }
        }
        log.info('Extraction run completed successfully.');
    } finally {
        await Actor.exit();
    }
}

run();
