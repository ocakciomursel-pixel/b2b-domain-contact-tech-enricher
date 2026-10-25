import { Actor, log } from 'apify';

function buildHeaders(token) {
    const h = {
        'User-Agent': 'Apify-GitHub-Developer-Lead-Enricher/2.0',
        'Accept': 'application/vnd.github+json',
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

async function fetchJson(url, token) {
    try {
        const res = await fetch(url, { headers: buildHeaders(token) });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function enrichDeveloper(username, sourceRepo, repoContributions, token) {
    const [profile, events, repos] = await Promise.all([
        fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, token),
        fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=20`, token),
        fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=12`, token),
    ]);

    if (!profile || !profile.login) return null;

    const emails = new Set();
    if (profile.email && !profile.email.includes('noreply.github.com')) {
        emails.add(profile.email.toLowerCase());
    }

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

    const langCounts = {};
    let totalStarsEarned = 0;
    const topReposList = [];

    if (Array.isArray(repos)) {
        const sortedByStars = [...repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
        for (const r of sortedByStars) {
            totalStarsEarned += Number(r.stargazers_count) || 0;
            if (r.language) {
                langCounts[r.language] = (langCounts[r.language] || 0) + 1;
            }
            if (topReposList.length < 3 && !r.fork) {
                topReposList.push(`${r.name} (★${r.stargazers_count || 0})`);
            }
        }
    }

    const topLanguages = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang);

    const createdYear = profile.created_at ? new Date(profile.created_at).getUTCFullYear() : new Date().getUTCFullYear();
    const accountAgeYears = Math.max(1, new Date().getUTCFullYear() - createdYear);

    // Compute Candidate Score (0-100) & Seniority Tier
    let candidateScore = 30;
    if (emails.size > 0) candidateScore += 18;
    if (profile.followers >= 100) candidateScore += 15;
    else if (profile.followers >= 20) candidateScore += 8;
    if (totalStarsEarned >= 50) candidateScore += 12;
    else if (totalStarsEarned >= 5) candidateScore += 6;
    if (accountAgeYears >= 6) candidateScore += 10;
    else if (accountAgeYears >= 3) candidateScore += 5;
    if (topLanguages.length >= 2) candidateScore += 8;
    if (profile.hireable || profile.blog || profile.twitter_username) candidateScore += 7;
    candidateScore = Math.min(100, candidateScore);

    let seniorityTier = 'Mid-Level Engineer';
    if (accountAgeYears >= 7 && (profile.followers >= 50 || (repoContributions || 0) >= 30 || totalStarsEarned >= 40)) {
        seniorityTier = 'Staff / Principal Engineer';
    } else if (accountAgeYears >= 4 || (repoContributions || 0) >= 10 || profile.public_repos >= 25) {
        seniorityTier = 'Senior Engineer';
    }

    const displayName = profile.name || profile.login;
    const primaryLang = topLanguages[0] || 'open-source';
    const recruiterOutreachHook = `Hi ${displayName.split(' ')[0]}, loved your ${primaryLang} contributions to ${sourceRepo !== 'direct' ? sourceRepo : (topReposList[0] || 'GitHub')} — we're hiring a ${seniorityTier} and your profile stood out.`;

    return {
        username: profile.login,
        name: profile.name || null,
        candidateScore,
        seniorityTier,
        emails: [...emails],
        topLanguages,
        totalStarsEarned,
        topRepos: topReposList,
        repoContributions: repoContributions || 0,
        company: profile.company || null,
        location: profile.location || null,
        hireable: Boolean(profile.hireable),
        blogUrl: profile.blog || null,
        twitterUsername: profile.twitter_username || null,
        followers: profile.followers || 0,
        following: profile.following || 0,
        publicRepos: profile.public_repos || 0,
        accountAgeYears,
        sourceRepo: sourceRepo || 'direct',
        recruiterOutreachHook,
        bio: profile.bio || null,
        profileUrl: profile.html_url,
        accountCreatedAt: profile.created_at,
        enrichedAt: new Date().toISOString(),
    };
}

async function processInput(input) {
    const repos = Array.isArray(input.repositories) && input.repositories.length > 0
        ? input.repositories
        : ['apify/crawlee'];
    const directUsers = Array.isArray(input.usernames) ? input.usernames : [];
    const maxPerRepo = Math.min(Math.max(Number(input.maxDevelopersPerRepo) || 6, 1), 100);
    const token = (input.githubToken || process.env.GITHUB_TOKEN || '').trim();

    const results = [];
    const seen = new Set();

    for (const u of directUsers) {
        const clean = String(u).trim();
        if (!clean || seen.has(clean.toLowerCase())) continue;
        seen.add(clean.toLowerCase());
        const enriched = await enrichDeveloper(clean, 'direct', 0, token);
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
            const enriched = await enrichDeveloper(c.login, slug, c.contributions || 0, token);
            if (enriched) {
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
