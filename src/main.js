#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const TECH_SIGNATURES = [
  { name: 'Next.js', pattern: /_next\/static|__NEXT_DATA__/i },
  { name: 'Nuxt.js', pattern: /_nuxt\/|__NUXT__/i },
  { name: 'React', pattern: /react-dom|data-reactroot/i },
  { name: 'Vue.js', pattern: /data-v-[a-f0-9]{6}|vue\.runtime/i },
  { name: 'Webflow', pattern: /data-wf-site|webflow\.js/i },
  { name: 'WordPress', pattern: /wp-content\/|wp-includes\//i },
  { name: 'Shopify', pattern: /cdn\.shopify\.com|Shopify\.theme/i },
  { name: 'HubSpot', pattern: /js\.hs-scripts\.com|hs-analytics|hubspot/i },
  { name: 'Intercom', pattern: /widget\.intercom\.io|intercomSettings/i },
  { name: 'Stripe', pattern: /js\.stripe\.com/i },
  { name: 'Google Tag Manager', pattern: /googletagmanager\.com\/gtm\.js/i },
  { name: 'Google Analytics', pattern: /googletagmanager\.com\/gtag\/js|google-analytics\.com/i },
  { name: 'Segment', pattern: /cdn\.segment\.com\/analytics\.js/i },
  { name: 'Cloudflare', pattern: /challenges\.cloudflare\.com|cloudflareinsights\.com|__cf_bm/i },
  { name: 'Tailwind CSS', pattern: /tailwindcss|--tw-ring-offset-shadow/i },
  { name: 'Sentry', pattern: /browser\.sentry-cdn\.com|Sentry\.init/i },
  { name: 'PostHog', pattern: /posthog\.com|posthog\.init/i },
];

const DISPOSABLE_EMAIL_SUFFIXES = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css', '.woff', '.woff2',
  'example.com', 'domain.com', 'email.com', 'yoursite.com', 'sentry.io', 'wixpress.com'
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
    if (email.length > 80 || email.startsWith('u00')) continue;
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
  };
  const hrefs = Array.from(html.matchAll(/href=["'](https?:\/\/[^"'\s>]+)["']/gi)).map((m) => m[1]);
  for (const href of hrefs) {
    const lower = href.toLowerCase();
    if (!socials.linkedin && lower.includes('linkedin.com/company/')) socials.linkedin = href;
    else if (!socials.linkedin && lower.includes('linkedin.com/in/')) socials.linkedin = href;
    if (!socials.twitter && (lower.includes('twitter.com/') || lower.includes('x.com/')) && !lower.includes('/intent/')) {
      socials.twitter = href;
    }
    if (!socials.github && /github\.com\/[a-z0-9_.-]+\/?$/i.test(href)) socials.github = href;
    if (!socials.youtube && (lower.includes('youtube.com/@') || lower.includes('youtube.com/c/') || lower.includes('youtube.com/channel/'))) {
      socials.youtube = href;
    }
    if (!socials.instagram && lower.includes('instagram.com/')) socials.instagram = href;
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
        if (item && /Organization|Corporation|LocalBusiness|SoftwareApplication/i.test(String(item['@type'] || ''))) {
          orgSchema = {
            name: item.name || null,
            legalName: item.legalName || null,
            foundingDate: item.foundingDate || null,
            email: item.email || null,
            telephone: item.telephone || null,
            sameAs: Array.isArray(item.sameAs) ? item.sameAs : null,
          };
          break;
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
      (titleMatch ? titleMatch[1].split(/[|\-–—]/)[0].trim() : null),
    jsonLdOrganization: orgSchema,
  };
}

function detectTechStack(html, headers) {
  const detected = new Set();
  const combined = `${html}\n${JSON.stringify(headers || {})}`;
  for (const sig of TECH_SIGNATURES) {
    if (sig.pattern.test(combined)) {
      detected.add(sig.name);
    }
  }
  return Array.from(detected);
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
      if (/\/(contact|contact-us|about|about-us|impressum|legal|privacy|support|team)\b/.test(pathname)) {
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

async function enrichDomain(rawDomain, options = {}) {
  const baseUrl = normalizeBaseUrl(rawDomain);
  if (!baseUrl) {
    return { domain: rawDomain, error: 'Invalid domain or URL', statusCode: 0 };
  }

  const timeoutMs = (options.requestTimeoutSecs || 15) * 1000;
  const maxPages = options.maxPagesPerDomain || 4;
  const crawlContact = options.crawlContactPages !== false;

  const home = await fetchPage(baseUrl, timeoutMs);
  const emails = new Set(extractEmails(home.html));
  const phones = new Set(extractPhones(home.html));
  const techStack = new Set(detectTechStack(home.html, home.headers));
  const socials = extractSocialLinks(home.html);
  const meta = extractMetaAndJsonLd(home.html);
  if (meta.jsonLdOrganization && meta.jsonLdOrganization.email) {
    emails.add(String(meta.jsonLdOrganization.email).toLowerCase());
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
      for (const t of detectTechStack(sub.html, sub.headers)) techStack.add(t);
      const subSocials = extractSocialLinks(sub.html);
      for (const k of Object.keys(socials)) {
        if (!socials[k] && subSocials[k]) socials[k] = subSocials[k];
      }
    }
  }

  return {
    domain: new URL(baseUrl).hostname,
    url: home.finalUrl || baseUrl,
    statusCode: home.status,
    companyName: meta.companyName,
    title: meta.title,
    description: meta.description,
    emails: Array.from(emails),
    phones: Array.from(phones),
    linkedin: socials.linkedin,
    twitter: socials.twitter,
    github: socials.github,
    youtube: socials.youtube,
    instagram: socials.instagram,
    techStack: Array.from(techStack),
    careersUrl,
    pricingUrl,
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
    const domains = Array.isArray(input.domains) ? input.domains : [];
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
  const targets = demoDomains.length > 0 ? demoDomains : ['apify.com', 'news.ycombinator.com'];
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
