# UMTUBA Ads — Creative Asset Library

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** Creative Service mentions in `02_SYSTEM_ARCHITECTURE.md`, Creative/CreativeAsset in `09_DATABASE_BLUEPRINT.md`  
**Scope:** Shared media and copy library for AdvertiserOrgs — distinct from Ad and Creative delivery objects

---

## 1. Scope

The **Creative Asset Library** is the durable catalog of reusable assets (media, brand kits, text, translations, captions, audio, and future documents) owned by an Advertiser (AdvertiserOrg). Ads and Creatives **reference** library assets; they are not the same thing.

### Goals

1. Let teams upload once and reuse across Campaigns, Ad Groups, Ads, and Creatives.  
2. Version assets safely with checksums and deduplication.  
3. Enforce scanning, moderation, licensing, and retention.  
4. Support crop/aspect variants, transcoding, localization, and accessibility metadata.  
5. Track AI-generated variants with clear provenance (`11_AI_ADVERTISING_ENGINE.md`).  
6. Prevent deletion of assets in use by active Ads.  
7. Provide RBAC for Advertiser members.

### Non-goals

- Replacing CDN/media pipeline implementation details.  
- Making an Asset serveable as an Ad without Creative + Review.  
- SQL DDL or migrations.  
- Guaranteeing infinite retention.  
- Owning Store product images as canonical commerce media (Store remains source for catalog imagery; Ads may copy/reference under rules).

---

## 2. Core Concepts — Asset ≠ Creative ≠ Ad

| Object | Role |
|--------|------|
| **Asset** | Library item: bytes or text + metadata + versions |
| **Creative** | Deliverable binding: layout/shape + chosen Assets + Ad-level copy overrides |
| **Ad** | Auction/eligibility object: destination, type, status, links to Creative(s) |
| **Brand kit** | Named set of logos, colors, fonts, voice notes for an org |
| **Derivative** | Crop, transcode, translation, or AI variant of a parent Asset |

```text
AdvertiserOrg
  └── Asset Library
        ├── Asset (image/video/logo/text/…)
        │     └── AssetVersion (1..N)
        │           └── Derivatives (crops, encodes, locales)
        └── BrandKit → references Assets

Campaign → AdGroup → Ad → Creative → references AssetVersion(s)
```

**Rule:** Publishing requires Creative + Ad Review path. Ready Assets alone never enter Delivery.

---

## 3. Asset Types

| Type | Examples | Notes |
|------|----------|-------|
| **Images** | Stills, carousels cards | Aspect variants |
| **Videos** | Primary spots, trailers | Transcoding + thumbnails |
| **Logos** | Primary / mono / favicon | Brand kit members |
| **Brand kits** | Colors, type tokens, logo set | Not a media file itself |
| **Headlines** | Short text assets | Locale variants |
| **Descriptions** | Body copy | Locale variants |
| **CTA variants** | Shop now / Learn more / … | Policy-checked strings |
| **Translations** | Linked locale copies of text/media | Provenance to source |
| **Captions** | Subtitle tracks (VTT-class) | Accessibility |
| **Thumbnails** | Video posters | May auto-derive |
| **Audio** | Voiceover, beds | Future placements |
| **Documents** | PDFs for future formats | Optional; scan-heavy |
| **AI-generated variants** | Any type with `provenance=ai` | Model Version required |

---

## 4. Ownership & Permissions

- Every Asset belongs to exactly one **AdvertiserOrg** (tenant isolation).  
- Optional folder/collection labels for agency workflows.  
- Member roles align with `08_SECURITY.md` (Campaign Manager uploads; Admin deletes; Analyst read-only).  
- Agency multi-account: assets do not bleed across AdvertiserOrgs unless explicit share grant *(Future Capability)*.

| Action | Typical role |
|--------|----------------|
| Upload / replace version | Campaign Manager+ |
| Edit metadata / alt text | Campaign Manager+ |
| Archive | Admin or Owner |
| Hard delete request | Owner + not in active use |
| Legal hold | Platform Admin / counsel workflow |

---

## 5. Lifecycle & States

```text
uploaded → scanning → processing → ready
                              ↘ rejected
ready → archived (soft)
any → legal_hold (blocks destructive delete)
```

| State | Meaning |
|-------|---------|
| **uploaded** | Bytes accepted; not usable |
| **scanning** | Malware / content safety scanners running |
| **processing** | Transcode, thumbnails, checksum index |
| **ready** | Eligible to attach to Creative |
| **rejected** | Failed scan/moderation; reason codes |
| **archived** | Soft-hidden from default pickers; retained |

### Moderation status (parallel)

`unreviewed` · `clear` · `needs_review` · `restricted` · `blocked`  

Creative/Ad Review remains authoritative for go-live; library moderation is a pre-filter.

---

## 6. Versioning, Checksums, Deduplication

- **Asset** is the identity; **AssetVersion** is immutable content.  
- New upload of same logical asset → new version (or replace draft version before ready).  
- **Checksum** (content hash) detects duplicates within org; suggest reuse instead of re-upload.  
- Cross-org dedup of bytes is an optimization only—never merges ownership.

---

## 7. Processing Pipeline (Conceptual)

```text
Upload → virus/malware scan → type validate
      → (video/audio) transcode profiles
      → generate thumbnails / waveform previews
      → extract technical metadata (duration, dimensions)
      → index checksum
      → ready | rejected
```

Crop/aspect-ratio variants may be:

- Advertiser-defined safe crops, or  
- System-suggested crops per Placement Registry slot shapes (`04_PLACEMENTS.md`).

---

## 8. Licensing, Rights, Expiry

| Field (conceptual) | Purpose |
|--------------------|---------|
| License type | Owned / licensed / stock / UGC permission |
| Rights territory | Where usable |
| Rights expiry | Auto-restrict after date |
| Attribution text | If required |
| Source URL / contract ref | Audit |

Expired rights → Asset cannot attach to new Creatives; active Ads using it emit alerts and may auto-pause per policy *(Open Decision on auto-pause)*.

---

## 9. Localization & Accessibility

- Locale-tagged text Assets and caption tracks.  
- **Alt text** required for image Assets before some placements (policy-configurable).  
- Captions encouraged/required for video on Learning/Government classes.  
- Language metadata separate from Targeting language predicates.

---

## 10. AI-Generated Variants & Provenance

| Requirement | Rule |
|-------------|------|
| Provenance | `human_upload` \| `ai_generated` \| `derived` |
| Model Version | Mandatory if AI |
| Parent Asset | Link for derivatives |
| Review | Same Review path when used in Ad |
| Training opt-out | Org-level flag: do not use assets to train shared models *(Future)* |

---

## 11. Retention, Soft Delete, Legal Hold

| Mode | Behavior |
|------|----------|
| **Soft delete / archive** | Hidden; recoverable within retention |
| **Legal hold** | Blocks purge; Audit entry |
| **Hard delete** | Only if zero active Ad references + hold clear + retention elapsed |
| **Active Ad protection** | Delete API returns conflict if Creative on `active`/`pending_review` Ad references AssetVersion |

Billing and Delivery logs may retain asset ids after delete for audit (metadata only).

---

## 12. Audit

Append-only events: upload, version add, state change, moderation decision, license edit, share grant, delete attempt/success, legal hold.  
Aligns with AuditLogEntry patterns in `09_DATABASE_BLUEPRINT.md`.

---

## 13. Conceptual Entities (No SQL)

| Entity | Purpose |
|--------|---------|
| **AssetLibrary** | Per-org root (logical) |
| **Asset** | Typed library item |
| **AssetVersion** | Immutable content + checksum + state |
| **AssetDerivative** | Crop/encode/locale child |
| **BrandKit** | Bundle of asset refs + tokens |
| **AssetText** | Headline/description/CTA records |
| **AssetCaptionTrack** | Timed text |
| **AssetLicense** | Rights metadata |
| **AssetUsageLink** | Creative ↔ AssetVersion (prevents unsafe delete) |
| **AssetModerationDecision** | Library-level decision |
| **AssetAuditEvent** | Append-only |

---

## 14. Failure Modes

| Failure | Behavior |
|---------|----------|
| Scan engine down | Stay in `scanning`; do not mark ready |
| Transcode fail | `rejected` with retry |
| Partial upload | Abort; no ready version |
| Rights expiry mid-flight | Alert + optional pause Ads |
| Orphan Creative refs | Block Delivery eligibility; surface diagnostics |

---

## 15. MVP vs Future Capability

| MVP | Future |
|-----|--------|
| Images, videos, logos, headlines, descriptions, CTAs | Audio beds, document formats, playable packages |
| Scan + transcode + checksum dedup | Smart crop suggestions per placement |
| Soft delete + active-use lock | Cross-org agency share vaults |
| Alt text + basic captions | Full accessibility scorecards |
| AI provenance fields | Org training opt-out enforcement |

---

## 16. Open Decisions

1. Auto-pause Ads on rights expiry vs alert-only.  
2. Whether Store catalog media is deep-linked or copied into Ads library.  
3. Cross-advertiser asset sharing for agencies.  
4. Numeric retention periods (counsel/finance).  
5. Regional data residency for media bytes.  
6. AI training use of advertiser assets.

---

## 17. Design Completeness Checklist

- [x] Asset types including AI variants + provenance  
- [x] Ownership, reuse, versioning, checksums  
- [x] States, scanning, moderation, licensing, expiry  
- [x] Crops, transcoding, localization, accessibility  
- [x] Retention, soft delete, legal hold, audit  
- [x] Team permissions + active Ad delete protection  
- [x] Clear Asset ≠ Creative ≠ Ad  
- [x] Conceptual entities without SQL  

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — Creative Service / media pipeline  
- `03_AD_TYPES.md` — creative shapes consuming assets  
- `08_SECURITY.md` — malware, permissions  
- `09_DATABASE_BLUEPRINT.md` — CreativeAsset bridge (extended here)  
- `11_AI_ADVERTISING_ENGINE.md` — generation into library  
- `14_EXPERIMENT_PLATFORM.md` — creative/headline tests referencing assets  
- `16_ADS_API_AND_INTEGRATIONS.md` — upload APIs  
