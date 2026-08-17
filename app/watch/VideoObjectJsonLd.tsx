import type { VideoObjectJsonLd } from "../../lib/site/videoSeo";

export default function VideoObjectJsonLdScript({
  data,
}: {
  data: VideoObjectJsonLd;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
