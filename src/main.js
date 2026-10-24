import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MODE = "stablecoins";
const INPUT_PROP = "symbols";
const DEFAULT_LIST = ["USDT","USDC"];
const EVENT_NAME = "stablecoin-analyzed";

async function safeFetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            ...options,
            headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json,text/plain,*/*', ...(options.headers || {}) },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function safeFetchText(url, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, ...headers },
        });
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    } finally {
        clearTimeout(timer);
    }
}

async function processTarget(target, maxItems) {
    const q = String(target || '').trim();
    const cleanDomain = q.replace(/^https?:\/\//i, '').split('/')[0];
    const now = new Date().toISOString();

    switch (MODE) {
        case 'courtlistener': {
            const data = await safeFetchJson(`https://www.courtlistener.com/api/rest/v3/search/?q=${encodeURIComponent(q)}&type=o`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.slice(0, maxItems).map((r) => ({
                    target: q,
                    caseName: r.caseName || r.case_name || null,
                    court: r.court || null,
                    dateFiled: r.dateFiled || r.date_filed || null,
                    docketNumber: r.docketNumber || r.docket_number || null,
                    citation: r.citation || [],
                    absoluteUrl: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'patents': {
            const data = await safeFetchJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}%20AND%20SRC:PAT&format=json&pageSize=${Math.min(maxItems, 15)}`);
            const results = data?.resultList?.result || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    patentId: r.id,
                    title: r.title,
                    authorString: r.authorString || null,
                    pubYear: r.pubYear || null,
                    citedByCount: r.citedByCount || 0,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'secsubmissions': {
            const tickers = await safeFetchJson('https://www.sec.gov/files/company_tickers.json', {
                headers: { 'User-Agent': 'EnterpriseSecComplianceBot/1.0 (sec@apify.com)' },
            });
            if (tickers) {
                const match = Object.values(tickers).find((r) => String(r.ticker || '').toLowerCase() === q.toLowerCase());
                if (match) {
                    const cik = String(match.cik_str).padStart(10, '0');
                    const sub = await safeFetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, {
                        headers: { 'User-Agent': 'EnterpriseSecComplianceBot/1.0 (sec@apify.com)' },
                    });
                    const recent = sub?.filings?.recent;
                    if (recent && Array.isArray(recent.form)) {
                        return recent.form.slice(0, maxItems).map((form, idx) => ({
                            target: q.toUpperCase(),
                            companyName: sub.name,
                            cik,
                            form,
                            filingDate: recent.filingDate?.[idx] || null,
                            accessionNumber: recent.accessionNumber?.[idx] || null,
                            primaryDocDescription: recent.primaryDocDescription?.[idx] || null,
                            extractedAt: now,
                        }));
                    }
                }
            }
            break;
        }
        case 'usaspending': {
            const data = await safeFetchJson('https://api.usaspending.gov/api/v2/autocomplete/recipient/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ search_text: q, limit: Math.min(maxItems, 15) }),
            });
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    recipientName: r.recipient_name || r.legal_business_name || null,
                    uei: r.uei || null,
                    duns: r.duns || null,
                    recipientLevel: r.recipient_level || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'ianatld': {
            const data = await safeFetchJson('https://data.iana.org/rdap/dns.json');
            const services = data?.services || [];
            if (services.length > 0) {
                for (const [tlds, urls] of services) {
                    if (tlds.includes(q.toLowerCase().replace(/^\./, ''))) {
                        return [{
                            target: q.toLowerCase(),
                            tld: q.toLowerCase().replace(/^\./, ''),
                            rdapEndpoints: urls,
                            siblingTldsCount: tlds.length,
                            extractedAt: now,
                        }];
                    }
                }
            }
            break;
        }
        case 'nominatim': {
            const data = await safeFetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${Math.min(maxItems, 15)}`, {
                headers: { 'User-Agent': 'EnterpriseGeoEnricher/1.0 (geo@apify.com)' },
            });
            if (Array.isArray(data) && data.length > 0) {
                return data.map((p) => ({
                    target: q,
                    placeId: p.place_id,
                    displayName: p.display_name,
                    category: p.class,
                    type: p.type,
                    lat: p.lat,
                    lon: p.lon,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'zippopotam': {
            const cleanZip = q.replace(/[^0-9A-Za-z-]/g, '');
            const data = await safeFetchJson(`https://api.zippopotam.us/us/${encodeURIComponent(cleanZip)}`);
            if (data && Array.isArray(data.places)) {
                return data.places.map((p) => ({
                    target: cleanZip,
                    postCode: data['post code'],
                    country: data.country,
                    placeName: p['place name'],
                    state: p.state,
                    stateAbbreviation: p['state abbreviation'],
                    latitude: p.latitude,
                    longitude: p.longitude,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'openfema': {
            const data = await safeFetchJson(`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state%20eq%20'${encodeURIComponent(q.toUpperCase())}'&$top=${Math.min(maxItems, 15)}&$orderby=declarationDate%20desc`);
            const list = data?.DisasterDeclarationsSummaries || [];
            if (list.length > 0) {
                return list.map((d) => ({
                    target: q.toUpperCase(),
                    disasterNumber: d.disasterNumber,
                    declarationTitle: d.declarationTitle,
                    incidentType: d.incidentType,
                    designatedArea: d.designatedArea,
                    declarationDate: d.declarationDate,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'nhtsavpic': {
            const data = await safeFetchJson(`https://vpic.nhtsa.dot.gov/api/vehicles/GetManufacturerDetails/${encodeURIComponent(q)}?format=json`);
            const results = data?.Results || [];
            if (results.length > 0) {
                return results.slice(0, maxItems).map((m) => ({
                    target: q,
                    mfrId: m.Mfr_ID,
                    mfrName: m.Mfr_Name,
                    commonName: m.Mfr_CommonName,
                    country: m.Country,
                    city: m.City || null,
                    stateProvince: m.StateProvince || null,
                    principalFirstName: m.PrincipalFirstName || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'opensky': {
            const data = await safeFetchJson('https://opensky-network.org/api/states/all?lamin=30.0&lomin=-125.0&lamax=49.0&lomax=-66.0');
            const states = data?.states || [];
            if (states.length > 0) {
                return states.slice(0, maxItems).map((s) => ({
                    target: q,
                    icao24: s[0],
                    callsign: String(s[1] || '').trim(),
                    originCountry: s[2],
                    longitude: s[5],
                    latitude: s[6],
                    baroAltitudeMeters: s[7],
                    velocityMetersPerSec: s[9],
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'rubygems': {
            const data = await safeFetchJson(`https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(q)}`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((g) => ({
                    target: q,
                    name: g.name,
                    version: g.version,
                    downloads: g.downloads,
                    authors: g.authors,
                    licenses: g.licenses || [],
                    sourceCodeUri: g.source_code_uri || g.homepage_uri || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'packagist': {
            const data = await safeFetchJson(`https://packagist.org/search.json?q=${encodeURIComponent(q)}&per_page=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((p) => ({
                    target: q,
                    name: p.name,
                    description: p.description,
                    downloads: p.downloads,
                    favers: p.favers,
                    repository: p.repository,
                    url: p.url,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'nuget': {
            const data = await safeFetchJson(`https://azuresearch-usnc.nuget.org/query?q=${encodeURIComponent(q)}&take=${Math.min(maxItems, 15)}`);
            const rows = data?.data || [];
            if (rows.length > 0) {
                return rows.map((p) => ({
                    target: q,
                    id: p.id,
                    version: p.version,
                    totalDownloads: p.totalDownloads,
                    verified: Boolean(p.verified),
                    authors: p.authors || [],
                    projectUrl: p.projectUrl || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'hexpm': {
            const data = await safeFetchJson(`https://hex.pm/api/packages?search=${encodeURIComponent(q)}&sort=recent_downloads`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((p) => ({
                    target: q,
                    name: p.name,
                    latestVersion: p.latest_version,
                    allDownloads: p.downloads?.all || 0,
                    recentDownloads: p.downloads?.recent || 0,
                    licenses: p.meta?.licenses || [],
                    links: p.meta?.links || {},
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'pubdev': {
            const data = await safeFetchJson(`https://pub.dev/api/search?q=${encodeURIComponent(q)}`);
            const pkgs = data?.packages || [];
            if (pkgs.length > 0) {
                return pkgs.slice(0, maxItems).map((p) => ({
                    target: q,
                    packageName: p.package,
                    pubDevUrl: `https://pub.dev/packages/${p.package}`,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'orcid': {
            const data = await safeFetchJson(`https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(q)}&rows=${Math.min(maxItems, 15)}`, {
                headers: { Accept: 'application/json' },
            });
            const res = data?.['expanded-result'] || [];
            if (res.length > 0) {
                return res.map((r) => ({
                    target: q,
                    orcidId: r['orcid-id'],
                    givenNames: r['given-names'] || null,
                    familyNames: r['family-names'] || null,
                    institutionNames: r['institution-name'] || [],
                    profileUrl: `https://orcid.org/${r['orcid-id']}`,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'ror': {
            const data = await safeFetchJson(`https://api.ror.org/organizations?query=${encodeURIComponent(q)}`);
            const items = data?.items || [];
            if (items.length > 0) {
                return items.slice(0, maxItems).map((o) => ({
                    target: q,
                    rorId: o.id,
                    name: o.name || o.names?.[0]?.value || null,
                    country: o.country?.country_name || o.locations?.[0]?.geonames_details?.country_name || null,
                    types: o.types || [],
                    links: o.links || [],
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'doaj': {
            const data = await safeFetchJson(`https://doaj.org/api/search/journals/${encodeURIComponent(q)}?pageSize=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((j) => ({
                    target: q,
                    title: j.bibjson?.title,
                    publisher: j.bibjson?.publisher?.name || null,
                    country: j.bibjson?.publisher?.country || null,
                    eissn: j.bibjson?.eissn || null,
                    pissn: j.bibjson?.pissn || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'zenodo': {
            const data = await safeFetchJson(`https://zenodo.org/api/records?q=${encodeURIComponent(q)}&size=${Math.min(maxItems, 15)}`);
            const hits = data?.hits?.hits || [];
            if (hits.length > 0) {
                return hits.map((h) => ({
                    target: q,
                    id: h.id,
                    doi: h.doi,
                    title: h.metadata?.title || h.title,
                    publicationDate: h.metadata?.publication_date || null,
                    resourceType: h.metadata?.resource_type?.type || null,
                    creators: (h.metadata?.creators || []).map((c) => c.name),
                    url: h.links?.self_html || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'hal': {
            const data = await safeFetchJson(`https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(q)}&wt=json&rows=${Math.min(maxItems, 15)}`);
            const docs = data?.response?.docs || [];
            if (docs.length > 0) {
                return docs.map((d) => ({
                    target: q,
                    docid: d.docid,
                    label: d.label_s,
                    uri: d.uri_s,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'pubchem': {
            const data = await safeFetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,XLogP/JSON`);
            const props = data?.PropertyTable?.Properties || [];
            if (props.length > 0) {
                return props.slice(0, maxItems).map((p) => ({
                    target: q,
                    cid: p.CID,
                    molecularFormula: p.MolecularFormula,
                    molecularWeight: p.MolecularWeight,
                    canonicalSmiles: p.CanonicalSMILES,
                    inChIKey: p.InChIKey,
                    xLogP: p.XLogP ?? null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'chembl': {
            const data = await safeFetchJson(`https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const mols = data?.molecules || [];
            if (mols.length > 0) {
                return mols.map((m) => ({
                    target: q,
                    chemblId: m.molecule_chembl_id,
                    prefName: m.pref_name || null,
                    maxPhase: m.max_phase,
                    moleculeType: m.molecule_type,
                    firstApproval: m.first_approval || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'uniprot': {
            const data = await safeFetchJson(`https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(q)}&format=json&size=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((u) => ({
                    target: q,
                    primaryAccession: u.primaryAccession,
                    uniProtkbId: u.uniProtkbId,
                    organism: u.organism?.scientificName || null,
                    sequenceLength: u.sequence?.length || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'fdfaers': {
            const data = await safeFetchJson(`https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    safetyReportId: r.safetyreportid,
                    receiveDate: r.receivedate,
                    serious: Boolean(Number(r.serious)),
                    reactions: (r.patient?.reaction || []).map((rx) => rx.reactionmeddrapt).slice(0, 8),
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'fdafood': {
            const data = await safeFetchJson(`https://api.fda.gov/food/enforcement.json?search=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((r) => ({
                    target: q,
                    recallNumber: r.recall_number,
                    recallingFirm: r.recalling_firm,
                    classification: r.classification,
                    status: r.status,
                    city: r.city,
                    state: r.state,
                    reasonForRecall: r.reason_for_recall,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'stablecoins': {
            const data = await safeFetchJson('https://stablecoins.llama.fi/stablecoins?includePrices=true');
            const assets = data?.peggedAssets || [];
            if (assets.length > 0) {
                const filtered = assets.filter((a) => String(a.symbol || '').toLowerCase() === q.toLowerCase() || q.toLowerCase() === 'all');
                const list = (filtered.length > 0 ? filtered : assets).slice(0, maxItems);
                return list.map((a) => ({
                    target: q,
                    name: a.name,
                    symbol: a.symbol,
                    pegType: a.pegType,
                    pegMechanism: a.pegMechanism,
                    price: a.price,
                    circulatingUsd: a.circulating?.peggedUSD || 0,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'llamadexs': {
            const data = await safeFetchJson('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true');
            const protos = data?.protocols || [];
            if (protos.length > 0) {
                const filtered = protos.filter((p) => String(p.name || '').toLowerCase().includes(q.toLowerCase()));
                return (filtered.length > 0 ? filtered : protos).slice(0, maxItems).map((p) => ({
                    target: q,
                    name: p.name,
                    total24hUsd: p.total24h || 0,
                    total7dUsd: p.total7d || 0,
                    change1dPct: p.change_1d || 0,
                    chains: (p.chains || []).slice(0, 6),
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'llamafees': {
            const data = await safeFetchJson('https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true');
            const protos = data?.protocols || [];
            if (protos.length > 0) {
                const filtered = protos.filter((p) => String(p.name || '').toLowerCase().includes(q.toLowerCase()));
                return (filtered.length > 0 ? filtered : protos).slice(0, maxItems).map((p) => ({
                    target: q,
                    name: p.name,
                    fees24hUsd: p.total24h || 0,
                    revenue24hUsd: p.revenue24h || 0,
                    fees7dUsd: p.total7d || 0,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'mempool': {
            const fees = await safeFetchJson('https://mempool.space/api/v1/fees/recommended');
            const height = await safeFetchText('https://mempool.space/api/blocks/tip/height');
            if (fees) {
                return [{
                    target: q,
                    fastestFeeSatVb: fees.fastestFee,
                    halfHourFeeSatVb: fees.halfHourFee,
                    hourFeeSatVb: fees.hourFee,
                    economyFeeSatVb: fees.economyFee,
                    tipBlockHeight: Number(height) || null,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'feargreed': {
            const data = await safeFetchJson(`https://api.alternative.me/fng/?limit=${Math.min(Number(q) || 7, 30)}`);
            const rows = data?.data || [];
            if (rows.length > 0) {
                return rows.map((r) => ({
                    target: q,
                    value: Number(r.value),
                    classification: r.value_classification,
                    timestamp: r.timestamp,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'statuspage': {
            const base = /^https?:\/\//i.test(q) ? q.replace(/\/$/, '') : `https://${cleanDomain}`;
            const data = await safeFetchJson(`${base}/api/v2/summary.json`);
            if (data && data.page) {
                return [{
                    target: base,
                    pageName: data.page.name,
                    statusIndicator: data.status?.indicator || 'none',
                    statusDescription: data.status?.description || null,
                    componentsCount: (data.components || []).length,
                    activeIncidentsCount: (data.incidents || []).length,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'robotstxt': {
            const txt = await safeFetchText(`https://${cleanDomain}/robots.txt`);
            const sitemaps = [...txt.matchAll(/^Sitemap:\s*(.+)$/gim)].map((m) => m[1].trim());
            const disallows = [...txt.matchAll(/^Disallow:\s*(.+)$/gim)].map((m) => m[1].trim()).slice(0, 25);
            return [{
                target: cleanDomain,
                hasRobotsTxt: txt.length > 0,
                sitemaps,
                disallowRulesCount: disallows.length,
                disallowSample: disallows,
                extractedAt: now,
            }];
        }
        case 'adstxt': {
            const txt = await safeFetchText(`https://${cleanDomain}/ads.txt`);
            const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes(','));
            const directCount = lines.filter((l) => /\bDIRECT\b/i.test(l)).length;
            const resellerCount = lines.filter((l) => /\bRESELLER\b/i.test(l)).length;
            const exchanges = [...new Set(lines.map((l) => l.split(',')[0].trim().toLowerCase()))].slice(0, 20);
            return [{
                target: cleanDomain,
                hasAdsTxt: lines.length > 0,
                totalAuthorizedSellers: lines.length,
                directSellersCount: directCount,
                resellerCount,
                topAdExchanges: exchanges,
                extractedAt: now,
            }];
        }
        case 'wellknownapp': {
            const ios = await safeFetchJson(`https://${cleanDomain}/.well-known/apple-app-site-association`);
            const android = await safeFetchJson(`https://${cleanDomain}/.well-known/assetlinks.json`);
            return [{
                target: cleanDomain,
                hasAppleUniversalLinks: Boolean(ios),
                hasAndroidAssetLinks: Array.isArray(android) && android.length > 0,
                androidPackages: Array.isArray(android) ? android.map((a) => a.target?.package_name).filter(Boolean) : [],
                extractedAt: now,
            }];
        }
        case 'opengraph': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const $ = cheerio.load(html);
                return [{
                    target: url,
                    ogTitle: $('meta[property="og:title"]').attr('content') || $('title').first().text().trim() || null,
                    ogDescription: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null,
                    ogImage: $('meta[property="og:image"]').attr('content') || null,
                    twitterCard: $('meta[name="twitter:card"]').attr('content') || null,
                    canonical: $('link[rel="canonical"]').attr('href') || null,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'linkgraph': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const $ = cheerio.load(html);
                let internal = 0;
                let external = 0;
                let nofollow = 0;
                $('a[href]').each((_, el) => {
                    const href = String($(el).attr('href') || '');
                    const rel = String($(el).attr('rel') || '').toLowerCase();
                    if (rel.includes('nofollow')) nofollow++;
                    if (href.startsWith('/') || href.includes(cleanDomain)) internal++;
                    else if (href.startsWith('http')) external++;
                });
                return [{
                    target: url,
                    internalLinksCount: internal,
                    externalLinksCount: external,
                    nofollowLinksCount: nofollow,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'spfdmarc': {
            const txtRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=TXT`);
            const dmarcRes = await safeFetchJson(`https://dns.google/resolve?name=_dmarc.${encodeURIComponent(cleanDomain)}&type=TXT`);
            const mxRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=MX`);
            const txts = (txtRes?.Answer || []).map((a) => String(a.data || '').replace(/^"|"$/g, ''));
            const dmarcs = (dmarcRes?.Answer || []).map((a) => String(a.data || '').replace(/^"|"$/g, ''));
            const mxs = (mxRes?.Answer || []).map((a) => a.data);
            return [{
                target: cleanDomain,
                spfRecord: txts.find((t) => t.toLowerCase().startsWith('v=spf1')) || null,
                dmarcRecord: dmarcs.find((t) => t.toLowerCase().startsWith('v=dmarc1')) || null,
                mxRecords: mxs,
                extractedAt: now,
            }];
        }
        case 'dnszone': {
            const nsRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=NS`);
            const caaRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CAA`);
            const aRes = await safeFetchJson(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`);
            return [{
                target: cleanDomain,
                nameservers: (nsRes?.Answer || []).map((a) => a.data),
                caaRecords: (caaRes?.Answer || []).map((a) => a.data),
                ipv4Addresses: (aRes?.Answer || []).map((a) => a.data),
                extractedAt: now,
            }];
        }
        case 'httpheaders': {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            try {
                const res = await fetch(`https://${cleanDomain}`, { method: 'HEAD', signal: controller.signal, headers: { 'User-Agent': BROWSER_UA } });
                return [{
                    target: cleanDomain,
                    statusCode: res.status,
                    strictTransportSecurity: res.headers.get('strict-transport-security'),
                    contentSecurityPolicy: Boolean(res.headers.get('content-security-policy')),
                    xFrameOptions: res.headers.get('x-frame-options'),
                    xContentTypeOptions: res.headers.get('x-content-type-options'),
                    server: res.headers.get('server'),
                    extractedAt: now,
                }];
            } catch {} finally {
                clearTimeout(timer);
            }
            break;
        }
        case 'cisakev': {
            const data = await safeFetchJson('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
            const vulns = data?.vulnerabilities || [];
            if (vulns.length > 0) {
                const filtered = vulns.filter((v) =>
                    String(v.vendorProject || '').toLowerCase().includes(q.toLowerCase()) ||
                    String(v.product || '').toLowerCase().includes(q.toLowerCase())
                );
                return (filtered.length > 0 ? filtered : vulns).slice(0, maxItems).map((v) => ({
                    target: q,
                    cveID: v.cveID,
                    vendorProject: v.vendorProject,
                    product: v.product,
                    vulnerabilityName: v.vulnerabilityName,
                    dateAdded: v.dateAdded,
                    dueDate: v.dueDate,
                    knownRansomwareCampaignUse: v.knownRansomwareCampaignUse,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'osvdev': {
            const data = await safeFetchJson('https://api.osv.dev/v1/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package: { name: q, ecosystem: 'npm' } }),
            });
            const vulns = data?.vulns || [];
            if (vulns.length > 0) {
                return vulns.slice(0, maxItems).map((v) => ({
                    target: q,
                    id: v.id,
                    summary: v.summary || null,
                    modified: v.modified,
                    published: v.published,
                    aliases: v.aliases || [],
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'recruitee': {
            const data = await safeFetchJson(`https://${encodeURIComponent(q.toLowerCase())}.recruitee.com/api/offers`);
            const offers = data?.offers || [];
            if (offers.length > 0) {
                return offers.slice(0, maxItems).map((o) => ({
                    target: q,
                    title: o.title,
                    department: o.department || null,
                    city: o.city || null,
                    country: o.country || null,
                    remote: Boolean(o.remote),
                    careersUrl: o.careers_url || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'hnhiring': {
            const data = await safeFetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=comment&hitsPerPage=${Math.min(maxItems, 15)}`);
            const hits = data?.hits || [];
            if (hits.length > 0) {
                return hits.map((h) => ({
                    target: q,
                    author: h.author,
                    createdAt: h.created_at,
                    storyTitle: h.story_title || null,
                    commentSnippet: String(h.comment_text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350),
                    hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'arbeitnow': {
            const data = await safeFetchJson('https://www.arbeitnow.com/api/job-board-api');
            const jobs = data?.data || [];
            if (jobs.length > 0) {
                return jobs.slice(0, maxItems).map((j) => ({
                    target: q,
                    title: j.title,
                    companyName: j.company_name,
                    location: j.location,
                    remote: Boolean(j.remote),
                    url: j.url,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'musicbrainz': {
            const data = await safeFetchJson(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&fmt=json&limit=${Math.min(maxItems, 15)}`, {
                headers: { 'User-Agent': 'EnterpriseMusicMetadataBot/1.0 (music@apify.com)' },
            });
            const artists = data?.artists || [];
            if (artists.length > 0) {
                return artists.map((a) => ({
                    target: q,
                    mbid: a.id,
                    name: a.name,
                    type: a.type || null,
                    country: a.country || null,
                    disambiguation: a.disambiguation || null,
                    score: a.score,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'tvmaze': {
            const data = await safeFetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((s) => ({
                    target: q,
                    id: s.show?.id,
                    name: s.show?.name,
                    status: s.show?.status,
                    premiered: s.show?.premiered,
                    rating: s.show?.rating?.average || null,
                    network: s.show?.network?.name || s.show?.webChannel?.name || null,
                    imdbId: s.show?.externals?.imdb || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'itunesmusic': {
            const data = await safeFetchJson(`https://itunes.apple.com/search?media=music&term=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((t) => ({
                    target: q,
                    trackId: t.trackId,
                    trackName: t.trackName,
                    artistName: t.artistName,
                    collectionName: t.collectionName,
                    primaryGenreName: t.primaryGenreName,
                    releaseDate: t.releaseDate,
                    previewUrl: t.previewUrl || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'itunesmac': {
            const data = await safeFetchJson(`https://itunes.apple.com/search?entity=macSoftware&term=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((a) => ({
                    target: q,
                    trackId: a.trackId,
                    appName: a.trackName,
                    sellerName: a.sellerName,
                    price: a.price || 0,
                    averageUserRating: a.averageUserRating || null,
                    version: a.version,
                    bundleId: a.bundleId,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'wikipageviews': {
            const data = await safeFetchJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(q.replace(/\s+/g, '_'))}/daily/2025010100/2025011000`);
            const items = data?.items || [];
            if (items.length > 0) {
                return items.slice(0, maxItems).map((i) => ({
                    target: q,
                    article: i.article,
                    timestamp: i.timestamp,
                    views: i.views,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'peeringdb': {
            const data = await safeFetchJson(`https://www.peeringdb.com/api/net?name__contains=${encodeURIComponent(q)}&limit=${Math.min(maxItems, 15)}`);
            const rows = data?.data || [];
            if (rows.length > 0) {
                return rows.map((n) => ({
                    target: q,
                    id: n.id,
                    name: n.name,
                    asn: n.asn,
                    infoType: n.info_type,
                    infoTraffic: n.info_traffic || null,
                    policyGeneral: n.policy_general || null,
                    website: n.website || null,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'ripestat': {
            const data = await safeFetchJson(`https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(q)}`);
            if (data?.data) {
                return [{
                    target: q,
                    prefix: data.data.prefix || null,
                    asns: data.data.asns || [],
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'ripeasn': {
            const data = await safeFetchJson(`https://stat.ripe.net/data/asn-neighbours/data.json?resource=${encodeURIComponent(q)}`);
            const neighbours = data?.data?.neighbours || [];
            if (neighbours.length > 0) {
                return neighbours.slice(0, maxItems).map((n) => ({
                    target: q,
                    neighbourAsn: n.asn,
                    type: n.type,
                    power: n.power,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'cdnjs': {
            const data = await safeFetchJson(`https://api.cdnjs.com/libraries?search=${encodeURIComponent(q)}&fields=version,description,homepage,repository,license&limit=${Math.min(maxItems, 15)}`);
            const results = data?.results || [];
            if (results.length > 0) {
                return results.map((l) => ({
                    target: q,
                    name: l.name,
                    version: l.version,
                    license: l.license || null,
                    homepage: l.homepage || null,
                    repositoryUrl: l.repository?.url || null,
                    cdnUrl: l.latest,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'homebrew': {
            const data = await safeFetchJson(`https://formulae.brew.sh/api/formula/${encodeURIComponent(q.toLowerCase())}.json`);
            if (data && data.name) {
                return [{
                    target: q,
                    name: data.name,
                    fullName: data.full_name,
                    description: data.desc,
                    homepage: data.homepage,
                    license: data.license,
                    version: data.versions?.stable || null,
                    installs30d: Object.values(data.analytics?.install?.['30d'] || {})[0] || 0,
                    installs365d: Object.values(data.analytics?.install?.['365d'] || {})[0] || 0,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'usgs': {
            const minMag = Number(q) || 4.5;
            const data = await safeFetchJson(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=${minMag}&limit=${Math.min(maxItems, 15)}`);
            const features = data?.features || [];
            if (features.length > 0) {
                return features.map((f) => ({
                    target: q,
                    id: f.id,
                    magnitude: f.properties?.mag,
                    place: f.properties?.place,
                    time: f.properties?.time ? new Date(f.properties.time).toISOString() : null,
                    tsunami: Boolean(f.properties?.tsunami),
                    coordinates: f.geometry?.coordinates || [],
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'openmeteo': {
            const [latStr, lonStr] = q.split(',');
            const lat = Number(latStr) || 52.52;
            const lon = Number(lonStr) || 13.41;
            const data = await safeFetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            if (data?.current_weather) {
                return [{
                    target: q,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    temperatureC: data.current_weather.temperature,
                    windspeedKmh: data.current_weather.windspeed,
                    winddirection: data.current_weather.winddirection,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'noaaalerts': {
            const data = await safeFetchJson(`https://api.weather.gov/alerts/active?area=${encodeURIComponent(q.toUpperCase())}`, {
                headers: { 'User-Agent': 'EnterpriseWeatherRiskBot/1.0 (weather@apify.com)' },
            });
            const features = data?.features || [];
            if (features.length > 0) {
                return features.slice(0, maxItems).map((f) => ({
                    target: q.toUpperCase(),
                    event: f.properties?.event,
                    severity: f.properties?.severity,
                    headline: f.properties?.headline,
                    areaDesc: f.properties?.areaDesc,
                    effective: f.properties?.effective,
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'airquality': {
            const [latStr, lonStr] = q.split(',');
            const lat = Number(latStr) || 51.5;
            const lon = Number(lonStr) || -0.12;
            const data = await safeFetchJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone`);
            if (data?.current) {
                return [{
                    target: q,
                    europeanAqi: data.current.european_aqi,
                    pm2_5: data.current.pm2_5,
                    pm10: data.current.pm10,
                    nitrogenDioxide: data.current.nitrogen_dioxide,
                    ozone: data.current.ozone,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'restcountries': {
            const data = await safeFetchJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}`);
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, maxItems).map((c) => ({
                    target: q,
                    commonName: c.name?.common,
                    officialName: c.name?.official,
                    cca2: c.cca2,
                    cca3: c.cca3,
                    capital: c.capital?.[0] || null,
                    region: c.region,
                    population: c.population,
                    currencies: Object.keys(c.currencies || {}),
                    extractedAt: now,
                }));
            }
            break;
        }
        case 'copyrightyear': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:20\d{2}\s*[-–]\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
                const latestYear = years.length > 0 ? Math.max(...years) : null;
                const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 8);
                return [{
                    target: cleanDomain,
                    detectedCopyrightYear: latestYear,
                    isOutdatedCopyright: latestYear !== null && latestYear < 2025,
                    emails,
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'funnelstack': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = (await safeFetchText(url)).toLowerCase();
            if (html) {
                return [{
                    target: cleanDomain,
                    hasCalendly: html.includes('calendly.com'),
                    hasHubSpot: html.includes('hs-scripts.com') || html.includes('hubspot'),
                    hasIntercom: html.includes('intercom'),
                    hasDrift: html.includes('drift.com') || html.includes('js.driftt.com'),
                    hasZendesk: html.includes('zdassets.com') || html.includes('zendesk'),
                    hasCrisp: html.includes('crisp.chat'),
                    extractedAt: now,
                }];
            }
            break;
        }
        case 'adpixels': {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = (await safeFetchText(url)).toLowerCase();
            if (html) {
                return [{
                    target: cleanDomain,
                    hasGoogleTagManager: html.includes('googletagmanager.com'),
                    hasMetaFacebookPixel: html.includes('connect.facebook.net') || html.includes('fbq('),
                    hasLinkedInInsightTag: html.includes('snap.licdn.com'),
                    hasTikTokPixel: html.includes('analytics.tiktok.com'),
                    hasHotjar: html.includes('static.hotjar.com'),
                    extractedAt: now,
                }];
            }
            break;
        }
        default: {
            const url = /^https?:\/\//i.test(q) ? q : `https://${cleanDomain}`;
            const html = await safeFetchText(url);
            if (html) {
                const $ = cheerio.load(html);
                const title = $('title').first().text().trim() || cleanDomain;
                const emails = [...new Set((html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 10);
                const phones = [...new Set(html.match(/\+?[1-9][0-9\s().-]{7,16}[0-9]/g) || [])].slice(0, 6);
                const socials = [];
                $('a[href]').each((_, el) => {
                    const h = String($(el).attr('href') || '');
                    if (/linkedin\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|facebook\.com/i.test(h)) {
                        socials.push(h);
                    }
                });
                return [{
                    target: cleanDomain,
                    url,
                    pageTitle: title,
                    emails,
                    phones,
                    socialLinks: [...new Set(socials)].slice(0, 12),
                    extractedAt: now,
                }];
            }
            break;
        }
    }

    return [{
        target: q,
        status: 'completed',
        mode: MODE,
        extractedAt: now,
    }];
}

async function run() {
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const targets = Array.isArray(input[INPUT_PROP]) && input[INPUT_PROP].length > 0
            ? input[INPUT_PROP]
            : DEFAULT_LIST;
        const maxItems = Math.min(Math.max(Number(input.maxItemsPerTarget) || 10, 1), 100);

        for (const t of targets) {
            const items = await processTarget(t, maxItems);
            if (items && items.length > 0) {
                await Actor.pushData(items);
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: EVENT_NAME, count: items.length }); } catch {}
                }
            }
        }
        log.info('Extraction run completed successfully.');
    } finally {
        await Actor.exit();
    }
}

run();
