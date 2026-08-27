import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import * as cheerio from "cheerio";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeltimHub/1.0",
  },
});

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? user : null;
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ── Auto-discover RSS feed from HTML ──
export async function discoverRssFeed(siteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(siteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeltimHub/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Check <link rel="alternate" type="application/rss+xml">
    const rssLink = $('link[type="application/rss+xml"], link[type="application/atom+xml"]').attr("href");
    if (rssLink) {
      return new URL(rssLink, siteUrl).toString();
    }

    // 2. Check common paths
    const candidates = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/index.xml"];
    for (const path of candidates) {
      try {
        const testUrl = new URL(path, siteUrl).toString();
        const testRes = await fetch(testUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
        });
        const ct = testRes.headers.get("content-type") || "";
        if (testRes.ok && (ct.includes("xml") || ct.includes("rss") || ct.includes("atom"))) {
          return testUrl;
        }
      } catch {
        // continue
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ── Crawl via RSS ──
async function crawlViaRss(source: {
  id: string;
  name: string;
  rssUrl: string;
  keywords: string[];
}) {
  const feed = await parser.parseURL(source.rssUrl);
  let crawled = 0;
  let skipped = 0;

  for (const item of feed.items) {
    const title = item.title ?? "";
    const content = item.contentSnippet ?? item.content ?? item.summary ?? "";
    const link = item.link;

    if (!link) {
      skipped++;
      continue;
    }

    const searchText = `${title} ${content}`;
    if (!matchesKeywords(searchText, source.keywords)) {
      skipped++;
      continue;
    }

    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
    const snippet = content.slice(0, 300).trim();
    const itemRecord = item as Record<string, unknown>;
    const imageUrl =
      itemRecord["media:thumbnail"]
        ? (itemRecord["media:thumbnail"] as { $?: { url?: string } })?.$?.url
        : itemRecord["enclosure"]
          ? (itemRecord["enclosure"] as { url?: string })?.url
          : undefined;

    try {
      await prisma.news.upsert({
        where: { sourceUrl: link },
        create: {
          title: title.trim(),
          snippet: snippet || title.trim(),
          sourceUrl: link,
          sourceName: source.name,
          imageUrl: typeof imageUrl === "string" ? imageUrl : null,
          publishedAt,
          isActive: true,
          sourceId: source.id,
        },
        update: {
          sourceId: source.id,
        },
      });
      crawled++;
    } catch {
      skipped++;
    }
  }

  return { crawled, skipped };
}

// ── Crawl via Direct HTML Scraping (Fallback when no RSS) ──
async function crawlViaHtml(source: {
  id: string;
  name: string;
  siteUrl: string;
  keywords: string[];
}) {
  const res = await fetch(source.siteUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeltimHub/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal memuat halaman situs`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let crawled = 0;
  let skipped = 0;
  const visitedLinks = new Set<string>();

  // Selectors for finding article cards / posts
  const articleElements = $(
    'article, [class*="article"], [class*="post"], [class*="berita"], [class*="news-item"], [class*="card"], .item'
  );

  const processArticle = async (
    title: string,
    rawLink: string | undefined,
    snippet: string,
    imgUrl?: string
  ) => {
    if (!title || !rawLink || title.length < 5) return;

    let fullLink: string;
    try {
      fullLink = new URL(rawLink, source.siteUrl).toString();
    } catch {
      return;
    }

    if (visitedLinks.has(fullLink)) return;
    visitedLinks.add(fullLink);

    const searchText = `${title} ${snippet}`;
    if (!matchesKeywords(searchText, source.keywords)) {
      skipped++;
      return;
    }

    let absoluteImgUrl: string | null = null;
    if (imgUrl) {
      try {
        absoluteImgUrl = new URL(imgUrl, source.siteUrl).toString();
      } catch {
        absoluteImgUrl = null;
      }
    }

    try {
      await prisma.news.upsert({
        where: { sourceUrl: fullLink },
        create: {
          title: title.trim(),
          snippet: snippet ? snippet.slice(0, 300).trim() : title.trim(),
          sourceUrl: fullLink,
          sourceName: source.name,
          imageUrl: absoluteImgUrl,
          publishedAt: new Date(),
          isActive: true,
          sourceId: source.id,
        },
        update: {
          sourceId: source.id,
        },
      });
      crawled++;
    } catch {
      skipped++;
    }
  };

  if (articleElements.length > 0) {
    for (let i = 0; i < articleElements.length && i < 30; i++) {
      const el = articleElements.eq(i);
      const titleEl = el.find('h1, h2, h3, h4, [class*="title"]').first();
      const title = titleEl.text().trim() || el.find("a").first().text().trim();
      const rawLink =
        el.find("a").first().attr("href") ||
        titleEl.find("a").attr("href") ||
        (el.is("a") ? el.attr("href") : undefined);
      const snippet =
        el.find('p, [class*="desc"], [class*="snippet"], [class*="excerpt"]').first().text().trim();
      const img =
        el.find("img").first().attr("src") ||
        el.find("img").first().attr("data-src") ||
        el.find("img").first().attr("srcset")?.split(" ")[0];

      await processArticle(title, rawLink, snippet, img);
    }
  }

  // Fallback: scan all <a> tags that contain headings
  if (visitedLinks.size === 0) {
    const headingLinks = $("a:has(h1, h2, h3, h4), h1 a, h2 a, h3 a, h4 a");
    for (let i = 0; i < headingLinks.length && i < 30; i++) {
      const a = headingLinks.eq(i);
      const title = a.text().trim();
      const rawLink = a.attr("href");
      const parent = a.closest("div, li, article, section");
      const snippet = parent.find("p").first().text().trim();
      const img = parent.find("img").first().attr("src") || parent.find("img").first().attr("data-src");

      await processArticle(title, rawLink, snippet, img);
    }
  }

  return { crawled, skipped };
}

// ── Smart Crawler for a single source ──
async function crawlSource(sourceId: string) {
  const source = await prisma.newsSource.findUnique({ where: { id: sourceId } });
  if (!source || !source.isActive) return { crawled: 0, skipped: 0, error: "Source tidak aktif" };

  let crawled = 0;
  let skipped = 0;
  let error: string | null = null;
  let effectiveRssUrl = source.rssUrl?.trim() || null;

  // 1. If we don't have an rssUrl, attempt auto-discovery from siteUrl
  if (!effectiveRssUrl) {
    const discovered = await discoverRssFeed(source.siteUrl);
    if (discovered) {
      effectiveRssUrl = discovered;
      // Save discovered RSS URL
      await prisma.newsSource.update({
        where: { id: sourceId },
        data: { rssUrl: discovered },
      });
    }
  }

  // 2. Try RSS first if we have an RSS URL
  if (effectiveRssUrl) {
    try {
      const res = await crawlViaRss({
        id: source.id,
        name: source.name,
        rssUrl: effectiveRssUrl,
        keywords: source.keywords,
      });
      crawled = res.crawled;
      skipped = res.skipped;
    } catch (e) {
      console.warn(`[RSS Failed, attempting HTML fallback] ${source.name}:`, e);
      // Fallback to HTML if RSS fails
      try {
        const htmlRes = await crawlViaHtml(source);
        crawled = htmlRes.crawled;
        skipped = htmlRes.skipped;
      } catch (err) {
        error = err instanceof Error ? err.message : "Gagal crawling via RSS & HTML";
      }
    }
  } else {
    // 3. Directly crawl HTML (Web Scraper)
    try {
      const htmlRes = await crawlViaHtml(source);
      crawled = htmlRes.crawled;
      skipped = htmlRes.skipped;
    } catch (err) {
      error = err instanceof Error ? err.message : "Gagal crawling HTML situs";
    }
  }

  // Update lastCrawledAt & articleCount
  await prisma.newsSource.update({
    where: { id: sourceId },
    data: {
      lastCrawledAt: new Date(),
      articleCount: { increment: crawled },
    },
  });

  return { crawled, skipped, error };
}

// POST /api/admin/crawl — crawl one or all sources
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { sourceId } = body as { sourceId?: string };

  if (sourceId) {
    const result = await crawlSource(sourceId);
    return NextResponse.json(result);
  }

  // Crawl all active sources
  const sources = await prisma.newsSource.findMany({ where: { isActive: true } });
  const results = await Promise.allSettled(sources.map((s: { id: string }) => crawlSource(s.id)));

  const summary = results.map((r: PromiseSettledResult<{ crawled: number; skipped: number; error: string | null }>, i: number) => ({
    sourceId: sources[i].id,
    sourceName: sources[i].name,
    ...(r.status === "fulfilled" ? r.value : { crawled: 0, skipped: 0, error: "Internal error" }),
  }));

  return NextResponse.json({ results: summary, total: sources.length });
}

// GET /api/admin/crawl — cron trigger
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const envSecret = process.env.CRON_SECRET;

  const isAdmin = await requireAdmin();
  const isCron = envSecret && secret === envSecret;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.newsSource.findMany({ where: { isActive: true } });
  const results = await Promise.allSettled(sources.map((s: { id: string }) => crawlSource(s.id)));

  const summary = results.map((r: PromiseSettledResult<{ crawled: number; skipped: number; error: string | null }>, i: number) => ({
    sourceId: sources[i].id,
    sourceName: sources[i].name,
    ...(r.status === "fulfilled" ? r.value : { crawled: 0, skipped: 0, error: "Internal error" }),
  }));

  const totalCrawled = summary.reduce((a: number, b: { crawled: number }) => a + b.crawled, 0);
  return NextResponse.json({ ok: true, results: summary, totalCrawled });
}

export { crawlSource };
