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


async function queryDoh(name, type) {
    try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
            headers: { 'Accept': 'application/dns-json' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.Answer) ? data.Answer.map((a) => String(a.data || '').replace(/^"|"$/g, '')) : [];
    } catch {
        return [];
    }
}

async function auditDomainSecurity(rawDomain) {
    const clean = String(rawDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
    if (!clean) return null;

    const [mxRecords, txtRecords, dmarcRecords, caaRecords] = await Promise.all([
        queryDoh(clean, 'MX'),
        queryDoh(clean, 'TXT'),
        queryDoh(`_dmarc.${clean}`, 'TXT'),
        queryDoh(clean, 'CAA'),
    ]);

    const spfRecord = txtRecords.find((t) => /v=spf1/i.test(t)) || null;
    const dmarcRecord = dmarcRecords.find((t) => /v=DMARC1/i.test(t)) || null;

    const mxJoined = mxRecords.join(' ').toLowerCase();
    let emailProvider = 'Custom / Unknown';
    if (mxJoined.includes('google') || mxJoined.includes('aspmx.l.google.com')) emailProvider = 'Google Workspace';
    else if (mxJoined.includes('outlook.com') || mxJoined.includes('protection.outlook.com')) emailProvider = 'Microsoft 365';
    else if (mxJoined.includes('pphosted.com')) emailProvider = 'Proofpoint';
    else if (mxJoined.includes('mimecast.com')) emailProvider = 'Mimecast';
    else if (mxJoined.includes('protonmail.ch')) emailProvider = 'ProtonMail';

    let headers = {};
    let statusCode = 0;
    try {
        const res = await fetch(`https://${clean}`, { method: 'GET', redirect: 'follow' });
        statusCode = res.status;
        res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    } catch {}

    let hasSecurityTxt = false;
    try {
        const secRes = await fetch(`https://${clean}/.well-known/security.txt`);
        if (secRes.ok) {
            const secText = await secRes.text();
            hasSecurityTxt = /Contact:/i.test(secText);
        }
    } catch {}

    const findings = [];
    let score = 100;

    if (!spfRecord) { findings.push('HIGH: Missing SPF DNS record (email spoofing risk)'); score -= 20; }
    if (!dmarcRecord) { findings.push('HIGH: Missing DMARC policy record (_dmarc)'); score -= 20; }
    else if (/p=none/i.test(dmarcRecord)) { findings.push('MEDIUM: DMARC policy is set to p=none (monitoring only, not enforcing)'); score -= 10; }
    if (caaRecords.length === 0) { findings.push('LOW: No DNS CAA record restricting SSL certificate authorities'); score -= 5; }

    const hasHsts = Boolean(headers['strict-transport-security']);
    const hasCsp = Boolean(headers['content-security-policy']);
    const hasXfo = Boolean(headers['x-frame-options']);
    const hasXcto = Boolean(headers['x-content-type-options']);

    if (!hasHsts) { findings.push('MEDIUM: Missing Strict-Transport-Security (HSTS) header'); score -= 12; }
    if (!hasCsp) { findings.push('MEDIUM: Missing Content-Security-Policy (CSP) header'); score -= 12; }
    if (!hasXfo && !/frame-ancestors/i.test(headers['content-security-policy'] || '')) {
        findings.push('LOW: Missing clickjacking protection (X-Frame-Options / frame-ancestors)');
        score -= 8;
    }
    if (!hasXcto) { findings.push('LOW: Missing X-Content-Type-Options: nosniff header'); score -= 5; }
    if (headers['x-powered-by']) {
        findings.push(`LOW: Information disclosure via X-Powered-By header (${headers['x-powered-by']})`);
        score -= 5;
    }

    return {
        domain: clean,
        httpStatusCode: statusCode,
        securityScore: Math.max(0, score),
        emailProvider,
        hasSpf: Boolean(spfRecord),
        spfRecord,
        hasDmarc: Boolean(dmarcRecord),
        dmarcRecord,
        hasCaa: caaRecords.length > 0,
        hasHsts,
        hasCsp,
        hasXFrameOptions: hasXfo,
        hasXContentTypeOptions: hasXcto,
        hasSecurityTxt,
        serverHeader: headers['server'] || null,
        mxRecords,
        vulnerabilities: findings,
        auditedAt: new Date().toISOString(),
    };
}

async function run() {
    if (process.argv.includes('--demo')) {
        const item = await auditDomainSecurity('news.ycombinator.com');
        console.log(JSON.stringify(item, null, 2));
        return;
    }
    await Actor.init();
    try {
        const input = (await Actor.getInput()) || {};
        const domains = Array.isArray(input.domains) && input.domains.length ? input.domains : ['cloudflare.com'];
        for (const d of domains) {
            const report = await auditDomainSecurity(d);
            if (report) {
                await Actor.pushData(__wrapPushData(report));
                if (typeof Actor.charge === 'function') {
                    try { await Actor.charge({ eventName: 'domain-security-audited', count: 1 }); } catch {}
                }
            }
        }
    } finally {
        await Actor.exit();
    }
}
run();
