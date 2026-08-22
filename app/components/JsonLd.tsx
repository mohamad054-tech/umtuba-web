import type { JsonLdRecord } from "../../lib/site/jsonLd";

export default function JsonLd({ data }: { data: JsonLdRecord | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
