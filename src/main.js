import { Actor } from 'apify';

async function searchOpenAlex(topic, maxPapers) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(topic)}&per-page=${Math.min(maxPapers, 100)}&sort=cited_by_count:desc`;
    const res = await fetch(url, { headers: { 'User-Agent': 'mailto:research-bot@apify.com' } });
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    return results.map((w) => {
        const authorships = Array.isArray(w.authorships) ? w.authorships : [];
        const authors = [];
        const institutions = new Set();

        for (const a of authorships) {
            if (a.author?.display_name) {
                authors.push({
                    name: a.author.display_name,
                    orcid: a.author.orcid || null,
                    isCorresponding: Boolean(a.is_corresponding),
                });
            }
            for (const inst of a.institutions || []) {
                if (inst.display_name) institutions.add(`${inst.display_name} (${inst.country_code || 'N/A'})`);
            }
        }

        const grants = (w.grants || []).map((g) => ({
            funder: g.funder_display_name || null,
            awardId: g.award_id || null,
        }));

        return {
            topic,
            openAlexId: w.id,
            title: w.title || w.display_name,
            publicationYear: w.publication_year || null,
            publicationDate: w.publication_date || null,
            citedByCount: w.cited_by_count || 0,
            isOpenAccess: Boolean(w.open_access?.is_oa),
            openAccessPdfUrl: w.open_access?.oa_url || null,
            doiUrl: w.doi || null,
            firstAuthor: authors[0]?.name || null,
            authors: authors.slice(0, 10),
            institutions: [...institutions],
            grants,
            enrichedAt: new Date().toISOString(),
        };
    });
}

async function run() {
    if (process.argv.includes('--demo')) {
        const items = await searchOpenAlex('CRISPR delivery', 2);
        console.log(JSON.stringify(items, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const topics = Array.isArray(input.researchTopics) && input.researchTopics.length ? input.researchTopics : ['CRISPR delivery'];
        const maxPapers = Number(input.maxPapersPerTopic) || 15;
        for (const t of topics) {
            const items = await searchOpenAlex(t, maxPapers);
            if (items.length > 0) {
                await Actor.pushData(items);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'paper-enriched', count: items.length }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
