import { Actor, log } from 'apify';

function buildHeaders(token) {
    const h = {
        'User-Agent': 'Apify-GitHub-Developer-Lead-Enricher/1.0',
        'Accept': 'application/vnd.github+json',
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

async function fetchJson(url, token) {
    const res = await fetch(url, { headers: buildHeaders(token) });
    if (!res.ok) return null;
    return res.json();
}

async function enrichDeveloper(username, sourceRepo, token) {
    const profile = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, token);
    if (!profile || !profile.login) return null;

    const emails = new Set();
    if (profile.email && !profile.email.includes('noreply.github.com')) {
        emails.add(profile.email.toLowerCase());
    }

    const events = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=15`, token);
    if (Array.isArray(events)) {
        for (const ev of events) {
            const commits = ev?.payload?.commits || [];
            for (const c of commits) {
                const email = c?.author?.email;
                if (email && !email.includes('noreply.github.com') && email.includes('@')) {
                    emails.add(email.toLowerCase());
                }
            }
        }
    }

    return {
        username: profile.login,
        name: profile.name || null,
        emails: [...emails],
        company: profile.company || null,
        location: profile.location || null,
        bio: profile.bio || null,
        hireable: Boolean(profile.hireable),
        blogUrl: profile.blog || null,
        twitterUsername: profile.twitter_username || null,
        followers: profile.followers || 0,
        following: profile.following || 0,
        publicRepos: profile.public_repos || 0,
        publicGists: profile.public_gists || 0,
        sourceRepo: sourceRepo || 'direct',
        profileUrl: profile.html_url,
        accountCreatedAt: profile.created_at,
        enrichedAt: new Date().toISOString(),
    };
}

async function processInput(input) {
    const repos = Array.isArray(input.repositories) ? input.repositories : ['apify/crawlee'];
    const directUsers = Array.isArray(input.usernames) ? input.usernames : [];
    const maxPerRepo = Math.min(Math.max(Number(input.maxDevelopersPerRepo) || 10, 1), 100);
    const token = (input.githubToken || process.env.GITHUB_TOKEN || '').trim();

    const results = [];
    const seen = new Set();

    for (const u of directUsers) {
        const clean = String(u).trim();
        if (!clean || seen.has(clean.toLowerCase())) continue;
        seen.add(clean.toLowerCase());
        const enriched = await enrichDeveloper(clean, 'direct', token);
        if (enriched) results.push(enriched);
    }

    for (const rawRepo of repos) {
        const slug = String(rawRepo).replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '').trim();
        if (!slug.includes('/')) continue;

        const contributors = await fetchJson(`https://api.github.com/repos/${slug}/contributors?per_page=${maxPerRepo}`, token);
        if (!Array.isArray(contributors)) continue;

        for (const c of contributors.slice(0, maxPerRepo)) {
            if (!c?.login || c.type !== 'User' || seen.has(c.login.toLowerCase())) continue;
            seen.add(c.login.toLowerCase());
            const enriched = await enrichDeveloper(c.login, slug, token);
            if (enriched) {
                enriched.repoContributions = c.contributions || 0;
                results.push(enriched);
            }
        }
    }

    return results;
}

async function run() {
    if (process.argv.includes('--demo')) {
        console.log('Running demo GitHub Developer Lead Enricher...');
        const items = await processInput({ repositories: ['apify/crawlee'], maxDevelopersPerRepo: 2 });
        console.log(JSON.stringify(items, null, 2));
        return;
    }

    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const items = await processInput(input);
        for (const item of items) {
            await Actor.pushData(item);
            if (typeof Actor.charge === 'function') {
                try {
                    await Actor.charge({ eventName: 'developer-enriched', count: 1 });
                } catch {
                    // ignore
                }
            }
        }
        log.info(`Enriched ${items.length} GitHub developer profile(s).`);
    } finally {
        await Actor.exit();
    }
}

run();
