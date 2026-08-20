# UMTUBA Sound Library V1 originals

Generate and publish **UMTUBA-owned original** synthetic clips with unique human-readable titles. No third-party samples. No consumer-service scrapes. Encode AAC at 44.1 kHz with loudnorm (~-16 LUFS, no clip).

```bash
node scripts/sounds/generateUmtubaOriginals.mjs --phase=all
node scripts/sounds/publishUmtubaOriginals.mjs --phase=1 --dry-run
node scripts/sounds/publishUmtubaOriginals.mjs --phase=all --env-file=<local-env>
```

- Audio binaries stay in gitignored `tmp-sound-catalog-v1/`.
- Provenance: `docs/sounds/UMTUBA_SOUND_LIBRARY_V1_PROVENANCE.md`.
- Production catalog table: `public.social_sounds` (`20260932`).
- Bucket `social-sounds` is private. Mobile/web signed URLs still apply.
- Linked CLI publish: copy generated files to a **relative** path (Windows drive letters break `storage cp`), then `storage cp -r tmp-sound-upload/sounds ss:///social-sounds`.
- Disable a clip without an app update: `block_social_sound_reuse(id)`.
