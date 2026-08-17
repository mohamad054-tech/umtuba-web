import { NextResponse } from "next/server";
import { getSiteUrl } from "../../lib/site/siteUrl";
import {
  buildWatchPostPath,
  OG_IMAGE_PATH,
  sitemapDurationSeconds,
  truthfulVideoDescription,
  truthfulVideoTitle,
} from "../../lib/site/videoSeo";
import { listPublicVideosForSitemap } from "../../lib/supabase/publicVideoSeo";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const origin = getSiteUrl();
  const videos = await listPublicVideosForSitemap();
  const thumbnail = `${origin}${OG_IMAGE_PATH}`;

  const urls = videos
    .map((video) => {
      const loc = `${origin}${buildWatchPostPath(video.id)}`;
      const title = escapeXml(truthfulVideoTitle(video));
      const description = escapeXml(truthfulVideoDescription(video));
      const duration = sitemapDurationSeconds(video.durationMs);
      const pub = Number.isFinite(Date.parse(video.createdAt))
        ? new Date(video.createdAt).toISOString()
        : null;

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:description>${description}</video:description>
      <video:player_loc>${escapeXml(loc)}</video:player_loc>
      ${pub ? `<video:publication_date>${pub}</video:publication_date>` : ""}
      ${duration != null ? `<video:duration>${duration}</video:duration>` : ""}
    </video:video>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls}
</urlset>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
