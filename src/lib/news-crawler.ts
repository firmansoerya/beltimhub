import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": BROWSER_UA,
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

const RSS_SOURCES = [
  {
    name: "Google News – Belitung Timur",
    url: "https://news.google.com/rss/search?q=belitung+timur&hl=id&gl=ID&ceid=ID:id",
    keywords: [], // already filtered by Google, accept all
  },
  {
    name: "Google News – Beltim Manggar",
    url: "https://news.google.com/rss/search?q=beltim+manggar&hl=id&gl=ID&ceid=ID:id",
    keywords: [], // already filtered by Google, accept all
  },
  {
    name: "Tribun Bangka",
    url: "https://bangka.tribunnews.com/rss",
    keywords: ["belitung timur", "beltim", "manggar", "gantung", "dendang", "belitung"],
  },
];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export async function crawlNews(): Promise<{
  added: number;
  skipped: number;
  errors: string[];
}> {
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items) {
        if (!item.link || !item.title) continue;

        if (source.keywords.length > 0) {
          const titleSnippet = `${item.title} ${item.contentSnippet ?? ""}`;
          if (!containsKeyword(titleSnippet, source.keywords)) {
            skipped++;
            continue;
          }
        }

        try {
          await prisma.news.upsert({
            where: { sourceUrl: item.link },
            update: {},
            create: {
              title: item.title,
              snippet: item.contentSnippet?.slice(0, 300) ?? "",
              imageUrl: extractImageUrl(item),
              sourceUrl: item.link,
              sourceName: source.name,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
          });
          added++;
        } catch {
          skipped++;
        }
      }
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { added, skipped, errors };
}

function extractImageUrl(item: Parser.Item): string | undefined {
  if (item.enclosure?.url) return item.enclosure.url;

  const raw = item as Record<string, unknown>;

  // media:content or media:thumbnail (common in Google News / RSS feeds)
  const mediaContent = raw["media:content"] as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  const mediaThumbnail = raw["media:thumbnail"] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  const content = raw["content:encoded"] as string | undefined;
  if (content) {
    const match = content.match(/<img[^>]+src="([^"]+)"/);
    if (match) return match[1];
  }
  return undefined;
}
