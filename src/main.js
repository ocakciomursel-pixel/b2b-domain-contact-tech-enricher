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


async function inspectSite(rawDomain) {
    const clean = String(rawDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
    if (!clean) return null;
    const baseUrl = `https://${clean}`;

    let html = '';
    try {
        const res = await fetch(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WP-Site-Spy/1.0)' } });
        html = await res.text();
    } catch {}

    const themes = new Set();
    const plugins = new Set();
    const themeRegex = /\/wp-content\/themes\/([a-zA-Z0-9_-]+)/g;
    const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = themeRegex.exec(html)) !== null) themes.add(m[1]);
    while ((m = pluginRegex.exec(html)) !== null) plugins.add(m[1]);

    let wpJson = null;
    try {
        const apiRes = await fetch(`${baseUrl}/wp-json/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (apiRes.ok) wpJson = await apiRes.json();
    } catch {}

    const namespaces = Array.isArray(wpJson?.namespaces) ? wpJson.namespaces : [];
    const isWordPress = themes.size > 0 || plugins.size > 0 || namespaces.length > 0 || /wp-content|wp-includes/i.test(html);
    const isWooCommerce = plugins.has('woocommerce') || namespaces.some((n) => n.startsWith('wc/')) || /woocommerce/i.test(html);

    return {
        domain: clean,
        url: baseUrl,
        siteName: wpJson?.name || null,
        siteDescription: wpJson?.description || null,
        isWordPress,
        isWooCommerce,
        activeTheme: [...themes][0] || null,
        allThemesDetected: [...themes],
        detectedPlugins: [...plugins],
        pluginsCount: plugins.size,
        restNamespaces: namespaces,
        analyzedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const item = await inspectSite('techcrunch.com');
        console.log(JSON.stringify(item, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const domains = Array.isArray(input.domains) && input.domains.length ? input.domains : ["techcrunch.com","wordpress.org","woocommerce.com","yoast.com","wpbeginner.com","kinsta.com","wpengine.com","smashingmagazine.com","css-tricks.com","elementor.com"];
        for (const d of domains) {
            const report = await inspectSite(d);
            if (report) {
                await Actor.pushData(__wrapPushData(report));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'site-analyzed', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
