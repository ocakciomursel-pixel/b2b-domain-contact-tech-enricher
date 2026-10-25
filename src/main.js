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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
        });
        const text = method === 'GET' ? await res.text() : '';
        const headers = {};
        res.headers.forEach((v, k) => {
            headers[k.toLowerCase()] = v;
        });
        return {
            ok: res.ok,
            status: res.status,
            responseTimeMs: Date.now() - start,
            finalUrl: res.url || url,
            headers,
            text,
        };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            responseTimeMs: Date.now() - start,
            finalUrl: url,
            headers: {},
            text: '',
            error: err.message,
        };
    } finally {
        clearTimeout(timer);
    }
}

function computeGrade(score) {
    if (score >= 92) return 'A+';
    if (score >= 82) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    return 'D';
}

async function auditUrl(rawUrl, options) {
    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const parsedOrigin = new URL(normalized).origin;

    const [res, robotsRes, llmsRes] = await Promise.all([
        fetchTimed(normalized, 15000, 'GET'),
        fetchTimed(`${parsedOrigin}/robots.txt`, 6000, 'GET'),
        fetchTimed(`${parsedOrigin}/llms.txt`, 6000, 'GET'),
    ]);

    if (!res.ok || !res.text) {
        return {
            url: normalized,
            reachable: false,
            seoScore: 0,
            seoGrade: 'F',
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
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

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
    const twitterCard = $('meta[name="twitter:card"]').attr('content') || null;
    if (!ogTitle || !ogImage) {
        issues.push('LOW: Incomplete OpenGraph tags (og:title or og:image missing)');
        score -= 4;
    }

    const schemaTypes = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).html() || '{}');
            const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
            for (const item of items) {
                if (item && item['@type']) schemaTypes.push(item['@type']);
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

    const hasRobotsTxt = robotsRes.ok && robotsRes.text.length > 10;
    const hasLlmsTxt = llmsRes.ok && llmsRes.text.length > 20 && !/<html/i.test(llmsRes.text.slice(0, 100));
    if (!hasRobotsTxt) {
        issues.push('LOW: Missing or unreachable /robots.txt file');
        score -= 3;
    }

    const hasHsts = Boolean(res.headers['strict-transport-security']);
    const hasCsp = Boolean(res.headers['content-security-policy']);
    const hasXFrameOptions = Boolean(res.headers['x-frame-options']);
    if (!hasHsts) {
        issues.push('LOW: Missing Strict-Transport-Security (HSTS) security header');
        score -= 2;
    }

    const finalHost = new URL(res.finalUrl).hostname;
    const internalLinks = new Set();
    const externalLinks = new Set();

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
        try {
            const absObj = new URL(href, res.finalUrl);
            if (/^https?:$/i.test(absObj.protocol)) {
                if (absObj.hostname === finalHost) internalLinks.add(absObj.toString());
                else externalLinks.add(absObj.toString());
            }
        } catch {
            // ignore
        }
    });

    const allLinks = [...internalLinks, ...externalLinks];
    const brokenLinks = [];
    if (options.checkBrokenLinks !== false && options.maxLinksToVerify > 0) {
        const sample = allLinks.slice(0, options.maxLinksToVerify);
        const checks = await Promise.all(
            sample.map(async (linkUrl) => {
                const r = await fetchTimed(linkUrl, 7000, 'GET');
                return { linkUrl, status: r.status, ok: r.ok };
            })
        );
        for (const c of checks) {
            if ((c.status >= 400 && c.status !== 403 && c.status !== 429) || c.status === 0) {
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

    const finalScore = Math.max(0, score);
    const recommendedJsonLdSchema = schemaTypes.length === 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title || finalHost,
            description: metaDescription || undefined,
            url: res.finalUrl,
        }
        : null;

    return {
        url: res.finalUrl,
        reachable: true,
        seoScore: finalScore,
        seoGrade: computeGrade(finalScore),
        statusCode: res.status,
        responseTimeMs: res.responseTimeMs,
        title,
        titleLength,
        metaDescription,
        metaDescriptionLength,
        canonical,
        robotsMeta,
        hasRobotsTxt,
        hasLlmsTxt,
        hasHsts,
        hasCsp,
        hasXFrameOptions,
        twitterCard,
        h1Count: h1s.length,
        h2Count,
        h3Count,
        h1Texts: h1s.slice(0, 5),
        totalImages,
        imagesMissingAlt,
        schemaTypes,
        internalLinksCount: internalLinks.size,
        externalLinksCount: externalLinks.size,
        totalLinksFound: allLinks.length,
        brokenLinksCount: brokenLinks.length,
        brokenLinks,
        issues,
        recommendedJsonLdSchema,
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
            : [
                'https://apify.com',
                'https://news.ycombinator.com',
                'https://cloudflare.com',
            ];
        const checkBrokenLinks = input.checkBrokenLinks !== false;
        const maxLinksToVerify = Math.min(Math.max(Number(input.maxLinksToVerify) || 10, 0), 100);

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
