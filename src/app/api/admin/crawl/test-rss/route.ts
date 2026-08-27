import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { discoverRssFeed } from "../route";
import * as cheerio from "cheerio";

const parser = new Parser({ timeout: 10000 });

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // 1. Try parsing as RSS directly
  try {
    const feed = await parser.parseURL(url);
    return NextResponse.json({
      ok: true,
      type: "RSS",
      title: feed.title,
      itemCount: feed.items.length,
      latestTitle: feed.items[0]?.title ?? null,
    });
  } catch {
    // 2. Try auto-discovering RSS feed
    const discoveredRss = await discoverRssFeed(url);
    if (discoveredRss) {
      try {
        const feed = await parser.parseURL(discoveredRss);
        return NextResponse.json({
          ok: true,
          type: "RSS_DISCOVERED",
          discoveredRss,
          title: feed.title,
          itemCount: feed.items.length,
          latestTitle: feed.items[0]?.title ?? null,
        });
      } catch {
        // continue to HTML check
      }
    }

    // 3. Fallback: Test as direct HTML web scraping
    try {
      const htmlRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeltimHub/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const $ = cheerio.load(html);
        const articles = $('article, [class*="article"], [class*="post"], [class*="berita"], [class*="news-item"], [class*="card"]');
        const count = articles.length || $("h2, h3").length;
        const pageTitle = $("title").text().trim();

        return NextResponse.json({
          ok: true,
          type: "HTML_SCRAPER",
          title: pageTitle || "Web Page",
          itemCount: count,
          message: "Situs tidak memiliki RSS, namun dapat di-crawl melalui HTML Web Scraper.",
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: false, error: "Gagal membaca URL sebagai RSS maupun halaman web" }, { status: 422 });
  }
}
