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


async function analyzeDefiProtocols(categoryFilter, chainFilter, minTvlUsd, maxProtocols) {
    const res = await fetch('https://api.llama.fi/protocols');
    if (!res.ok) return [];
    const protocols = await res.json();
    if (!Array.isArray(protocols)) return [];

    const catKw = (categoryFilter || '').trim().toLowerCase();
    const chainKw = (chainFilter || '').trim().toLowerCase();
    const out = [];

    for (const p of protocols) {
        const tvl = Number(p.tvl) || 0;
        if (tvl < minTvlUsd) continue;
        if (catKw && !(String(p.category || '').toLowerCase().includes(catKw))) continue;
        const chains = Array.isArray(p.chains) ? p.chains : [];
        if (chainKw && !chains.some((c) => c.toLowerCase().includes(chainKw))) continue;

        const mcap = Number(p.mcap) || null;
        const mcapToTvl = mcap && tvl > 0 ? Number((mcap / tvl).toFixed(3)) : null;

        out.push({
            name: p.name,
            slug: p.slug,
            symbol: p.symbol || null,
            category: p.category || null,
            tvlUsd: Math.round(tvl),
            mcapUsd: mcap ? Math.round(mcap) : null,
            mcapToTvlRatio: mcapToTvl,
            change1hPct: p.change_1h !== undefined ? Number(Number(p.change_1h).toFixed(2)) : null,
            change1dPct: p.change_1d !== undefined ? Number(Number(p.change_1d).toFixed(2)) : null,
            change7dPct: p.change_7d !== undefined ? Number(Number(p.change_7d).toFixed(2)) : null,
            chains: chains.slice(0, 15),
            auditsCount: Number(p.audits) || 0,
            auditLinks: Array.isArray(p.audit_links) ? p.audit_links : [],
            twitter: p.twitter ? `https://x.com/${p.twitter}` : null,
            url: p.url || null,
            analyzedAt: new Date().toISOString(),
        });

        if (out.length >= maxProtocols) break;
    }

    return out;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await analyzeDefiProtocols('', '', 50000000, 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const items = await analyzeDefiProtocols(
            input.categoryFilter || '',
            input.chainFilter || '',
            Number(input.minTvlUsd) || 10000000,
            Number(input.maxProtocols) || 25
        );
        if (items.length > 0) {
            await Actor.pushData(__wrapPushData(items));
            if (typeof Actor.charge === 'function') {
                try { await Actor.charge({ eventName: 'protocol-analyzed', count: items.length }); } catch {}
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
