import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

async function fetchHtml(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
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

function htmlToCleanMarkdownAndStats($) {
    $('script, style, noscript, iframe, svg, nav, footer, header, aside, form, [role="navigation"], [aria-hidden="true"]').remove();

    const root = $('main, article, [role="main"], .content, .markdown-body, body').first();
    const lines = [];
    const headingsOutline = [];
    let codeBlocksCount = 0;
    let tablesCount = 0;

    root.find('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, table').each((_, el) => {
        const tag = (el.tagName || '').toLowerCase();

        if (tag === 'table') {
            const tableRows = [];
            $(el).find('tr').each((rIdx, tr) => {
                const cells = [];
                $(tr).find('th, td').each((__, cell) => {
                    cells.push($(cell).text().replace(/\s+/g, ' ').trim());
                });
                if (cells.length > 0) {
                    tableRows.push(`| ${cells.join(' | ')} |`);
                    if (rIdx === 0) {
                        tableRows.push(`| ${cells.map(() => '---').join(' | ')} |`);
                    }
                }
            });
            if (tableRows.length > 0) {
                tablesCount += 1;
                lines.push(`\n${tableRows.join('\n')}\n`);
            }
            return;
        }

        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text) return;

        if (tag.startsWith('h')) {
            const level = Number(tag.slice(1)) || 2;
            const prefix = '#'.repeat(level);
            lines.push(`\n${prefix} ${text}\n`);
            if (level <= 3 && headingsOutline.length < 35) {
                headingsOutline.push(`${prefix} ${text}`);
            }
        } else if (tag === 'li') {
            lines.push(`- ${text}`);
        } else if (tag === 'pre') {
            const codeText = $(el).text().trim();
            if (codeText) {
                codeBlocksCount += 1;
                lines.push(`\n\`\`\`\n${codeText}\n\`\`\`\n`);
            }
        } else if (tag === 'blockquote') {
            lines.push(`> ${text}`);
        } else {
            lines.push(text);
        }
    });

    const joined = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const markdown = joined.length > 80 ? joined : root.text().replace(/\s+/g, ' ').trim();
    return {
        markdown,
        headingsOutline,
        codeBlocksCount,
        tablesCount,
    };
}

function splitIntoChunks(markdown, chunkSize = 1200, overlap = 150) {
    const chunks = [];
    if (!markdown) return chunks;
    const step = Math.max(100, chunkSize - overlap);
    let idx = 0;
    let chunkIndex = 0;
    let lastHeading = 'Introduction';

    while (idx < markdown.length) {
        const slice = markdown.slice(idx, idx + chunkSize).trim();
        if (slice) {
            const headingMatch = slice.match(/^#{1,3}\s+(.+)$/m);
            if (headingMatch) {
                lastHeading = headingMatch[1].trim();
            }
            chunks.push({
                chunkIndex,
                sectionHeading: lastHeading,
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
    const language = $('html').attr('lang')?.trim() || 'en';
    const author = $('meta[name="author"]').attr('content')?.trim()
        || $('meta[property="article:author"]').attr('content')?.trim()
        || null;
    const publishedDate = $('meta[property="article:published_time"]').attr('content')?.trim()
        || $('time[datetime]').first().attr('datetime')?.trim()
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

    const { markdown, headingsOutline, codeBlocksCount, tablesCount } = htmlToCleanMarkdownAndStats($);
    const words = markdown ? markdown.split(/\s+/).filter(Boolean).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 220));
    const estimatedTokens = Math.ceil(markdown.length / 4);
    const chunks = splitIntoChunks(markdown, chunkSizeChars, chunkOverlapChars);

    // Calculate Content Quality & Structure Score (0-100)
    let contentQualityScore = 35;
    if (words >= 250) contentQualityScore += 20;
    else if (words >= 80) contentQualityScore += 10;
    if (headingsOutline.length >= 3) contentQualityScore += 18;
    else if (headingsOutline.length >= 1) contentQualityScore += 10;
    if (description) contentQualityScore += 10;
    if (codeBlocksCount > 0 || tablesCount > 0) contentQualityScore += 10;
    if (jsonLd.length > 0) contentQualityScore += 7;
    contentQualityScore = Math.min(100, contentQualityScore);

    const shortDesc = description || (markdown ? `${markdown.replace(/\s+/g, ' ').slice(0, 140)}...` : 'Documentation page');
    const llmsTxtEntry = `- [${title || res.finalUrl}](${res.finalUrl}): ${shortDesc}`;

    return {
        url: res.finalUrl,
        reachable: true,
        statusCode: res.status,
        title,
        description,
        contentQualityScore,
        readingTimeMinutes,
        wordCount: words,
        charCount: markdown.length,
        estimatedTokens,
        chunksCount: chunks.length,
        codeBlocksCount,
        tablesCount,
        language,
        author,
        publishedDate,
        llmsTxtEntry,
        headingsOutline,
        markdown,
        chunks,
        jsonLd: jsonLd.slice(0, 5),
        internalLinks: [...internalLinks].slice(0, 30),
        scrapedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const demoUrl = process.argv[process.argv.indexOf('--demo') + 1] || 'https://docs.apify.com/platform/actors';
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
            : [
                'https://docs.apify.com/platform/actors',
                'https://docs.apify.com/sdk/js',
                'https://crawlee.dev',
            ];
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
                        await Actor.charge({ eventName: 'page-converted', count: 1  });
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
