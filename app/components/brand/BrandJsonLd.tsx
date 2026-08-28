import { BRAND, BRAND_ASSETS } from "../../../lib/site/brand";
import { absoluteUrl } from "../../../lib/site/siteUrl";

/**
 * Organization JSON-LD pointing at the official stacked logo asset.
 */
export default function BrandJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: BRAND.productionOrigin,
    logo: absoluteUrl(BRAND_ASSETS.stackedLogo),
    slogan: BRAND.tagline,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
