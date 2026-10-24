import { Actor } from 'apify';
import * as cheerio from 'cheerio';

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,12}\b/g;

async function extractBusinessSchema(rawUrl) {
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let html = '';
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
        });
        html = await res.text();
    } catch {
        return null;
    }

    const $ = cheerio.load(html);
    const domain = new URL(url).hostname.replace(/^www\./i, '');
    const emails = [...new Set((html.match(EMAIL_REGEX) || []).map((e) => e.toLowerCase()).filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg')))].slice(0, 10);

    let businessName = $('meta[property="og:site_name"]').attr('content') || $('title').first().text().trim() || domain;
    let businessType = 'Organization';
    let telephone = null;
    let streetAddress = null;
    let addressLocality = null;
    let addressCountry = null;
    let latitude = null;
    let longitude = null;
    let aggregateRating = null;
    let priceRange = null;

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).html() || '{}');
            const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
            for (const n of nodes) {
                if (!n || typeof n !== 'object') continue;
                if (n['@type']) businessType = Array.isArray(n['@type']) ? n['@type'][0] : n['@type'];
                if (n.name && !businessName) businessName = n.name;
                if (n.telephone && !telephone) telephone = n.telephone;
                if (n.priceRange && !priceRange) priceRange = n.priceRange;
                if (n.address && typeof n.address === 'object') {
                    streetAddress = n.address.streetAddress || streetAddress;
                    addressLocality = n.address.addressLocality || addressLocality;
                    addressCountry = n.address.addressCountry || addressCountry;
                }
                if (n.geo && typeof n.geo === 'object') {
                    latitude = n.geo.latitude || latitude;
                    longitude = n.geo.longitude || longitude;
                }
                if (n.aggregateRating?.ratingValue) {
                    aggregateRating = Number(n.aggregateRating.ratingValue);
                }
            }
        } catch {}
    });

    if (!telephone) {
        const telHref = $('a[href^="tel:"]').first().attr('href');
        if (telHref) telephone = telHref.replace(/^tel:/i, '').trim();
    }

    return {
        domain,
        url,
        businessName,
        businessType,
        telephone,
        emails,
        streetAddress,
        addressLocality,
        addressCountry,
        latitude,
        longitude,
        priceRange,
        aggregateRating,
        enrichedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const item = await extractBusinessSchema('https://news.ycombinator.com');
        console.log(JSON.stringify(item, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const urls = Array.isArray(input.urls) && input.urls.length ? input.urls : ['https://www.marriott.com'];
        for (const u of urls) {
            const item = await extractBusinessSchema(u);
            if (item) {
                await Actor.pushData(item);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'business-enriched', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
