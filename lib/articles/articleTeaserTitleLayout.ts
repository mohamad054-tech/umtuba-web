/**
 * Article title layout — re-exports shared Teaser Template Engine helpers.
 */

export {
  detectTeaserTextDirection,
  layoutTeaserTitle,
  escapeDrawtext,
  defaultCtaForTemplate,
} from "../content/teaser/teaserTemplateEngine";

import { defaultCtaForTemplate } from "../content/teaser/teaserTemplateEngine";

export const TEASER_CTA_AR = "اقرأ المقالة كاملة";
export const TEASER_CTA_EN = "Read full article";

export function teaserCtaForTitle(title: string): string {
  return defaultCtaForTemplate("article", title);
}
