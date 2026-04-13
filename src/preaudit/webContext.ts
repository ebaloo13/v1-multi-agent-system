export type WebHeadingMap = {
  h1: string[];
  h2: string[];
};

export type WebContext = {
  url: string;
  title: string;
  description: string;
  headings: WebHeadingMap;
  content: string;
  links: string[];
};

export type FetchedWebPage = WebContext & {
  raw_html: string;
  internal_links: string[];
  social_links: string[];
};

const SOCIAL_HOST_PATTERNS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "wa.me",
  "whatsapp.com",
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, " "));
}

function extractTagContents(html: string, tagName: string, limit: number): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null && values.length < limit) {
    const text = stripTags(match[1] ?? "");
    if (text.length > 0) {
      values.push(text);
    }
  }

  return values;
}

function extractMetaDescription(html: string): string {
  const metaMatch =
    html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ??
    html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);

  return cleanText(metaMatch?.[1] ?? "");
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(titleMatch?.[1] ?? "");
}

function extractVisibleText(html: string, maxLength: number): string {
  const withoutHiddenSections = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = stripTags(withoutHiddenSections);
  return text.slice(0, maxLength);
}

function isSocialHost(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  return SOCIAL_HOST_PATTERNS.some(
    (pattern) => lowered === pattern || lowered.endsWith(`.${pattern}`),
  );
}

function extractResolvedLinks(html: string, pageUrl: URL, limit: number): string[] {
  const pattern = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  const links: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null && links.length < limit) {
    const href = match[1]?.trim();
    if (!href) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl);
      resolved.hash = "";
    } catch {
      continue;
    }

    const normalized = resolved.toString();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    links.push(normalized);
  }

  return links;
}

function filterLinks(
  links: string[],
  predicate: (resolved: URL) => boolean,
  limit: number,
): string[] {
  const filtered: string[] = [];

  for (const link of links) {
    if (filtered.length >= limit) {
      break;
    }

    let resolved: URL;
    try {
      resolved = new URL(link);
    } catch {
      continue;
    }

    if (predicate(resolved)) {
      filtered.push(resolved.toString());
    }
  }

  return filtered;
}

export async function fetchWebPage(url: string): Promise<FetchedWebPage> {
  const normalizedUrl = new URL(url);
  const response = await fetch(normalizedUrl, {
    headers: {
      "user-agent": "claude-agent-b2b-lab-preaudit/1.0",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${normalizedUrl.toString()}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const finalUrl = new URL(response.url);
  const resolvedLinks = extractResolvedLinks(html, finalUrl, 80);
  const internalLinks = filterLinks(
    resolvedLinks,
    (resolved) => resolved.hostname === finalUrl.hostname,
    20,
  );
  const socialLinks = filterLinks(
    resolvedLinks,
    (resolved) => isSocialHost(resolved.hostname),
    20,
  );

  return {
    url: finalUrl.toString(),
    raw_html: html,
    title: extractTitle(html),
    description: extractMetaDescription(html),
    headings: {
      h1: extractTagContents(html, "h1", 10),
      h2: extractTagContents(html, "h2", 20),
    },
    content: extractVisibleText(html, 4000),
    internal_links: internalLinks,
    social_links: socialLinks,
    links: [...internalLinks, ...socialLinks],
  };
}

export async function getWebContext(url: string): Promise<WebContext> {
  const page = await fetchWebPage(url);
  return {
    url: page.url,
    title: page.title,
    description: page.description,
    headings: page.headings,
    content: page.content,
    links: page.links,
  };
}
