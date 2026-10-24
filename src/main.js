import { Actor } from 'apify';

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
        const domains = Array.isArray(input.domains) && input.domains.length ? input.domains : ['techcrunch.com'];
        for (const d of domains) {
            const report = await inspectSite(d);
            if (report) {
                await Actor.pushData(report);
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
