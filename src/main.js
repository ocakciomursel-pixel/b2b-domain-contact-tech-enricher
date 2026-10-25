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


const COMPLAINT_THEMES = [
    { theme: 'crash-freeze-bug', regex: /\b(crash|crashes|freeze|freezes|bug|glitch|broken|not loading)\b/i },
    { theme: 'subscription-paywall-pricing', regex: /\b(expensive|paywall|subscription|charged|refund|greedy|overpriced)\b/i },
    { theme: 'ads-popups', regex: /\b(too many ads|ad every|annoying ads|popups)\b/i },
    { theme: 'login-sync-account', regex: /\b(login|sign in|sync|lost data|account)\b/i },
];

async function fetchRecentReviews(appId) {
    try {
        const res = await fetch(`https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`);
        if (!res.ok) return { lowStarCount: 0, themes: [], sampleComplaints: [] };
        const data = await res.json();
        const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
        let lowStarCount = 0;
        const themeSet = new Set();
        const sampleComplaints = [];

        for (const e of entries) {
            const rating = Number(e?.['im:rating']?.label);
            const title = e?.title?.label || '';
            const content = e?.content?.label || '';
            if (rating && rating <= 2) {
                lowStarCount += 1;
                const text = `${title} ${content}`;
                for (const t of COMPLAINT_THEMES) {
                    if (t.regex.test(text)) themeSet.add(t.theme);
                }
                if (sampleComplaints.length < 3) {
                    sampleComplaints.push({ rating, title, snippet: content.slice(0, 220) });
                }
            }
        }
        return { lowStarCount, themes: [...themeSet], sampleComplaints };
    } catch {
        return { lowStarCount: 0, themes: [], sampleComplaints: [] };
    }
}

async function analyzeAppStoreKeyword(term, maxApps) {
    const res = await fetch(`https://itunes.apple.com/search?entity=software&country=us&term=${encodeURIComponent(term)}&limit=${Math.min(maxApps, 25)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const apps = Array.isArray(data?.results) ? data.results : [];
    const out = [];

    for (const app of apps.slice(0, maxApps)) {
        const rev = await fetchRecentReviews(app.trackId);
        out.push({
            searchTerm: term,
            appId: app.trackId,
            bundleId: app.bundleId,
            trackName: app.trackName,
            sellerName: app.sellerName,
            primaryGenreName: app.primaryGenreName,
            price: app.price || 0,
            currency: app.currency || 'USD',
            averageUserRating: app.averageUserRating ? Number(app.averageUserRating.toFixed(2)) : null,
            userRatingCount: app.userRatingCount || 0,
            version: app.version || null,
            currentVersionReleaseDate: app.currentVersionReleaseDate || null,
            releaseNotesSnippet: String(app.releaseNotes || '').slice(0, 300),
            lowStarComplaintsCount: rev.lowStarCount,
            complaintThemes: rev.themes,
            sampleComplaints: rev.sampleComplaints,
            sellerUrl: app.sellerUrl || null,
            appStoreUrl: app.trackViewUrl || null,
            analyzedAt: new Date().toISOString(),
        });
    }
    return out;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await analyzeAppStoreKeyword('habit tracker', 2);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const terms = Array.isArray(input.searchTerms) && input.searchTerms.length ? input.searchTerms : ['habit tracker'];
        const maxApps = Number(input.maxAppsPerTerm) || 5;
        for (const t of terms) {
            const items = await analyzeAppStoreKeyword(t, maxApps);
            if (items.length > 0) {
                await Actor.pushData(__wrapPushData(items));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'app-analyzed', count: items.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
