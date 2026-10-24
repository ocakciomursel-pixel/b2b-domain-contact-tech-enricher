import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

async function fetchHtml(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AI-Markdown-RAG-Bot/1.0; +https://apify.com)',
                'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
        });
        const html = await res.text();
        return { ok: res.ok, status: res.status, html, finalUrl: res.url || url };
    } catch (err) {
        return { ok: false, status: 0, html: '', finalUrl: url, error: err.message };
    } finally {
        clearTimeout(timer);
    }
}

function htmlToCleanMarkdown($) {
    $('script, style, noscript, iframe, svg, nav, footer, header, aside, form, [role="navigation"], [aria-hidden="true"]').remove();

    const root = $('main, article, [role="main"], .content, .markdown-body, body').first();
    const lines = [];

    root.find('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, tr').each((_, el) => {
        const tag = (el.tagName || '').toLowerCase();
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text) return;

        if (tag.startsWith('h')) {
            const level = Number(tag.slice(1)) || 2;
            lines.push(`\n${'#'.repeat(level)} ${text}\n`);
        } else if (tag === 'li') {
            lines.push(`- ${text}`);
        } else if (tag === 'pre') {
            const codeText = $(el).text().trim();
            lines.push(`\n\`\`\`\n${codeText}\n\`\`\`\n`);
        } else if (tag === 'blockquote') {
            lines.push(`> ${text}`);
        } else if (tag === 'tr') {
            const cells = [];
            $(el).find('th, td').each((__, cell) => {
                cells.push($(cell).text().replace(/\s+/g, ' ').trim());
            });
            if (cells.length > 0) {
                lines.push(`| ${cells.join(' | ')} |`);
            }
        } else {
            lines.push(text);
        }
    });

    const joined = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (joined.length > 80) return joined;
    return root.text().replace(/\s+/g, ' ').trim();
}

function splitIntoChunks(markdown, chunkSize = 1200, overlap = 150) {
    const chunks = [];
    if (!markdown) return chunks;
    const step = Math.max(100, chunkSize - overlap);
    let idx = 0;
    let chunkIndex = 0;
    while (idx < markdown.length) {
        const slice = markdown.slice(idx, idx + chunkSize).trim();
        if (slice) {
            chunks.push({
                chunkIndex,
                text: slice,
                charLength: slice.length,
                estimatedTokens: Math.ceil(slice.length / 4),
            });
            chunkIndex += 1;
        }
        if (idx + chunkSize >= markdown.length) break;
        idx += step;
    }
    return chunks;
}

async function processSinglePage(url, chunkSizeChars, chunkOverlapChars) {
    const res = await fetchHtml(url);
    if (!res.ok || !res.html) {
        return {
            url,
            reachable: false,
            statusCode: res.status,
            error: res.error || `HTTP ${res.status}`,
            scrapedAt: new Date().toISOString(),
        };
    }

    const $ = cheerio.load(res.html);
    const title = $('title').first().text().trim() || $('h1').first().text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim()
        || $('meta[property="og:description"]').attr('content')?.trim()
        || null;

    const jsonLd = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            jsonLd.push(JSON.parse($(el).html() || '{}'));
        } catch {
            // ignore malformed JSON-LD
        }
    });

    const internalLinks = new Set();
    const baseHost = new URL(res.finalUrl).hostname;
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
            const abs = new URL(href, res.finalUrl);
            if (abs.hostname === baseHost && /^https?:$/i.test(abs.protocol)) {
                abs.hash = '';
                internalLinks.add(abs.toString());
            }
        } catch {
            // ignore invalid URL
        }
    });

    const markdown = htmlToCleanMarkdown($);
    const words = markdown ? markdown.split(/\s+/).filter(Boolean).length : 0;
    const estimatedTokens = Math.ceil(markdown.length / 4);
    const chunks = splitIntoChunks(markdown, chunkSizeChars, chunkOverlapChars);

    return {
        url: res.finalUrl,
        reachable: true,
        statusCode: res.status,
        title,
        description,
        wordCount: words,
        charCount: markdown.length,
        estimatedTokens,
        chunksCount: chunks.length,
        markdown,
        chunks,
        jsonLd: jsonLd.slice(0, 5),
        internalLinks: [...internalLinks].slice(0, 30),
        scrapedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const demoUrl = process.argv[process.argv.indexOf('--demo') + 1] || 'https://example.com';
        console.log(`Running demo Markdown RAG extraction on ${demoUrl}...`);
        const out = await processSinglePage(demoUrl, 800, 100);
        console.log(JSON.stringify(out, null, 2));
        return;
    }

    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const startUrls = Array.isArray(input.urls) && input.urls.length > 0
            ? input.urls
            : ['https://example.com'];
        const crawlSubpages = Boolean(input.crawlSubpages);
        const maxPagesPerStartUrl = Math.min(Math.max(Number(input.maxPagesPerStartUrl) || 5, 1), 100);
        const chunkSizeChars = Math.min(Math.max(Number(input.chunkSizeChars) || 1200, 200), 8000);
        const chunkOverlapChars = Math.min(Math.max(Number(input.chunkOverlapChars) || 150, 0), 1000);

        for (const startUrl of startUrls) {
            const visited = new Set();
            const queue = [startUrl];

            while (queue.length > 0 && visited.size < (crawlSubpages ? maxPagesPerStartUrl : 1)) {
                const current = queue.shift();
                if (!current || visited.has(current)) continue;
                visited.add(current);

                const result = await processSinglePage(current, chunkSizeChars, chunkOverlapChars);
                await Actor.pushData(result);

                if (typeof Actor.charge === 'function') {
                    try {
                        await Actor.charge({ eventName: 'page-converted', count: 1 });
                    } catch {
                        // Ignore when PPE is not configured
                    }
                }

                if (crawlSubpages && Array.isArray(result.internalLinks)) {
                    for (const link of result.internalLinks) {
                        if (!visited.has(link) && queue.length + visited.size < maxPagesPerStartUrl * 2) {
                            queue.push(link);
                        }
                    }
                }
            }
        }

        log.info('Markdown & RAG chunk extraction complete.');
    } finally {
        await Actor.exit();
    }
}

run();
