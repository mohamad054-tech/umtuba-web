import type { SupabaseClient } from "@supabase/supabase-js";

export type JourneyCountry = {
  countryCode: string;
  countryName: string;
  viewCount: number;
  isTrending: boolean;
  firstReachedAt: string | null;
};

export type PostJourneySummary = {
  postId: number;
  ownerId: string;
  views: number;
  countryCount: number;
  countries: JourneyCountry[];
};

export type UmPointsLedgerItem = {
  id: string;
  points: number;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type UmPointsSummary = {
  balance: number;
  earnedToday: number;
  dailyCap: number;
  nextMilestone: number | null;
  ledger: UmPointsLedgerItem[];
};

export type CreatorInsight = {
  id: string;
  insightKey: string;
  title: string;
  body: string | null;
  category: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function getPostJourney(
  supabase: SupabaseClient,
  postId: number
): Promise<PostJourneySummary | null> {
  const { data, error } = await supabase.rpc("get_post_journey", {
    p_post_id: postId,
  });
  if (error) {
    console.error("get_post_journey failed:", error);
    return null;
  }
  const row = asRecord(data);
  if (!row) return null;

  const countriesRaw = Array.isArray(row.countries) ? row.countries : [];
  const countries: JourneyCountry[] = countriesRaw
    .map((item) => {
      const c = asRecord(item);
      if (!c || typeof c.countryCode !== "string") return null;
      return {
        countryCode: c.countryCode,
        countryName:
          typeof c.countryName === "string" ? c.countryName : c.countryCode,
        viewCount: Number(c.viewCount ?? 0) || 0,
        isTrending: Boolean(c.isTrending),
        firstReachedAt:
          typeof c.firstReachedAt === "string" ? c.firstReachedAt : null,
      };
    })
    .filter((c): c is JourneyCountry => Boolean(c));

  return {
    postId: Number(row.postId ?? postId),
    ownerId: typeof row.ownerId === "string" ? row.ownerId : "",
    views: Number(row.views ?? 0) || 0,
    countryCount: Number(row.countryCount ?? countries.length) || 0,
    countries,
  };
}

export async function getMyUmPointsSummary(
  supabase: SupabaseClient
): Promise<UmPointsSummary | null> {
  const { data, error } = await supabase.rpc("get_my_um_points_summary");
  if (error) {
    console.error("get_my_um_points_summary failed:", error);
    return null;
  }
  const row = asRecord(data);
  if (!row) return null;

  const ledgerRaw = Array.isArray(row.ledger) ? row.ledger : [];
  const ledger: UmPointsLedgerItem[] = ledgerRaw
    .map((item) => {
      const l = asRecord(item);
      if (!l || typeof l.id !== "string") return null;
      return {
        id: l.id,
        points: Number(l.points ?? 0) || 0,
        reason: typeof l.reason === "string" ? l.reason : "Reward",
        metadata: asRecord(l.metadata) ?? {},
        createdAt: typeof l.createdAt === "string" ? l.createdAt : "",
      };
    })
    .filter((l): l is UmPointsLedgerItem => Boolean(l));

  return {
    balance: Number(row.balance ?? 0) || 0,
    earnedToday: Number(row.earnedToday ?? 0) || 0,
    dailyCap: Number(row.dailyCap ?? 200) || 200,
    nextMilestone:
      typeof row.nextMilestone === "number"
        ? row.nextMilestone
        : row.nextMilestone != null
          ? Number(row.nextMilestone)
          : null,
    ledger,
  };
}

export async function getMyCreatorInsights(
  supabase: SupabaseClient
): Promise<CreatorInsight[]> {
  const { data, error } = await supabase.rpc("get_my_creator_insights");
  if (error) {
    console.error("get_my_creator_insights failed:", error);
    return [];
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((item) => {
      const r = asRecord(item);
      if (!r || typeof r.id !== "string") return null;
      return {
        id: r.id,
        insightKey: typeof r.insightKey === "string" ? r.insightKey : "",
        title: typeof r.title === "string" ? r.title : "Insight",
        body: typeof r.body === "string" ? r.body : null,
        category: typeof r.category === "string" ? r.category : "general",
        metadata: asRecord(r.metadata) ?? {},
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
      };
    })
    .filter((r): r is CreatorInsight => Boolean(r));
}

export async function claimVerifiedWelcomeBonus(
  supabase: SupabaseClient
): Promise<{ created: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("claim_verified_welcome_bonus");
  if (error) {
    console.error("claim_verified_welcome_bonus failed:", error);
    return { created: false, reason: error.message };
  }
  const row = asRecord(data);
  return {
    created: Boolean(row?.created),
    reason: typeof row?.reason === "string" ? row.reason : undefined,
  };
}
