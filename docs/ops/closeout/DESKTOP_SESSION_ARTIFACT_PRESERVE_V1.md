# DESKTOP_SESSION_ARTIFACT_PRESERVE_V1

## Meta

| Field | Value |
| --- | --- |
| TIMESTAMP | 2026-08-13T02:59:25+03:00 |
| TARGET_DEVICE | DESKTOP |
| TASK_ID | DESKTOP_SESSION_ARTIFACT_PRESERVE_V1 |
| MODE | ARCHIVE_AND_DEPOSIT_ONLY |
| IDLE_POLICY | DO_NOT_IDLE |
| OPERATOR | احفظ كلشي (save everything) |
| CENTRAL_RECEIPT | NO |
| GOOGLE_PLAY_UPLOAD_PERFORMED | NO |
| FEATURE_IMPLEMENTATION_STARTED | NO |
| AAB_REBUILD | NO |
| PRODUCTION_MUTATION | NO |

## Destinations

| Destination | Path | Status |
| --- | --- | --- |
| Local archive (today) | `C:\Users\1\Documents\UMTUBA\Desktop-Agent-Archive\2026-08-13\Handoffs\DESKTOP_SESSION_ARTIFACT_PRESERVE_V1` | YES — hash MATCH verified for all preserved files |
| Prior day archive note | `C:\Users\1\Documents\UMTUBA\Desktop-Agent-Archive\2026-08-12\Handoffs\PRIOR_DAY_NOTE_SESSION_PRESERVE_V1.txt` | YES — prior day folder retained; pointer note added |
| SMB Central intake | `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_SESSION_ARTIFACT_PRESERVE_V1` | YES — reports + SHA256SUMS + README (AAB omitted) |
| Repo originals | `docs/ops/closeout\` | AUTHORITATIVE — unchanged in place |

## Return metrics

```
PRESERVE_COMPLETE = YES
ARCHIVE_DESTINATION = C:\Users\1\Documents\UMTUBA\Desktop-Agent-Archive\2026-08-13\Handoffs\DESKTOP_SESSION_ARTIFACT_PRESERVE_V1
SMB_DEPOSIT = YES
FILES_PRESERVED_COUNT = 80
AAB_PRESERVED = YES
AAB_PATH = C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-86c0d773.aab
CENTRAL_RECEIPT = NO
GOOGLE_PLAY_UPLOAD_PERFORMED = NO
FEATURE_IMPLEMENTATION_STARTED = NO
```

## AAB binary

| Field | Value |
| --- | --- |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-86c0d773.aab` |
| Size (bytes) | 102242186 |
| SHA256 | `1c3d41006f8834de09716049856589e5aae5dfc1ed74712c74e28e5a187d4671` |
| Status | LEFT_IN_PLACE |
| Optional Documents copy | SKIPPED — Skipped optional Documents copy due to size (~100MB); documented path+hash only. |
| SMB AAB | SKIPPED — size/policy (~100MB); path+hash recorded instead |

## Must-include checklist

| File | Present | Size | SHA256 |
| --- | --- | --- | --- |
| `DESKTOP_ANDROID_RELEASE_ARTIFACT_SEARCH_V1.md` | YES | 4463 | `417514845a89e4720cb32c59dd8eb85b85a5d5a60bbbd388c151970adb0ebc69` |
| `DESKTOP_ANDROID_RELEASE_BUILD_V1.md` | YES | 7438 | `287c373a5893c0d787802abdf73eef519bd09c0925ef6ab55e0c386e2f5fcb78` |
| `DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1.md` | YES | 8502 | `d7930b2c1d045f649df5e5e64aef55fb80e7febde10218a556464582068dd3a9` |
| `DESKTOP_ANDROID_EXPO_APP_CONFIG_COMMONJS_RECOVERY_V1.md` | YES | 3768 | `4188686f786ff640dc3ca6016ca145dded4111d02a7992cde39fe70c8fa8aaf8` |
| `DESKTOP_ANDROID_PRODUCTION_AAB_BUILD_V1.md` | YES | 4505 | `70c0a4ea4217f2491de375f49bca77103da14b3f7c2f6195afcd879404361631` |
| `DESKTOP_SUPPLIER_RESELLER_MARKETPLACE_GAP_AUDIT_V1.md` | YES | 23965 | `b97d2ed2136635ae6bf0b4b1e9d2823f5d1119497ec1486caa89e4bfbdb8b302` |
| `DESKTOP_FINAL_DEPOSIT_CLOSEOUT_V2.md` | YES | 8885 | `b3c35fdad03fce7597647b87a785e1f8bcae876b6c20edb6c178fb688fbf6868` |
| `DESKTOP_CENTRAL_HANDOFF_FINAL_DEPOSIT_CLOSEOUT_V2.md` | YES | 5844 | `987a918bbf02c1c1b1a99eb9e567a07b874587d1ce3b5c81b8010265b3f6dad6` |
| `DESKTOP_AUTH_CONTRACT_RECOVERY_WAVE_V1.md` | YES | 12860 | `9ffa0e2bc72370350405c4510bc18cd08c93eaee51847a61820b40d4c4a30ec0` |
| `DESKTOP_CENTRAL_HANDOFF_AUTH_CONTRACT_RECOVERY_WAVE_V1.md` | YES | 7829 | `49e7ae5f0adc3d914ca9bb4138f3dacaf17242bbc8964f45f20c9105a9b0dd96` |
| `DESKTOP_HETZNER_PRODUCTION_SECURITY_HARDENING_V1_REPORT.md` | YES | 14839 | `5576da029077d5615f936bee4e1f214a13a1112f587c131f346f319b9ae2c348` |
| `DESKTOP_CLOSEOUT_WAVE_3_V1.md` | YES | 15253 | `d6a6e5e2f18317060ed6b58b4842142f7f3353657996004cd9a0218c26ab2f14` |
| `DESKTOP_CENTRAL_HANDOFF_WAVE_3_V1.md` | YES | 8909 | `ad029efc61d73abaf3cf9ef1a3f9b96fa493d0debacb5f827e92b207c43008a8` |

## Full inventory (preserved)

| Path (source) | Size | SHA256 | Archive hash MATCH |
| --- | --- | --- | --- |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_commerce_key_shas.txt` | 467 | `fe48e689b090b08ea17a07ae3610ac6b45aa4654ddd8bb241c89c6a7fd123791` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_commerce_vitest_log.txt` | 143170 | `b8e53f5ea452adfa09d3ec1d31b2093033d89fee855b954c04ae3390bbb39fe8` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_commerce_wt_matrix.json` | 30869 | `eb6c56cbb03d75209ac61d64db040166ca465b264e9a8540463dc3a6067aea33` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_commerce_wt_matrix.tsv` | 10387 | `fd806c79080f95f99273787d10a45e844bc66203fbfc7d0694740d6f991416b6` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_stripe_refund_vitest_log.txt` | 7152 | `e0c2bd87942b310a1f2acf0be43fef7719c16f5dd6bff31aac65f3c54d462a47` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_wave2_stripe_refund_vitest_log.txt` | 7296 | `65dc5e7b2afa8accd6649d788d90058354c597072560ce2f7a1473dcb7dfe9a3` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a1_wave2_tip_money_vitest_log.txt` | 10668 | `5e313f7bd8e01ce5aef22707480b4cc3dd1d9fd862b6acfacaf1f861cd45f2bc` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a2_ai_worktree_matrix.csv` | 8216 | `be6570edf54e5942401840a56aecbd12afb05ae7348ae68aa34a6da7f4bf0538` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a2_ai_worktree_matrix.tsv` | 7967 | `48a8f96ebff31711b32c4e045df70468f3f9707c56eaf01405baca2d0167d238` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_final_detached.json` | 10214 | `630ef3f60282dd4b6d0abb1b345a782245a9507476c7e6389f027a97bdb2d440` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_final_dirty.json` | 5699 | `a2b4ebf7e85d429757c5b4e6c1bc93a5631baa11748e958c4f72730d1998260b` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_final_inventory_summary.json` | 417 | `7b7fc15e1731120437696f9c5cec33697b323d8ae6ad5a41d67410345633bc8e` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_final_worktree_list_porcelain.txt` | 23025 | `6a41a3df1b268d6b4ee42f227cb0ebe83acc09ecb7068114a9fd30f66c38fb96` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_final_worktree_matrix.json` | 61399 | `d5b6370f6c850327dbc9d0525ac28c6ae5587dd054cb6872b2c961d144e9a542` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_v2_detached.json` | 11292 | `ab31f8964bca37db6f619e6dd6950209c826a91547875f63e1891f7661204bd6` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_v2_dirty.json` | 6365 | `8adf52705bfaaeb298382d062dcfb8c1983615b0a867fff91cf0bce2d0977807` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_v2_inventory_summary.json` | 606 | `3077eab32459ccb7567f2efba3ac7bb20cf2ad3e9844289d32933fc97a9ab54a` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_v2_worktree_list_porcelain.txt` | 23025 | `6a41a3df1b268d6b4ee42f227cb0ebe83acc09ecb7068114a9fd30f66c38fb96` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\_a3_v2_worktree_matrix.json` | 68373 | `d2275b793410cd95bd5a54d7fe4efd9f3583382e11f2e2b118570697011a2d80` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_COMMERCE_BUYER_SELLER_A11Y_FINAL_CLOSEOUT_V1.md` | 9715 | `1ead50cdb7c5a362bba11959433b39f0776a1834bd537efe225ea1785c1e0bda` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_COMMERCE_COMPLETE_INVENTORY_CLOSEOUT_V1_REPORT.md` | 18824 | `09a1e98756073a4d7c4d7a27a148a6b83e8bd3cd9de3f66fb17dc939c2981257` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_COMMERCE_STRIPE_DIVERGENCE_CLOSEOUT_V1.md` | 9256 | `9f5fde1b9c6fd18c82600c398a3d0ee1c399640a1be4657d0fdd8ca965a7df34` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_LB003_HANDOFF_DEPOSIT_FINAL_V2.md` | 7239 | `92ebaa2d83e9204b8e7f4f6f093ca9f781ed697bba38eb0d88bf5587ff4a80d5` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_LB003_INSTRUCTOR_E2E_AUTH_CONTRACT_INDEX_V1.md` | 5038 | `73a3d551b347b9d8164a0145a9bde5fdf786ef782fe0dc7bb15d96a5dd36a10d` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A1_LB003_INSTRUCTOR_E2E_HANDOFF_RECOVERY_V1.md` | 9873 | `4bd48849f47f490a2d16c5edf7db19d6520b81216b9a7ac8d88efd2bf011f23e` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_CROSS_DEVICE_HANDOFF_DELIVERY_AUDIT_V1.md` | 8885 | `829f5584f5363ae56a8395a0f900fb2dc777c813dd7e124bbad53fdd86770af2` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_JINN_AI_LOCAL_RESIDUAL_FINAL_CLOSEOUT_V1.md` | 9670 | `765b7bf30a9620aedfea4636f469a20c2803ce9867de7e68624b18a620b25f59` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_JINN_AI_MEDIA_COMPLETE_INVENTORY_CLOSEOUT_V1_REPORT.md` | 19827 | `bb73f4bb698b8714317c46a6793a8d2b9794e93feed6b7a52db33d380932ab4b` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_JINN_EXTERNAL_GATE_CLOSEOUT_V1.md` | 16864 | `0c522a871b703be020ea64f3760e656526d21b60de28cdba07859b9cc184f2e3` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_JINN_OPERATOR_SERVER_EXECUTION_PACKET_V1.md` | 9612 | `e2d950904015d64ad0e866285305b94a5bcfefa12dc1f21f7583c7d49635efa1` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A2_SECURITY_EVIDENCE_DEPOSIT_FINAL_V2.md` | 8579 | `fabd9f8394578d2932e6da1b1ae1c5881396fcd7e6f2d21eda6e704fecf66e90` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_CROSS_DEVICE_COLLABORATION_E2E_HANDOFF_V1.md` | 2659 | `5e4229fdbf4cf61f93a5734b95d3c78f669985cf488bd0d9da1b8a7745d3eb5f` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_CROSS_DEVICE_LEARNING_INSTRUCTOR_E2E_HANDOFF_V1.md` | 2757 | `37e73bcd9a1a208acc3aa46155fa538816155136befc0d8ef00a396b38fdb4cf` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_CROSS_DEVICE_LEARNING_SPACES_MEMBERSHIP_UNPUSHED_HANDOFF_V1.md` | 1771 | `e1ca8611a339c8a245054cc400cb1afa0b631386d02cf6b7e85ea69e0577c583` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_CROSS_DEVICE_MOBILE_STALE_CHECKOUT_HANDOFF_V1.md` | 1720 | `9a0229700a4ec7534758741ecb0fc71d3830987370e1d6b617e476474705941e` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_CROSS_DEVICE_PRIVATE_SHARED_AI_ORPHAN_HANDOFF_V1.md` | 3126 | `66791e4c3e1287b60cc6aa4f1005784d5b1091887a521fd2c620798713d43740` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_DEVICE_WIDE_RELEASE_DRIFT_AUDIT_V1_REPORT.md` | 41597 | `e9fcae4445113a557980b8893e745cbfff6bad57bdbf07a2d1d792dd9334d645` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_DIRTY_WIP_FINAL_DISPOSITION_V1.md` | 15208 | `3b78928958edbe28d971f052aca3b0cb10d99d4493f3b36c2de868d76f96d350` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_FINAL_ARCHIVE_AND_DRIFT_GUARD_V1.md` | 14789 | `ba94d6330020df88c4d3f205cfd085ae906432521cd9592edf1bb0ad868c5c0d` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_FINAL_RELEASE_DRIFT_GUARD_V2.md` | 10214 | `2a2f89f7f6713c6f670063c5a72b515236ccaf64bdefd5e6724fb4d93d794f48` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_git_markers.txt` | 9726 | `ec036b37958e310ec492c8cbb9058968612faf4df0d35a2bf70269da141b7828` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_matrix_table.md` | 23335 | `53add204184d34ee7175ddb3e7b447ff1b2a3730f0fe57e7c3efd673feec49fa` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_PROFILE_HERO_INTEGRATION_PACKET_V1.md` | 3092 | `0e6d075b5732e1044b4712407592f2f0e7850045f03ae6b8c57656362872da4c` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_STATE_DRIFT_ORPHAN_TRIAGE_CLOSEOUT_V1.md` | 10898 | `186e9fc43cdbdd1808d78890dd3480b1b8072a157a5927491774b4967b2ef226` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_behind.json` | 915 | `4f7d02264295a833276d6a0eff0dfc23f800fd6382d30c81beb551579dd3cc80` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_detached.json` | 4027 | `f8f4f2b53e3ecba9d7a030e3d7f8cd9e0b37762f989a7125cd2a1f808d8fd5f3` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_dirty.json` | 5273 | `8718f7730b54e5059148c2e0f96afc87adf9669cb3172c2f66facf4690c0a2db` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_doc_sha_scan.json` | 51574 | `93ba9b5ffb32fdce7ee19b3053443ce7d7e623751a7cfa5086ab6966ca230ac1` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_inventory_summary.json` | 206 | `a91fe133cda3c02a0604b9854c4ae2026e479c4c109361f03249c8d8c594c129` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_no_upstream.json` | 2641 | `41db49c5c9f4147cf03bfae2f614eaf03dbf02d04e5eee5813652c2bb6a21ed5` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_worktree_list_porcelain.txt` | 23025 | `32f8bf501dc01c3f087c708d9b5c4ede1561005318ab4451dae503eff8812498` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_worktree_matrix.csv` | 24860 | `92c9b9d9bbc32e0a1e6f92e12c8f5fe1bbc36770c244fe46162ba29deb838dfe` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W2_worktree_matrix.jsonl` | 56585 | `227814c57c4cc38291d350c37a38ce81903f801762eee8e640b17924f61b4a96` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_behind.json` | 1848 | `e95eb05afd1f485d91a09496180673807069b9da03111c8313c6f35037f3e2f6` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_detached.json` | 7910 | `df86d97c6d9e31e11fc81d83d1b31286c66494607a01f9f78d85e58dfca0e711` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_dirty.json` | 5225 | `0cb33d338dd33216063e6662e3bf0f7d1142a068dc27066bbbc370f12124d7ea` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_inventory_summary.json` | 416 | `5aae6839474754ffac1ddd90de417610dd2d7b78b9506900ae084baccd88e643` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_no_upstream.json` | 5840 | `6be5eeee847b16826fd14b33f56d2f9d20a8869eba8bbfc42244a378d54f2cce` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_worktree_list_porcelain.txt` | 23025 | `32f8bf501dc01c3f087c708d9b5c4ede1561005318ab4451dae503eff8812498` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_W3_worktree_matrix.jsonl` | 68697 | `2a7da53109e78157d6c3e0100d449400dfca7d675eb96ca3932a37237c4052b6` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_worktree_list.txt` | 18893 | `b128033669f4aec918975f0e176f71aaa9de690eb1a9a29ab3e0c7e9b2412097` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_worktree_list_porcelain.txt` | 23025 | `32f8bf501dc01c3f087c708d9b5c4ede1561005318ab4451dae503eff8812498` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_worktree_matrix.csv` | 47166 | `b5d11f1236ed4b39ed9823e416b7b503d6aeb03df5d24281223d2a290f745958` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_A3_worktree_matrix.jsonl` | 69475 | `7f19b359753bcc0db80f0d53d53e1d7b7e9691d1ffd1ac58707efc2a37af9160` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_ANDROID_EXPO_APP_CONFIG_COMMONJS_RECOVERY_V1.md` | 3768 | `4188686f786ff640dc3ca6016ca145dded4111d02a7992cde39fe70c8fa8aaf8` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_ANDROID_PRODUCTION_AAB_BUILD_V1.md` | 4505 | `70c0a4ea4217f2491de375f49bca77103da14b3f7c2f6195afcd879404361631` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_ANDROID_RELEASE_ARTIFACT_SEARCH_V1.md` | 4463 | `417514845a89e4720cb32c59dd8eb85b85a5d5a60bbbd388c151970adb0ebc69` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1.md` | 8502 | `d7930b2c1d045f649df5e5e64aef55fb80e7febde10218a556464582068dd3a9` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_ANDROID_RELEASE_BUILD_V1.md` | 7438 | `287c373a5893c0d787802abdf73eef519bd09c0925ef6ab55e0c386e2f5fcb78` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_AUTH_CONTRACT_RECOVERY_WAVE_V1.md` | 12860 | `9ffa0e2bc72370350405c4510bc18cd08c93eaee51847a61820b40d4c4a30ec0` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CENTRAL_HANDOFF_AUTH_CONTRACT_RECOVERY_WAVE_V1.md` | 7829 | `49e7ae5f0adc3d914ca9bb4138f3dacaf17242bbc8964f45f20c9105a9b0dd96` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CENTRAL_HANDOFF_FINAL_DEPOSIT_CLOSEOUT_V2.md` | 5844 | `987a918bbf02c1c1b1a99eb9e567a07b874587d1ce3b5c81b8010265b3f6dad6` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CENTRAL_HANDOFF_WAVE_2_V1.md` | 6015 | `4b2c49669e2986eb2ed66e525979488fc72c35afae795ba007cb96ac425f4cfd` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CENTRAL_HANDOFF_WAVE_3_V1.md` | 8909 | `ad029efc61d73abaf3cf9ef1a3f9b96fa493d0debacb5f827e92b207c43008a8` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CLOSEOUT_WAVE_2_V1.md` | 15288 | `b5b4c74cc9648b7f2c06e33e11c3e3b9b976c36048293e7af703e9e9bf9a5662` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_CLOSEOUT_WAVE_3_V1.md` | 15253 | `d6a6e5e2f18317060ed6b58b4842142f7f3353657996004cd9a0218c26ab2f14` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_FINAL_DEPOSIT_CLOSEOUT_V2.md` | 8885 | `b3c35fdad03fce7597647b87a785e1f8bcae876b6c20edb6c178fb688fbf6868` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_FULL_PLATFORM_INVENTORY_CLOSEOUT_V1.md` | 28653 | `3d9a6f7a9d39873cdad6e5617e605af9d7bd653a6b424254e51788cfecab6ddf` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_HETZNER_PRODUCTION_SECURITY_HARDENING_V1_REPORT.md` | 14839 | `5576da029077d5615f936bee4e1f214a13a1112f587c131f346f319b9ae2c348` | True |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\DESKTOP_SUPPLIER_RESELLER_MARKETPLACE_GAP_AUDIT_V1.md` | 23965 | `b97d2ed2136635ae6bf0b4b1e9d2823f5d1119497ec1486caa89e4bfbdb8b302` | True |

## Hash verification

- Local archive vs source: **ALL MATCH** = True
- SMB sample verification (first 5 files): **PASS** (SMB_OK=True)
- Package `SHA256SUMS.txt` written at archive and SMB package roots

## Skipped / not done

| Item | Why |
| --- | --- |
| AAB copy into Documents archive | Too large (~100MB); LEFT_IN_PLACE with path/size/SHA256 |
| AAB on SMB | Same size/share policy; reports-only deposit |
| CENTRAL_RECEIPT | Not invented; no proven Central receipt artifact |
| Google Play upload | Forbidden in MODE |
| Feature implementation / AAB rebuild / server mutation | Forbidden in MODE |
| `_port_extract` | Permanently protected — not touched |
| Secrets / keystores / .env / private keys | Explicitly excluded from collection |

## Counts

- DESKTOP_*.md reports: 40
- Supporting closeout evidence (json/jsonl/txt/csv/tsv): 40
- Total files preserved to archive package: 80
- Plus package meta: README_INDEX.md, SHA256SUMS.txt, _preserve_summary.json, _preserve_inventory.json

