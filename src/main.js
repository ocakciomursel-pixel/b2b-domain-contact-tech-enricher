import { Actor } from 'apify';
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

async function fetchPage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': BROWSER_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (!res.ok) return null;
        return { url: res.url || url, html: await res.text() };
    } catch {
        return null;
    }
}

async function analyzeSaasPricing(rawDomain) {
    const clean = String(rawDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
    if (!clean) return null;

    const candidates = [`https://${clean}/pricing`, `https://www.${clean}/pricing`, `https://${clean}/plans`, `https://${clean}`];
    let found = null;
    for (const c of candidates) {
        const res = await fetchPage(c);
        if (res && res.html && res.html.length > 500) {
            found = res;
            break;
        }
    }
    if (!found) {
        return { domain: clean, reachable: false, analyzedAt: new Date().toISOString() };
    }

    const $ = cheerio.load(found.html);
    $('script, style, noscript, svg').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const priceMatches = [...new Set((text.match(/[\$€£]\s?\d+(?:,\d{3})*(?:\.\d{1,2})?/g) || []).map((p) => p.replace(/\s+/g, '')))].slice(0, 20);
    const billingSignals = [];
    if (/per\s+(?:user|seat|member)/i.test(text)) billingSignals.push('per-seat');
    if (/pay[-\s]as[-\s]you[-\s]go|usage[-\s]based|per\s+1,?000|credits/i.test(text)) billingSignals.push('usage-based');
    if (/billed\s+annually|annual\s+billing|save\s+\d+%/i.test(text)) billingSignals.push('annual-discount');

    const headings = [];
    $('h1, h2, h3').each((_, el) => {
        const h = $(el).text().replace(/\s+/g, ' ').trim();
        if (h && h.length < 80) headings.push(h);
    });

    return {
        domain: clean,
        pricingUrl: found.url,
        reachable: true,
        pageTitle: $('title').first().text().trim() || null,
        hasFreeTier: /\bfree\s+(?:plan|tier|forever)\b|\$0\b/i.test(text),
        hasFreeTrial: /\bfree\s+trial\b|\bstart\s+trial\b|\b14[-\s]day\s+trial\b/i.test(text),
        hasEnterpriseTier: /\benterprise\b|\bcustom\s+pricing\b|\bcontact\s+sales\b/i.test(text),
        billingSignals,
        detectedPrices: priceMatches,
        planHeadings: headings.slice(0, 15),
        analyzedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const item = await analyzeSaasPricing('supabase.com');
        console.log(JSON.stringify(item, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const domains = Array.isArray(input.domains) && input.domains.length ? input.domains : ['supabase.com'];
        for (const d of domains) {
            const report = await analyzeSaasPricing(d);
            if (report) {
                await Actor.pushData(__wrapPushData(report));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'pricing-page-extracted', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
