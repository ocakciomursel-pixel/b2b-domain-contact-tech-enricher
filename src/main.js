import { Actor } from 'apify';

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


const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,12}\b/g;

async function enrichPodcastByKeyword(keyword, limit) {
    const searchUrl = `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(keyword)}&limit=${Math.min(limit, 50)}`;
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const out = [];

    for (const pod of results.slice(0, limit)) {
        const feedUrl = pod.feedUrl;
        const emails = new Set();
        let websiteUrl = null;

        if (feedUrl) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 10000);
                const rssRes = await fetch(feedUrl, { signal: controller.signal });
                const xml = await rssRes.text();
                clearTimeout(timer);

                const foundEmails = xml.match(EMAIL_REGEX) || [];
                for (const e of foundEmails) {
                    const lower = e.toLowerCase();
                    if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.includes('example.com')) {
                        emails.add(lower);
                    }
                }
                const linkMatch = xml.match(/<link>([^<]+)<\/link>/i);
                if (linkMatch) websiteUrl = linkMatch[1].trim();
            } catch {}
        }

        out.push({
            searchKeyword: keyword,
            podcastId: pod.collectionId,
            podcastTitle: pod.collectionName || pod.trackName,
            hostName: pod.artistName || null,
            ownerEmails: [...emails],
            primaryGenre: pod.primaryGenreName || null,
            trackCount: pod.trackCount || 0,
            country: pod.country || null,
            websiteUrl,
            feedUrl: feedUrl || null,
            applePodcastUrl: pod.collectionViewUrl || null,
            latestReleaseDate: pod.releaseDate || null,
            enrichedAt: new Date().toISOString(),
        });
    }
    return out;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await enrichPodcastByKeyword('saas marketing', 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const keywords = Array.isArray(input.searchKeywords) && input.searchKeywords.length ? input.searchKeywords : ['saas marketing'];
        const maxPerKw = Number(input.maxPodcastsPerKeyword) || 10;
        for (const kw of keywords) {
            const items = await enrichPodcastByKeyword(kw, maxPerKw);
            if (items.length > 0) {
                await Actor.pushData(__wrapPushData(items));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'podcast-enriched', count: items.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
