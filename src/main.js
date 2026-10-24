import { Actor } from 'apify';

async function searchHackerNews(query, maxResults) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${Math.min(maxResults, 100)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = Array.isArray(data?.hits) ? data.hits : [];
    return hits.map((h) => {
        let externalDomain = null;
        if (h.url) {
            try { externalDomain = new URL(h.url).hostname.replace(/^www\./i, ''); } catch {}
        }
        return {
            query,
            objectId: h.objectID,
            title: h.title || '',
            isShowHN: /^Show HN:/i.test(h.title || ''),
            isAskHN: /^Ask HN:/i.test(h.title || ''),
            author: h.author || null,
            points: h.points || 0,
            numComments: h.num_comments || 0,
            externalDomain,
            externalUrl: h.url || null,
            hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
            createdAt: h.created_at || null,
            scrapedAt: new Date().toISOString(),
        };
    });
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await searchHackerNews('Show HN: AI', 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const queries = Array.isArray(input.queries) && input.queries.length ? input.queries : ['Show HN: AI'];
        const maxStories = Number(input.maxStoriesPerQuery) || 20;
        for (const q of queries) {
            const items = await searchHackerNews(q, maxStories);
            if (items.length > 0) {
                await Actor.pushData(items);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'story-extracted', count: items.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
