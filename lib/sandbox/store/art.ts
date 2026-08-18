import type { DemoCategorySlug, DemoProduct } from "../../store/demo/types";

export type ProductArt = {
  hue: number;
  accent: string;
  wash: string;
  ink: string;
  motif: "orb" | "fold" | "arch" | "petal" | "band" | "leaf" | "loop" | "block" | "hook" | "tray" | "spark";
  label: string;
};

const MOTIF_BY_CATEGORY: Record<DemoCategorySlug, ProductArt["motif"]> = {
  electronics: "orb",
  fashion: "fold",
  home: "arch",
  beauty: "petal",
  sports: "band",
  books: "leaf",
  accessories: "loop",
  kids: "block",
  "automotive-accessories": "hook",
  office: "tray",
  "digital-other": "spark",
};

export function hueFromSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 33 + slug.charCodeAt(i)) % 360;
  }
  return hash;
}

export function artForProduct(product: Pick<DemoProduct, "slug" | "title" | "category">): ProductArt {
  const hue = hueFromSlug(product.slug);
  return {
    hue,
    accent: `hsl(${hue} 42% 62%)`,
    wash: `hsl(${hue} 28% 16%)`,
    ink: `hsl(${hue} 18% 88%)`,
    motif: MOTIF_BY_CATEGORY[product.category],
    label: product.title,
  };
}
