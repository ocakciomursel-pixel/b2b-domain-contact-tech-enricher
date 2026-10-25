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


async function enrichNpmPackage(pkgName) {
    const clean = String(pkgName || '').trim();
    if (!clean) return null;
    try {
        const [metaRes, dlRes] = await Promise.all([
            fetch(`https://registry.npmjs.org/${encodeURIComponent(clean)}`),
            fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(clean)}`),
        ]);
        if (!metaRes.ok) return null;
        const meta = await metaRes.json();
        const dl = dlRes.ok ? await dlRes.json() : {};
        const latest = meta['dist-tags']?.latest;
        const latestVerObj = latest && meta.versions ? meta.versions[latest] : {};
        const maintainers = Array.isArray(meta.maintainers) ? meta.maintainers : [];
        const emails = [...new Set(maintainers.map((m) => m.email).filter(Boolean))];
        const depsCount = Object.keys(latestVerObj?.dependencies || {}).length;

        return {
            ecosystem: 'npm',
            packageName: meta.name || clean,
            description: meta.description || null,
            latestVersion: latest || null,
            license: meta.license || latestVerObj?.license || null,
            monthlyDownloads: dl.downloads || 0,
            dependenciesCount: depsCount,
            maintainersCount: maintainers.length,
            maintainerEmails: emails,
            repositoryUrl: meta.repository?.url?.replace(/^git\+/i, '').replace(/\.git$/i, '') || null,
            homepageUrl: meta.homepage || null,
            lastPublishedAt: latest && meta.time ? meta.time[latest] : null,
            enrichedAt: new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

async function enrichPypiPackage(pkgName) {
    const clean = String(pkgName || '').trim();
    if (!clean) return null;
    try {
        const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(clean)}/json`);
        if (!res.ok) return null;
        const data = await res.json();
        const info = data?.info || {};
        const emails = [];
        if (info.author_email) emails.push(...info.author_email.split(',').map((s) => s.trim()));
        if (info.maintainer_email) emails.push(...info.maintainer_email.split(',').map((s) => s.trim()));

        return {
            ecosystem: 'pypi',
            packageName: info.name || clean,
            description: info.summary || null,
            latestVersion: info.version || null,
            license: info.license || null,
            monthlyDownloads: null,
            dependenciesCount: Array.isArray(info.requires_dist) ? info.requires_dist.length : 0,
            maintainersCount: emails.length || 1,
            maintainerEmails: [...new Set(emails.filter(Boolean))],
            repositoryUrl: info.project_urls?.Repository || info.project_urls?.Source || info.home_page || null,
            homepageUrl: info.home_page || info.package_url || null,
            lastPublishedAt: null,
            enrichedAt: new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

async function run() {
    if (process.argv.includes('--demo')) {
        const a = await enrichNpmPackage('crawlee');
        const b = await enrichPypiPackage('fastapi');
        console.log(JSON.stringify([a, b].filter(Boolean), null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const npmList = Array.isArray(input.npmPackages) ? input.npmPackages : ['crawlee'];
        const pypiList = Array.isArray(input.pypiPackages) ? input.pypiPackages : ['fastapi'];

        for (const pkg of npmList) {
            const item = await enrichNpmPackage(pkg);
            if (item) {
                await Actor.pushData(__wrapPushData(item));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'package-enriched', count: 1 }); } catch {}
                }
            }
        }
        for (const pkg of pypiList) {
            const item = await enrichPypiPackage(pkg);
            if (item) {
                await Actor.pushData(__wrapPushData(item));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'package-enriched', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
