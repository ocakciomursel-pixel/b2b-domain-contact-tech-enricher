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


const POSITIVE_WORDS = /\b(surge|soar|record|growth|launch|partner|raise|profit|breakthrough|award|win|upgrade|bullish|expand|success)\b/gi;
const NEGATIVE_WORDS = /\b(lawsuit|sued|breach|hack|layoff|cut|drop|plunge|crisis|fine|penalty|outage|investigation|fraud|decline)\b/gi;

const EVENT_RULES = [
    { category: 'funding-ma', regex: /\b(raises|funding|series [a-e]|acquires|acquisition|merger|ipo|valuation)\b/i },
    { category: 'product-launch', regex: /\b(launches|unveils|announces|releases|introduces|new feature)\b/i },
    { category: 'partnership-deal', regex: /\b(partners|partnership|collaborates|agreement|contract with)\b/i },
    { category: 'crisis-legal-risk', regex: /\b(lawsuit|sued|hack|breach|layoffs|probe|antitrust|recall)\b/i },
];

async function monitorNewsKeyword(keyword, maxArticles) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const out = [];

    $('item').each((_, el) => {
        if (out.length >= maxArticles) return;
        const rawTitle = $(el).find('title').first().text().trim();
        const link = $(el).find('link').first().text().trim();
        const pubDate = $(el).find('pubDate').first().text().trim();
        const publisher = $(el).find('source').first().text().trim() || null;

        const posCount = (rawTitle.match(POSITIVE_WORDS) || []).length;
        const negCount = (rawTitle.match(NEGATIVE_WORDS) || []).length;
        const sentimentScore = posCount - negCount;
        const sentimentLabel = sentimentScore > 0 ? 'POSITIVE' : (sentimentScore < 0 ? 'NEGATIVE' : 'NEUTRAL');
        const eventCategories = EVENT_RULES.filter((r) => r.regex.test(rawTitle)).map((r) => r.category);

        out.push({
            query: keyword,
            title: rawTitle,
            publisher,
            sentimentLabel,
            sentimentScore,
            eventCategories,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
            link,
            analyzedAt: new Date().toISOString(),
        });
    });

    return out;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await monitorNewsKeyword('OpenAI', 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const keywords = Array.isArray(input.keywords) && input.keywords.length ? input.keywords : ['OpenAI'];
        const maxArticles = Number(input.maxArticlesPerKeyword) || 15;
        for (const kw of keywords) {
            const items = await monitorNewsKeyword(kw, maxArticles);
            if (items.length > 0) {
                await Actor.pushData(__wrapPushData(items));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'news-article-analyzed', count: items.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
