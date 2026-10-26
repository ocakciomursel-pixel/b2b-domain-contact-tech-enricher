#!/usr/bin/env node
'use strict';

const TECH_SIGNATURES = [
  { name: 'Next.js', category: 'framework', pattern: /_next\/static|__NEXT_DATA__/i },
  { name: 'Nuxt.js', category: 'framework', pattern: /_nuxt\/|__NUXT__/i },
  { name: 'React', category: 'framework', pattern: /react-dom|data-reactroot|__REACT/i },
  { name: 'Vue.js', category: 'framework', pattern: /data-v-[a-f0-9]{6}|vue\.runtime/i },
  { name: 'Svelte', category: 'framework', pattern: /svelte-[a-z0-9]{5,}|__svelte/i },
  { name: 'Angular', category: 'framework', pattern: /ng-version=|ng-app=/i },
  { name: 'Webflow', category: 'cms', pattern: /data-wf-site|webflow\.js/i },
  { name: 'Framer', category: 'cms', pattern: /framerusercontent\.com|data-framer-/i },
  { name: 'WordPress', category: 'cms', pattern: /wp-content\/|wp-includes\//i },
  { name: 'Shopify', category: 'ecommerce', pattern: /cdn\.shopify\.com|Shopify\.theme/i },
  { name: 'WooCommerce', category: 'ecommerce', pattern: /woocommerce|wc-api/i },
  { name: 'HubSpot', category: 'crm', spendWeight: 3, pattern: /js\.hs-scripts\.com|hs-analytics|hubspot\.com|hbspt\.forms/i },
  { name: 'Salesforce / Pardot', category: 'crm', spendWeight: 4, pattern: /pardot\.com|salesforce\.com|sfdc/i },
  { name: 'Marketo', category: 'crm', spendWeight: 4, pattern: /munchkin\.js|marketo\.com|mktoForms/i },
  { name: 'Intercom', category: 'support', spendWeight: 3, pattern: /widget\.intercom\.io|intercomSettings/i },
  { name: 'Drift', category: 'support', spendWeight: 3, pattern: /js\.driftt\.com|drift\.load/i },
  { name: 'Zendesk', category: 'support', spendWeight: 2, pattern: /zdassets\.com|zendesk\.com/i },
  { name: 'Crisp Chat', category: 'support', spendWeight: 1, pattern: /client\.crisp\.chat/i },
  { name: 'Klaviyo', category: 'marketing', spendWeight: 2, pattern: /static\.klaviyo\.com|_learnq/i },
  { name: 'Stripe', category: 'payments', spendWeight: 2, pattern: /js\.stripe\.com|stripe\.com\/v3/i },
  { name: 'Klarna', category: 'payments', spendWeight: 2, pattern: /klarna\.com|klarnaservices/i },
  { name: 'Calendly', category: 'sales', spendWeight: 1, pattern: /assets\.calendly\.com|calendly\.com/i },
  { name: 'Chili Piper', category: 'sales', spendWeight: 3, pattern: /chilipiper\.com/i },
  { name: 'Meta Pixel', category: 'ads', spendWeight: 2, isAdPixel: true, pattern: /connect\.facebook\.net\/.*\/fbevents\.js|fbq\(['"]init/i },
  { name: 'TikTok Pixel', category: 'ads', spendWeight: 2, isAdPixel: true, pattern: /analytics\.tiktok\.com\/i18n\/pixel/i },
  { name: 'LinkedIn Insight Tag', category: 'ads', spendWeight: 3, isAdPixel: true, pattern: /snap\.licdn\.com\/li\.lms-analytics|_linkedin_partner_id/i },
  { name: 'Google Ads Conversion', category: 'ads', spendWeight: 2, isAdPixel: true, pattern: /googleadservices\.com\/pagead\/conversion|AW-\d{6,}/i },
  { name: 'X / Twitter Pixel', category: 'ads', spendWeight: 2, isAdPixel: true, pattern: /static\.ads-twitter\.com\/uwt\.js/i },
  { name: 'Google Tag Manager', category: 'analytics', spendWeight: 1, pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/i },
  { name: 'Google Analytics 4', category: 'analytics', spendWeight: 1, pattern: /googletagmanager\.com\/gtag\/js|G-[A-Z0-9]{6,}|google-analytics\.com/i },
  { name: 'Segment', category: 'analytics', spendWeight: 3, pattern: /cdn\.segment\.com\/analytics\.js/i },
  { name: 'Mixpanel', category: 'analytics', spendWeight: 2, pattern: /cdn\.mxpnl\.com|mixpanel\.init/i },
  { name: 'Amplitude', category: 'analytics', spendWeight: 3, pattern: /cdn\.amplitude\.com|amplitude\.getInstance/i },
  { name: 'PostHog', category: 'analytics', spendWeight: 2, pattern: /posthog\.com|posthog\.init/i },
  { name: 'Hotjar', category: 'analytics', spendWeight: 1, pattern: /static\.hotjar\.com|hjSettings/i },
  { name: 'Microsoft Clarity', category: 'analytics', pattern: /clarity\.ms\/tag/i },
  { name: 'Sentry', category: 'monitoring', spendWeight: 2, pattern: /browser\.sentry-cdn\.com|Sentry\.init/i },
  { name: 'Datadog RUM', category: 'monitoring', spendWeight: 4, pattern: /datadoghq-browser-agent|DD_RUM/i },
  { name: 'Cloudflare', category: 'infra', pattern: /challenges\.cloudflare\.com|cloudflareinsights\.com|__cf_bm/i },
  { name: 'Vercel', category: 'infra', pattern: /x-vercel-id|vercel\.app/i },
  { name: 'Tailwind CSS', category: 'ui', pattern: /tailwindcss|--tw-ring-offset-shadow/i },
];

const DISPOSABLE_EMAIL_SUFFIXES = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css', '.woff', '.woff2',
  'example.com', 'domain.com', 'email.com', 'yoursite.com', 'sentry.io', 'wixpress.com',
];

function normalizeBaseUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

function extractEmails(text) {
  const decoded = text
    .replace(/mailto:/gi, ' ')
    .replace(/\s*\[at\]\s*|\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*|\s*\(dot\)\s*/gi, '.');
  const matches = decoded.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/g) || [];
  const clean = new Set();
  for (const raw of matches) {
    const email = raw.toLowerCase().replace(/[.,;:)>\]]+$/, '');
    if (email.length > 80 || email.startsWith('u00') || /^\d/.test(email)) continue;
    if (DISPOSABLE_EMAIL_SUFFIXES.some((s) => email.endsWith(s))) continue;
    clean.add(email);
  }
  return Array.from(clean);
}

function extractPhones(text) {
  const telLinks = Array.from(text.matchAll(/href=["']tel:([^"']+)["']/gi)).map((m) => m[1].trim());
  const inlineMatches = text.match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) || [];
  const all = new Set();
  for (const raw of [...telLinks, ...inlineMatches]) {
    const cleaned = raw.replace(/[^\d+()-.\s]/g, '').trim();
    const digitCount = (cleaned.match(/\d/g) || []).length;
    if (digitCount >= 10 && digitCount <= 15) {
      all.add(cleaned);
    }
  }
  return Array.from(all).slice(0, 10);
}

function extractSocialLinks(html) {
  const socials = {
    linkedin: null,
    twitter: null,
    github: null,
    youtube: null,
    instagram: null,
    facebook: null,
  };
  const hrefs = Array.from(html.matchAll(/href=["'](https?:\/\/[^"'\s>]+)["']/gi)).map((m) => m[1]);
  for (const href of hrefs) {
    const lower = href.toLowerCase();
    if (!socials.linkedin && lower.includes('linkedin.com/company/')) socials.linkedin = href;
    else if (!socials.linkedin && lower.includes('linkedin.com/in/')) socials.linkedin = href;
    if (!socials.twitter && (lower.includes('twitter.com/') || lower.includes('x.com/')) && !lower.includes('/intent/') && !lower.includes('/share')) {
      socials.twitter = href;
    }
    if (!socials.github && /github\.com\/[a-z0-9_.-]+\/?$/i.test(href) && !lower.includes('github.com/features') && !lower.includes('github.com/topics')) {
      socials.github = href;
    }
    if (!socials.youtube && (lower.includes('youtube.com/@') || lower.includes('youtube.com/c/') || lower.includes('youtube.com/channel/'))) {
      socials.youtube = href;
    }
    if (!socials.instagram && lower.includes('instagram.com/')) socials.instagram = href;
    if (!socials.facebook && lower.includes('facebook.com/') && !lower.includes('sharer')) socials.facebook = href;
  }
  return socials;
}

function extractMetaAndJsonLd(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i);

  let orgSchema = null;
  const jsonLdBlocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      for (const item of items) {
        if (item && /Organization|Corporation|LocalBusiness|SoftwareApplication|WebSite/i.test(String(item['@type'] || ''))) {
          orgSchema = {
            name: item.name || null,
            legalName: item.legalName || null,
            foundingDate: item.foundingDate || null,
            email: item.email || null,
            telephone: item.telephone || null,
            sameAs: Array.isArray(item.sameAs) ? item.sameAs : null,
          };
          if (/Organization|Corporation/i.test(String(item['@type'] || ''))) break;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  return {
    title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null,
    description: descMatch ? descMatch[1].replace(/\s+/g, ' ').trim() : null,
    companyName:
      (orgSchema && orgSchema.name) ||
      (siteNameMatch ? siteNameMatch[1].trim() : null) ||
      (titleMatch ? titleMatch[1].split(/[|\-–—:]/)[0].trim() : null),
    jsonLdOrganization: orgSchema,
  };
}

function detectTechAndPixels(html, headers) {
  const techStack = new Set();
  const adPixels = new Set();
  let spendScore = 0;
  const combined = `${html}\n${JSON.stringify(headers || {})}`;
  for (const sig of TECH_SIGNATURES) {
    if (sig.pattern.test(combined)) {
      techStack.add(sig.name);
      if (sig.isAdPixel) adPixels.add(sig.name);
      if (sig.spendWeight) spendScore += sig.spendWeight;
    }
  }
  return {
    techStack: Array.from(techStack),
    adPixels: Array.from(adPixels),
    spendScore,
  };
}

async function queryDns(name, type = 'TXT') {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.Answer) ? data.Answer.map((a) => String(a.data || '').replace(/^"|"$/g, '')) : [];
  } catch {
    return [];
  }
}

async function resolveEmailInfrastructure(hostname) {
  const rootDomain = hostname.replace(/^www\./i, '');
  const [mxRecords, txtRecords, dmarcRecords] = await Promise.all([
    queryDns(rootDomain, 'MX'),
    queryDns(rootDomain, 'TXT'),
    queryDns(`_dmarc.${rootDomain}`, 'TXT'),
  ]);

  const mxJoined = mxRecords.join(' ').toLowerCase();
  const txtJoined = txtRecords.join(' ').toLowerCase();
  let emailProvider = 'Custom / Unknown';
  if (mxJoined.includes('google.com') || mxJoined.includes('googlemail.com') || txtJoined.includes('_spf.google.com')) {
    emailProvider = 'Google Workspace';
  } else if (mxJoined.includes('outlook.com') || txtJoined.includes('spf.protection.outlook.com')) {
    emailProvider = 'Microsoft 365';
  } else if (mxJoined.includes('pphosted.com')) {
    emailProvider = 'Proofpoint Enterprise';
  } else if (mxJoined.includes('mimecast.com')) {
    emailProvider = 'Mimecast Enterprise';
  } else if (mxJoined.includes('cloudflare.net')) {
    emailProvider = 'Cloudflare Email Routing';
  } else if (mxJoined.includes('zoho.com')) {
    emailProvider = 'Zoho Mail';
  } else if (mxJoined.includes('protonmail.ch')) {
    emailProvider = 'ProtonMail';
  } else if (mxJoined.includes('amazonses.com')) {
    emailProvider = 'Amazon SES';
  }

  const hasSpf = txtRecords.some((r) => /v=spf1/i.test(r));
  const hasDmarc = dmarcRecords.some((r) => /v=DMARC1/i.test(r));

  return {
    emailProvider,
    hasSpf,
    hasDmarc,
    mxRecords: mxRecords.slice(0, 5),
  };
}

function discoverInternalLinks(html, baseUrl) {
  const parsedBase = new URL(baseUrl);
  const hrefs = Array.from(html.matchAll(/href=["']([^"'\s>#]+)["']/gi)).map((m) => m[1]);
  const contactCandidates = [];
  let careersUrl = null;
  let pricingUrl = null;

  for (const href of hrefs) {
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname !== parsedBase.hostname) continue;
      const pathname = resolved.pathname.toLowerCase();
      if (!careersUrl && /\/(careers|jobs|join-us|work-with-us)\b/.test(pathname)) {
        careersUrl = resolved.href;
      }
      if (!pricingUrl && /\/(pricing|plans)\b/.test(pathname)) {
        pricingUrl = resolved.href;
      }
      if (/\/(contact|contact-us|about|about-us|impressum|legal|privacy|support|team|security)\b/.test(pathname)) {
        if (!contactCandidates.includes(resolved.href)) {
          contactCandidates.push(resolved.href);
        }
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return { contactCandidates, careersUrl, pricingUrl };
}

async function fetchPage(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    const headersObj = {};
    res.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    return { ok: res.ok, status: res.status, html, headers: headersObj, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, html: '', headers: {}, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function buildColdEmailIcebreaker({ companyName, domain, techStack, careersUrl, pricingUrl, adPixels }) {
  const name = companyName || domain;
  const highlights = [];
  if (careersUrl) highlights.push('actively scaling the team');
  if (adPixels.length > 0) highlights.push(`running paid acquisition (${adPixels.slice(0, 2).join(' & ')})`);
  if (techStack.length > 0) highlights.push(`building on ${techStack.slice(0, 3).join(', ')}`);
  if (pricingUrl) highlights.push('offering self-serve product tiers');

  if (highlights.length >= 2) {
    return `Noticed ${name} is ${highlights[0]} while ${highlights[1]} — impressive growth trajectory.`;
  }
  if (highlights.length === 1) {
    return `Saw that ${name} is ${highlights[0]} and wanted to reach out with a quick idea.`;
  }
  return `Checked out ${name} (${domain}) and loved how you position your platform.`;
}

async function enrichDomain(rawDomain, options = {}) {
  const baseUrl = normalizeBaseUrl(rawDomain);
  if (!baseUrl) {
    return { domain: rawDomain, error: 'Invalid domain or URL', statusCode: 0 };
  }

  const hostname = new URL(baseUrl).hostname.replace(/^www\./i, '');
  const timeoutMs = (options.requestTimeoutSecs || 15) * 1000;
  const maxPages = options.maxPagesPerDomain || 4;
  const crawlContact = options.crawlContactPages !== false;

  const [home, dnsInfo] = await Promise.all([
    fetchPage(baseUrl, timeoutMs),
    resolveEmailInfrastructure(hostname),
  ]);

  const emails = new Set(extractEmails(home.html));
  const phones = new Set(extractPhones(home.html));
  const initialTech = detectTechAndPixels(home.html, home.headers);
  const techStack = new Set(initialTech.techStack);
  const adPixels = new Set(initialTech.adPixels);
  let spendScore = initialTech.spendScore;

  const socials = extractSocialLinks(home.html);
  const meta = extractMetaAndJsonLd(home.html);
  if (meta.jsonLdOrganization) {
    if (meta.jsonLdOrganization.email) {
      emails.add(String(meta.jsonLdOrganization.email).toLowerCase());
    }
    if (Array.isArray(meta.jsonLdOrganization.sameAs)) {
      for (const sUrl of meta.jsonLdOrganization.sameAs) {
        const lower = String(sUrl || '').toLowerCase();
        if (!socials.linkedin && lower.includes('linkedin.com/')) socials.linkedin = sUrl;
        if (!socials.twitter && (lower.includes('twitter.com/') || lower.includes('x.com/'))) socials.twitter = sUrl;
        if (!socials.github && lower.includes('github.com/')) socials.github = sUrl;
      }
    }
  }

  const { contactCandidates, careersUrl, pricingUrl } = discoverInternalLinks(home.html, baseUrl);
  const scannedPages = [baseUrl];

  if (crawlContact && home.ok) {
    for (const subUrl of contactCandidates.slice(0, Math.max(0, maxPages - 1))) {
      const sub = await fetchPage(subUrl, timeoutMs);
      scannedPages.push(subUrl);
      if (!sub.html) continue;
      for (const e of extractEmails(sub.html)) emails.add(e);
      for (const p of extractPhones(sub.html)) phones.add(p);
      const subTech = detectTechAndPixels(sub.html, sub.headers);
      for (const t of subTech.techStack) techStack.add(t);
      for (const px of subTech.adPixels) adPixels.add(px);
      spendScore += Math.min(4, subTech.spendScore);
      const subSocials = extractSocialLinks(sub.html);
      for (const k of Object.keys(socials)) {
        if (!socials[k] && subSocials[k]) socials[k] = subSocials[k];
      }
    }
  }

  // Fallback role-based contact inference if MX is active but public HTML hides emails
  const verifiedEmails = Array.from(emails);
  const roleEmailsSuggested =
    verifiedEmails.length === 0 && dnsInfo.mxRecords.length > 0
      ? [`hello@${hostname}`, `contact@${hostname}`, `sales@${hostname}`]
      : [];

  const finalEmails = verifiedEmails.length > 0 ? verifiedEmails : roleEmailsSuggested;
  const finalTech = Array.from(techStack);
  const finalPixels = Array.from(adPixels);

  // Calculate B2B Lead Quality Score (0-100)
  let leadScore = 25;
  if (verifiedEmails.length > 0) leadScore += 22;
  else if (roleEmailsSuggested.length > 0) leadScore += 10;
  if (phones.size > 0) leadScore += 10;
  if (socials.linkedin) leadScore += 12;
  if (socials.twitter || socials.github) leadScore += 6;
  if (dnsInfo.hasSpf && dnsInfo.hasDmarc) leadScore += 8;
  if (finalTech.length >= 3) leadScore += 8;
  if (careersUrl) leadScore += 5;
  if (pricingUrl) leadScore += 4;
  leadScore = Math.min(100, leadScore);

  let estimatedSaaSSpendTier = '<$1k/mo (Starter)';
  if (spendScore >= 8 || finalPixels.length >= 2) {
    estimatedSaaSSpendTier = '$5k+/mo (Enterprise / High-Growth)';
  } else if (spendScore >= 4 || finalTech.length >= 4) {
    estimatedSaaSSpendTier = '$1k-$5k/mo (Growth)';
  }

  const coldEmailIcebreaker = buildColdEmailIcebreaker({
    companyName: meta.companyName,
    domain: hostname,
    techStack: finalTech,
    careersUrl,
    pricingUrl,
    adPixels: finalPixels,
  });

  return {
    domain: hostname,
    url: home.finalUrl || baseUrl,
    statusCode: home.status,
    companyName: meta.companyName,
    leadScore,
    estimatedSaaSSpendTier,
    emails: finalEmails,
    emailSource: verifiedEmails.length > 0 ? 'extracted_on_page' : (roleEmailsSuggested.length > 0 ? 'mx_verified_role_pattern' : 'none'),
    phones: Array.from(phones),
    emailProvider: dnsInfo.emailProvider,
    hasSpf: dnsInfo.hasSpf,
    hasDmarc: dnsInfo.hasDmarc,
    mxRecords: dnsInfo.mxRecords,
    linkedin: socials.linkedin,
    twitter: socials.twitter,
    github: socials.github,
    youtube: socials.youtube,
    instagram: socials.instagram,
    adPixelsDetected: finalPixels,
    techStack: finalTech,
    coldEmailIcebreaker,
    careersUrl,
    pricingUrl,
    title: meta.title,
    description: meta.description,
    jsonLdOrganization: meta.jsonLdOrganization,
    scannedPages,
    enrichedAt: new Date().toISOString(),
  };
}

async function run() {
  let Actor = null;
  try {
    ({ Actor } = require('apify'));
  } catch {
    // Running in standalone CLI mode without apify sdk installed
  }

  const isDemo = process.argv.includes('--demo');
  if (Actor && !isDemo && process.env.APIFY_IS_AT_HOME) {
    await Actor.init();
    const input = (await Actor.getInput()) || {};
    const domains = Array.isArray(input.domains) && input.domains.length > 0
      ? input.domains
      : ["apify.com","shopify.com","linear.app","stripe.com","vercel.com","supabase.com","posthog.com","cal.com","dub.co","resend.com"];
    for (const domain of domains) {
      const record = await enrichDomain(domain, input);
      await Actor.pushData(record);
      if (typeof Actor.charge === 'function' && record.statusCode > 0) {
        try {
          await Actor.charge({ eventName: 'lead-enriched', count: 1 });
        } catch {
          // Ignore if PPE is not enabled on current run
        }
      }
    }
    await Actor.exit();
    return;
  }

  // Standalone CLI / Demo mode
  const demoDomains = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targets = demoDomains.length > 0 ? demoDomains : ["apify.com","shopify.com","linear.app","stripe.com","vercel.com","supabase.com","posthog.com","cal.com","dub.co","resend.com"];
  const results = [];
  for (const d of targets) {
    const res = await enrichDomain(d, { maxPagesPerDomain: 2, requestTimeoutSecs: 10 });
    results.push(res);
  }
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { enrichDomain };
