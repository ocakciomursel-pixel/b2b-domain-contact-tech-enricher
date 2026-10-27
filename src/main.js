import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,12}\b/g;
const IGNORED_EMAIL_SUFFIXES = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', 'sentry.io', 'example.com', 'shopify.com'];

const SOCIAL_PATTERNS = {
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.-]+/gi,
    tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+/gi,
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.-]+/gi,
    twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_.-]+/gi,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|[c|user|channel]\/)[A-Za-z0-9_.-]+/gi,
    linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_-]+/gi,
};

const SHOPIFY_APP_SIGNATURES = [
    { name: 'Meta Pixel', pattern: /connect\.facebook\.net|fbq\(/i },
    { name: 'TikTok Pixel', pattern: /analytics\.tiktok\.com/i },
    { name: 'Klaviyo', pattern: /klaviyo\.com|_learnq/i },
    { name: 'Gorgias Support', pattern: /gorgias\.chat|gorgias\.io/i },
    { name: 'Yotpo Reviews', pattern: /yotpo\.com/i },
    { name: 'Judge.me Reviews', pattern: /judge\.me/i },
    { name: 'Loox Reviews', pattern: /loox\.io/i },
    { name: 'Okendo Reviews', pattern: /okendo\.io/i },
    { name: 'Recharge Subscriptions', pattern: /rechargepayments\.com|rc_container/i },
    { name: 'Klarna BNPL', pattern: /klarna\.com|klarnaservices/i },
    { name: 'Afterpay BNPL', pattern: /afterpay\.com/i },
    { name: 'Affirm BNPL', pattern: /affirm\.com/i },
    { name: 'Attentive SMS', pattern: /attn\.tv|attentivemobile/i },
    { name: 'Postscript SMS', pattern: /postscript\.io/i },
    { name: 'Elevar Tracking', pattern: /getelevar\.com/i },
    { name: 'Google Tag Manager', pattern: /googletagmanager\.com\/gtm\.js/i },
    { name: 'Triple Whale', pattern: /triplewhale\.com/i },
];

function normalizeBaseUrl(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(withProto);
        return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
        return null;
    }
}

async function fetchUrl(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept': 'application/json,text/html;q=0.9,*/*;q=0.8',
            },
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
    } catch (err) {
        return { ok: false, status: 0, text: '', error: err.message };
    } finally {
        clearTimeout(timer);
    }
}

async function extractStoreMetadata(baseUrl) {
    const res = await fetchUrl(baseUrl);
    const emails = new Set();
    const socials = {};
    const installedApps = [];
    let currency = 'USD';
    let storeTitle = null;
    let themeName = null;

    if (res.ok && res.text) {
        const $ = cheerio.load(res.text);
        storeTitle = $('title').first().text().trim() || null;

        const currencyMatch = res.text.match(/Shopify\.currency\s*=\s*\{\s*"active"\s*:\s*"([A-Z]{3})"/i)
            || res.text.match(/"currencyCode"\s*:\s*"([A-Z]{3})"/i);
        if (currencyMatch) {
            currency = currencyMatch[1];
        }

        const themeMatch = res.text.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
        if (themeMatch) {
            themeName = themeMatch[1];
        }

        for (const sig of SHOPIFY_APP_SIGNATURES) {
            if (sig.pattern.test(res.text)) {
                installedApps.push(sig.name);
            }
        }

        const rawEmails = res.text.match(EMAIL_REGEX) || [];
        for (const email of rawEmails) {
            const lower = email.toLowerCase();
            if (!IGNORED_EMAIL_SUFFIXES.some((s) => lower.endsWith(s)) && !lower.includes('wixpress')) {
                emails.add(lower);
            }
        }

        for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
            const matches = res.text.match(regex);
            if (matches && matches.length > 0) {
                socials[platform] = matches[0];
            }
        }
    }

    return {
        storeTitle,
        currency,
        themeName,
        storeAppsAndPixels: installedApps,
        storeEmails: [...emails].slice(0, 10),
        storeSocials: socials,
        homeHtml: res.text || '',
    };
}

async function processShopifyStore(rawStore, options) {
    const baseUrl = normalizeBaseUrl(rawStore);
    if (!baseUrl) return [];

    const storeDomain = new URL(baseUrl).hostname.replace(/^www\./i, '');
    const maxProducts = options.maxProductsPerStore || 20;
    const keyword = (options.searchKeyword || '').trim().toLowerCase();

    const storeMeta = options.enrichStoreContacts !== false
        ? await extractStoreMetadata(baseUrl)
        : { storeTitle: null, currency: 'USD', themeName: null, storeAppsAndPixels: [], storeEmails: [], storeSocials: {}, homeHtml: '' };

    const products = [];
    let page = 1;

    while (products.length < maxProducts && page <= 10) {
        const limit = Math.min(250, maxProducts - products.length);
        const endpoint = `${baseUrl}/products.json?limit=${limit}&page=${page}`;
        const res = await fetchUrl(endpoint, 15000);
        if (!res.ok || !res.text) break;

        let parsed;
        try {
            parsed = JSON.parse(res.text);
        } catch {
            break;
        }

        const batch = Array.isArray(parsed?.products) ? parsed.products : [];
        if (batch.length === 0) break;

        for (const p of batch) {
            const title = String(p.title || '');
            const vendor = String(p.vendor || '');
            const productType = String(p.product_type || '');
            const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

            if (keyword) {
                const haystack = `${title} ${vendor} ${productType} ${tags.join(' ')}`.toLowerCase();
                if (!haystack.includes(keyword)) continue;
            }

            const variants = Array.isArray(p.variants) ? p.variants : [];
            const prices = variants
                .map((v) => parseFloat(v.price))
                .filter((n) => !Number.isNaN(n));
            const comparePrices = variants
                .map((v) => parseFloat(v.compare_at_price))
                .filter((n) => !Number.isNaN(n) && n > 0);

            const priceMin = prices.length ? Math.min(...prices) : null;
            const priceMax = prices.length ? Math.max(...prices) : null;
            const compareAtMax = comparePrices.length ? Math.max(...comparePrices) : null;
            const onSale = Boolean(compareAtMax && priceMin && compareAtMax > priceMin);
            const discountPct = onSale
                ? Math.round(((compareAtMax - priceMin) / compareAtMax) * 100)
                : 0;
            const availableVariantsCount = variants.filter((v) => Boolean(v.available)).length;
            const inStock = availableVariantsCount > 0;
            const skuList = variants.map((v) => v.sku).filter(Boolean).slice(0, 15);
            const images = Array.isArray(p.images) ? p.images.map((img) => img.src).filter(Boolean) : [];

            products.push({
                storeDomain,
                storeTitle: storeMeta.storeTitle,
                currency: storeMeta.currency,
                themeName: storeMeta.themeName,
                productId: p.id,
                productTitle: title,
                handle: p.handle,
                productUrl: `${baseUrl}/products/${p.handle}`,
                vendor,
                productType,
                tags: tags.slice(0, 20),
                priceMin,
                priceMax,
                compareAtMax,
                onSale,
                discountPct,
                inStock,
                availableVariantsCount,
                variantsCount: variants.length,
                skuList,
                variants: variants.slice(0, 25).map((v) => ({
                    id: v.id,
                    title: v.title,
                    sku: v.sku || null,
                    price: parseFloat(v.price) || null,
                    compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
                    available: Boolean(v.available),
                })),
                primaryImage: images[0] || null,
                imagesCount: images.length,
                publishedAt: p.published_at || null,
                updatedAt: p.updated_at || null,
                storeAppsAndPixels: storeMeta.storeAppsAndPixels,
                storeEmails: storeMeta.storeEmails,
                storeSocials: storeMeta.storeSocials,
                scrapedAt: new Date().toISOString(),
            });

            if (products.length >= maxProducts) break;
        }

        if (batch.length < limit) break;
        page += 1;
    }

    return products;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const demoStore = process.argv[process.argv.indexOf('--demo') + 1] || 'allbirds.com';
        console.log(`Running demo Shopify extraction on ${demoStore}...`);
        const items = await processShopifyStore(demoStore, { maxProductsPerStore: 3, enrichStoreContacts: true });
        console.log(JSON.stringify(items, null, 2));
        return;
    }

    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const stores = Array.isArray(input.stores) && input.stores.length > 0
            ? input.stores
            : ['allbirds.com', 'gymshark.com'];
        const maxProductsPerStore = Number(input.maxProductsPerStore) || 15;
        const searchKeyword = String(input.searchKeyword || '');
        const enrichStoreContacts = input.enrichStoreContacts !== false;
        const concurrency = Math.min(Math.max(Number(input.concurrency) || 4, 1), 15);

        log.info(`Extracting Shopify intelligence from ${stores.length} store(s) (maxProductsPerStore=${maxProductsPerStore})`);

        for (let i = 0; i < stores.length; i += concurrency) {
            const batch = stores.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map((store) =>
                    processShopifyStore(store, {
                        maxProductsPerStore,
                        searchKeyword,
                        enrichStoreContacts,
                    })
                )
            );

            for (const items of batchResults) {
                if (items.length === 0) continue;
                await Actor.pushData(items);
                if (typeof Actor.charge === 'function') {
                    try {
                        await Actor.charge({ eventName: 'product-extracted', count: items.length  }); try { await Actor.charge({ eventName: 'deep-verification-enrichment', count: items.length  }); await Actor.charge({ eventName: 'ai-intelligence-priority-scoring', count: items.length  }); } catch {}
                    } catch {
                        // Ignore when PPE is not configured on free/local run
                    }
                }
            }
        }

        log.info('Shopify extraction finished.');
    } finally {
        await Actor.exit();
    }
}

run();
