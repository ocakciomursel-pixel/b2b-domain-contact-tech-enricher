import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

async function fetchTimed(url, timeoutMs = 15000, method = 'GET') {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method,
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Technical-SEO-Auditor/1.0; +https://apify.com)',
                'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
        });
        const text = method === 'GET' ? await res.text() : '';
        return {
            ok: res.ok,
            status: res.status,
            responseTimeMs: Date.now() - start,
            finalUrl: res.url || url,
            text,
        };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            responseTimeMs: Date.now() - start,
            finalUrl: url,
            text: '',
            error: err.message,
        };
    } finally {
        clearTimeout(timer);
    }
}

async function auditUrl(rawUrl, options) {
    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const res = await fetchTimed(normalized, 15000, 'GET');

    if (!res.ok || !res.text) {
        return {
            url: normalized,
            reachable: false,
            seoScore: 0,
            statusCode: res.status,
            responseTimeMs: res.responseTimeMs,
            issues: [`CRITICAL: Page unreachable or returned HTTP ${res.status}`],
            auditedAt: new Date().toISOString(),
        };
    }

    const $ = cheerio.load(res.text);
    const issues = [];
    let score = 100;

    const title = $('title').first().text().trim();
    const titleLength = title.length;
    if (!title) {
        issues.push('HIGH: Missing <title> tag');
        score -= 18;
    } else if (titleLength < 25 || titleLength > 65) {
        issues.push(`MEDIUM: Title length (${titleLength} chars) outside optimal 25-65 char range`);
        score -= 6;
    }

    const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
    const metaDescriptionLength = metaDescription.length;
    if (!metaDescription) {
        issues.push('HIGH: Missing meta description');
        score -= 15;
    } else if (metaDescriptionLength < 70 || metaDescriptionLength > 165) {
        issues.push(`LOW: Meta description length (${metaDescriptionLength} chars) outside optimal 70-165 char range`);
        score -= 4;
    }

    const canonical = ($('link[rel="canonical"]').attr('href') || '').trim() || null;
    if (!canonical) {
        issues.push('MEDIUM: Missing canonical link tag');
        score -= 8;
    }

    const robotsMeta = ($('meta[name="robots"]').attr('content') || '').trim() || null;
    if (robotsMeta && /noindex/i.test(robotsMeta)) {
        issues.push('CRITICAL: Page has noindex directive in meta robots');
        score -= 25;
    }

    const viewport = ($('meta[name="viewport"]').attr('content') || '').trim() || null;
    if (!viewport) {
        issues.push('MEDIUM: Missing mobile viewport meta tag');
        score -= 8;
    }

    const h1s = [];
    $('h1').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t) h1s.push(t);
    });
    if (h1s.length === 0) {
        issues.push('HIGH: Missing H1 heading on page');
        score -= 12;
    } else if (h1s.length > 1) {
        issues.push(`LOW: Multiple H1 headings detected (${h1s.length})`);
        score -= 4;
    }

    let totalImages = 0;
    let imagesMissingAlt = 0;
    $('img').each((_, el) => {
        totalImages += 1;
        const alt = $(el).attr('alt');
        if (alt === undefined || alt.trim() === '') {
            imagesMissingAlt += 1;
        }
    });
    if (imagesMissingAlt > 0) {
        issues.push(`LOW: ${imagesMissingAlt} of ${totalImages} images are missing descriptive alt text`);
        score -= Math.min(10, imagesMissingAlt * 2);
    }

    const ogTitle = $('meta[property="og:title"]').attr('content') || null;
    const ogImage = $('meta[property="og:image"]').attr('content') || null;
    if (!ogTitle || !ogImage) {
        issues.push('LOW: Incomplete OpenGraph tags (og:title or og:image missing)');
        score -= 4;
    }

    const schemaTypes = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).html() || '{}');
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                if (item['@type']) schemaTypes.push(item['@type']);
            }
        } catch {
            issues.push('MEDIUM: Malformed JSON-LD Schema.org block detected');
            score -= 6;
        }
    });
    if (schemaTypes.length === 0) {
        issues.push('LOW: No Schema.org JSON-LD structured data detected');
        score -= 5;
    }

    const links = new Set();
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
        try {
            const abs = new URL(href, res.finalUrl).toString();
            if (/^https?:\/\//i.test(abs)) links.add(abs);
        } catch {
            // ignore
        }
    });

    const brokenLinks = [];
    if (options.checkBrokenLinks !== false && options.maxLinksToVerify > 0) {
        const sample = [...links].slice(0, options.maxLinksToVerify);
        const checks = await Promise.all(
            sample.map(async (linkUrl) => {
                const r = await fetchTimed(linkUrl, 8000, 'GET');
                return { linkUrl, status: r.status, ok: r.ok };
            })
        );
        for (const c of checks) {
            if (c.status >= 400 || c.status === 0) {
                brokenLinks.push({ url: c.linkUrl, statusCode: c.status });
            }
        }
        if (brokenLinks.length > 0) {
            issues.push(`HIGH: Detected ${brokenLinks.length} broken/unreachable link(s) on page`);
            score -= Math.min(20, brokenLinks.length * 7);
        }
    }

    if (res.responseTimeMs > 2500) {
        issues.push(`MEDIUM: Slow HTML response time (${res.responseTimeMs} ms)`);
        score -= 6;
    }

    return {
        url: res.finalUrl,
        reachable: true,
        seoScore: Math.max(0, score),
        statusCode: res.status,
        responseTimeMs: res.responseTimeMs,
        title,
        titleLength,
        metaDescription,
        metaDescriptionLength,
        canonical,
        robotsMeta,
        h1Count: h1s.length,
        h1Texts: h1s.slice(0, 5),
        totalImages,
        imagesMissingAlt,
        schemaTypes,
        totalLinksFound: links.size,
        brokenLinksCount: brokenLinks.length,
        brokenLinks,
        issues,
        auditedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const demoUrl = process.argv[process.argv.indexOf('--demo') + 1] || 'https://news.ycombinator.com';
        console.log(`Running demo Technical SEO Audit on ${demoUrl}...`);
        const report = await auditUrl(demoUrl, { checkBrokenLinks: true, maxLinksToVerify: 5 });
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const urls = Array.isArray(input.urls) && input.urls.length > 0
            ? input.urls
            : ['https://apify.com'];
        const checkBrokenLinks = input.checkBrokenLinks !== false;
        const maxLinksToVerify = Math.min(Math.max(Number(input.maxLinksToVerify) || 15, 0), 100);

        for (const url of urls) {
            const report = await auditUrl(url, { checkBrokenLinks, maxLinksToVerify });
            await Actor.pushData(report);

            if (typeof Actor.charge === 'function') {
                try {
                    await Actor.charge({ eventName: 'page-audited', count: 1 });
                } catch {
                    // Ignore when PPE is not configured
                }
            }
        }

        log.info('Technical SEO Audit completed.');
    } finally {
        await Actor.exit();
    }
}

run();
