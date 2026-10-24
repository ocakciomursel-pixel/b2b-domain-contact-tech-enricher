import { Actor } from 'apify';

async function fetchText(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapAuditor/1.0)' } });
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    }
}

async function analyzeDomainSitemap(rawDomain, maxUrls) {
    const clean = String(rawDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
    if (!clean) return null;
    const baseUrl = `https://${clean}`;

    let sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robots = await fetchText(`${baseUrl}/robots.txt`);
    const smMatch = robots.match(/^Sitemap:\s*(https?:\/\/\S+)/im);
    if (smMatch) sitemapUrl = smMatch[1].trim();

    let xml = await fetchText(sitemapUrl);
    if (!xml) {
        xml = await fetchText(`${baseUrl}/sitemap_index.xml`);
    }

    const childSitemaps = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((m) => m[1].trim());
    if (childSitemaps.length > 0) {
        const subXml = await fetchText(childSitemaps[0]);
        if (subXml) xml += '\n' + subXml;
    }

    const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
    const urls = [];
    const sections = {};
    let updatedLast30Days = 0;
    const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;

    for (const b of urlBlocks) {
        const block = b[1];
        const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
        if (!loc) continue;
        const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim() || null;
        if (lastmod) {
            const ts = Date.parse(lastmod);
            if (!Number.isNaN(ts) && ts >= thirtyDaysAgo) updatedLast30Days += 1;
        }
        try {
            const u = new URL(loc);
            const firstSeg = '/' + (u.pathname.split('/').filter(Boolean)[0] || '');
            sections[firstSeg] = (sections[firstSeg] || 0) + 1;
        } catch {}
        if (urls.length < maxUrls) urls.push({ url: loc, lastmod });
    }

    return {
        domain: clean,
        primarySitemapUrl: sitemapUrl,
        sitemapFound: urlBlocks.length > 0 || childSitemaps.length > 0,
        childSitemapsCount: childSitemaps.length,
        totalUrlsExtracted: urlBlocks.length,
        updatedLast30Days,
        topPathSections: sections,
        sampleUrls: urls.slice(0, 25).map((u) => u.url),
        urls,
        analyzedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const report = await analyzeDomainSitemap('apify.com', 15);
        console.log(JSON.stringify(report, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const domains = Array.isArray(input.domains) && input.domains.length ? input.domains : ['apify.com'];
        const maxUrls = Number(input.maxUrlsPerDomain) || 200;
        for (const d of domains) {
            const report = await analyzeDomainSitemap(d, maxUrls);
            if (report) {
                await Actor.pushData(report);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'sitemap-analyzed', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
