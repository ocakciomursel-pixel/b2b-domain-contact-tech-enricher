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


const INTENT_PATTERNS = [
    { label: 'seeking-recommendation', regex: /\b(recommend|suggestion|what tool|best tool|which tool|looking for a)\b/i },
    { label: 'competitor-alternative', regex: /\b(alternative to|replace|switching from|better than|vs\b)\b/i },
    { label: 'pain-point-problem', regex: /\b(frustrated|struggling|hate|issue with|how do you handle|pain point)\b/i },
    { label: 'pricing-budget', regex: /\b(pricing|expensive|cheaper|worth paying|cost|subscription)\b/i },
];

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function scrapeSubreddit(sub, maxPosts) {
    const clean = String(sub || '').replace(/^r\//i, '').trim();
    if (!clean) return [];

    // 1. Try JSON endpoint
    try {
        const res = await fetch(`https://old.reddit.com/r/${encodeURIComponent(clean)}/hot.json?limit=${Math.min(maxPosts, 100)}`, {
            headers: {
                'User-Agent': BROWSER_UA,
                'Accept': 'application/json,text/plain,*/*',
            },
        });
        if (res.ok) {
            const data = await res.json();
            const children = data?.data?.children || [];
            const out = [];
            for (const item of children) {
                const p = item?.data;
                if (!p || p.stickied) continue;
                const text = `${p.title || ''} ${p.selftext || ''}`;
                const signals = INTENT_PATTERNS.filter((pat) => pat.regex.test(text)).map((pat) => pat.label);
                out.push({
                    subreddit: p.subreddit || clean,
                    postId: p.id,
                    title: p.title || '',
                    selftextSnippet: String(p.selftext || '').slice(0, 500),
                    buyerIntentSignals: signals,
                    hasBuyerIntent: signals.length > 0,
                    score: p.score || 0,
                    upvoteRatio: p.upvote_ratio || 0,
                    numComments: p.num_comments || 0,
                    author: p.author || null,
                    createdUtc: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
                    permalink: p.permalink ? `https://www.reddit.com${p.permalink}` : null,
                    externalUrl: p.url || null,
                    scrapedAt: new Date().toISOString(),
                });
                if (out.length >= maxPosts) return out;
            }
            if (out.length > 0) return out;
        }
    } catch {}

    // 2. Fallback to Atom/RSS endpoint (.rss)
    try {
        const rssRes = await fetch(`https://www.reddit.com/r/${encodeURIComponent(clean)}/hot.rss?limit=${Math.min(maxPosts, 100)}`, {
            headers: { 'User-Agent': BROWSER_UA },
        });
        if (rssRes.ok) {
            const xml = await rssRes.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const out = [];
            $('entry').each((_, el) => {
                if (out.length >= maxPosts) return;
                const title = $(el).find('title').first().text().trim();
                const contentHtml = $(el).find('content').first().text();
                const bodyText = cheerio.load(contentHtml).text().replace(/\s+/g, ' ').trim();
                const link = $(el).find('link').attr('href') || null;
                const author = $(el).find('author > name').first().text().trim() || null;
                const updated = $(el).find('updated').first().text().trim() || null;
                const id = $(el).find('id').first().text().trim() || null;
                const fullText = `${title} ${bodyText}`;
                const signals = INTENT_PATTERNS.filter((pat) => pat.regex.test(fullText)).map((pat) => pat.label);

                out.push({
                    subreddit: clean,
                    postId: id,
                    title,
                    selftextSnippet: bodyText.slice(0, 500),
                    buyerIntentSignals: signals,
                    hasBuyerIntent: signals.length > 0,
                    score: null,
                    numComments: null,
                    author,
                    createdUtc: updated,
                    permalink: link,
                    externalUrl: link,
                    scrapedAt: new Date().toISOString(),
                });
            });
            return out;
        }
    } catch {}

    return [];
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await scrapeSubreddit('saas', 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const subs = Array.isArray(input.subreddits) && input.subreddits.length ? input.subreddits : ['saas'];
        const maxPosts = Number(input.maxPostsPerSubreddit) || 20;
        for (const s of subs) {
            const posts = await scrapeSubreddit(s, maxPosts);
            if (posts.length > 0) {
                await Actor.pushData(__wrapPushData(posts));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'post-extracted', count: posts.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
