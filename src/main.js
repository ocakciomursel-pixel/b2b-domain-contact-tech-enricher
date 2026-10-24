import { Actor, log } from 'apify';

async function fetchCompanyJobs(slug, keywordFilter, maxJobs) {
    const clean = String(slug || '').trim().toLowerCase();
    if (!clean) return [];
    const kw = (keywordFilter || '').trim().toLowerCase();
    const out = [];

    // 1. Try Greenhouse API
    try {
        const ghRes = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(clean)}/jobs`);
        if (ghRes.ok) {
            const data = await ghRes.json();
            const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
            for (const j of jobs) {
                const title = String(j.title || '');
                const location = String(j.location?.name || '');
                const department = Array.isArray(j.departments) && j.departments[0] ? j.departments[0].name : 'General';
                if (kw && !(`${title} ${location} ${department}`.toLowerCase().includes(kw))) continue;
                out.push({
                    company: clean,
                    atsPlatform: 'Greenhouse',
                    jobId: String(j.id),
                    title,
                    department,
                    location,
                    isRemote: /remote|anywhere|distributed/i.test(`${title} ${location}`),
                    updatedAt: j.updated_at || null,
                    applyUrl: j.absolute_url || null,
                    scrapedAt: new Date().toISOString(),
                });
                if (out.length >= maxJobs) return out;
            }
            if (out.length > 0) return out;
        }
    } catch {}

    // 2. Try Lever API
    try {
        const lvRes = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(clean)}?mode=json`);
        if (lvRes.ok) {
            const jobs = await lvRes.json();
            if (Array.isArray(jobs)) {
                for (const j of jobs) {
                    const title = String(j.text || '');
                    const location = String(j.categories?.location || '');
                    const department = String(j.categories?.department || j.categories?.team || 'General');
                    if (kw && !(`${title} ${location} ${department}`.toLowerCase().includes(kw))) continue;
                    out.push({
                        company: clean,
                        atsPlatform: 'Lever',
                        jobId: String(j.id),
                        title,
                        department,
                        location,
                        isRemote: /remote|anywhere/i.test(`${title} ${location} ${j.workplaceType || ''}`),
                        updatedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
                        applyUrl: j.hostedUrl || null,
                        scrapedAt: new Date().toISOString(),
                    });
                    if (out.length >= maxJobs) return out;
                }
            }
        }
    } catch {}

    return out;
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await fetchCompanyJobs('stripe', '', 3);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const companies = Array.isArray(input.companies) && input.companies.length ? input.companies : ['stripe'];
        const keywordFilter = input.keywordFilter || '';
        const maxJobsPerCompany = Number(input.maxJobsPerCompany) || 25;
        for (const c of companies) {
            const jobs = await fetchCompanyJobs(c, keywordFilter, maxJobsPerCompany);
            if (jobs.length > 0) {
                await Actor.pushData(jobs);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'job-extracted', count: jobs.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
