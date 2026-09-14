# حالة مشروع أمتوبا

**التاريخ:** الأحد 13 أيلول 2026
**خط الإنتاج (البرانش = نسخة العمل التي يُنشر منها الموقع):** `origin/alpha-0.2`
**آخر كوميت (حفظة) على خط الإنتاج:** `9080b79c` بتاريخ 10 أيلول 2026 — «عرض كتالوج المتجر المعتمد 540 منتجاً».
**عدد برانشات الأصل بعد الجلب:** 600 (مع خط الإنتاج).

هذا الملف للمالك. كُتب من فحص فعلي للفروع والملفات، لا من التخمين. إذا لم يُؤكَّد شيء كُتب: غير معروف.

كلمات تظهر مرة واحدة بشرح:

- **برانش:** نسخة عمل من المشروع يمكن تطويرها وحدها.
- **كوميت:** حفظة واحدة للتغييرات.
- **أمام خط الإنتاج:** عدد الحفظات الموجودة هنا وغير الموجودة في ألفا.
- **خلف خط الإنتاج:** عدد حفظات ألفا التي لا يملكها هذا البرانش (يعني قديم).
- **دمج:** إدخال الشغل في خط الإنتاج.
- **مايغريشن:** ملف يغيّر قاعدة البيانات.

---

## 1 — البرانشات

كل برانشات `origin/*` بعد `git fetch origin --prune`. كل مجموعة مرتّبة من الأحدث للأقدم.

عمود الوصف مبني على سجل الحفظات والملفات عندما فُحصت، وإلا على آخر حفظة + هل فيها شغل فريد.

### المتجر (146 مع خط الإنتاج)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `alpha-0.2` | 2026-09-10 | +0 | -0 | خط الإنتاج الحالي نفسه. فيديوهات ومتجر 540 وتعلّم ورسائل وبث وحياة أم وعالم معلّق. |
| `store/540-full-production-release-v1` | 2026-09-10 | +0 | -0 | نفس خط الإنتاج حرفياً (نفس الكوميت). كتالوج المتجر المعتمد 540 منتجاً. |
| `central/deploy-approved-store-onto-live-a29-v1` | 2026-08-24 | +0 | -9 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/deploy-approved-store-candidate-from-origin-v1` | 2026-08-24 | +2 | -12 | تصميم المتجر المعتمد قبل كتالوج 540. جزء كبير منه صار داخل ألفا. |
| `office/pc2-umtuba-store-approved-design-productization-v1` | 2026-08-24 | +1 | -12 | إيداع تصميم المتجر المعتمد. مضمّن في مرشّح النشر أعلاه ثم في ألفا. |
| `central/store-seller-approval-admin-v1` | 2026-08-23 | +2 | -12 | موافقة الإدارة على البائعين + سجل مراجعة. فيه ملف قاعدة بيانات اسمه أيضاً 20260935 لكنه للمتجر وليس للملف الشخصي. |
| `central/store-catalog-productization-from-desktop-v1` | 2026-08-18 | +0 | -42 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/combined-sandbox-store-learning-v1` | 2026-08-18 | +0 | -43 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/store-full-sandbox-product-v2` | 2026-08-18 | +2 | -46 | طبقة بيئة التجريب الخاصة غير المدمجة على قاعدة أقدم. |
| `central/store-private-demo-preview-on-8f39277b-v1` | 2026-08-18 | +0 | -46 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/store-private-demo-preview-access-on-a085f667-v1` | 2026-08-18 | +1 | -48 | قفل المعاينة التجريبية للمتجر (مدير أو رمز سرّي) على قاعدة أقدم. |
| `central/store-private-demo-preview-access-v1` | 2026-08-18 | +1 | -49 | قفل المعاينة التجريبية للمتجر (مدير أو رمز سرّي) على قاعدة أقدم. |
| `central/store-private-demo-preview-on-a085f667-v1` | 2026-08-18 | +0 | -48 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/store-i18n-on-live-e6b23cc-v1` | 2026-08-18 | +0 | -49 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/store-i18n-on-ja09-v1` | 2026-08-18 | +2 | -50 | تعريب واجهة المشتري وقفل المعاينة التجريبية على قاعدة أقدم. |
| `central/store-live-localization-demo-preview-v1` | 2026-08-18 | +1 | -51 | تعريب واجهة المشتري وقفل المعاينة التجريبية على قاعدة أقدم. |
| `central/store-learning-precompany-foundation-v2` | 2026-08-18 | +3 | -52 | أساس محتوى أصلي قبل الشركة + كتالوج تجريبي + حزمة شركاء للمتجر والتعلّم. |
| `central/a3-learning-store-accept-deploy-v1` | 2026-08-15 | +0 | -61 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-partial-refund-provider-money-execution-v1` | 2026-08-12 | +105 | -282 | أحدث طرف لسلسلة التجارة الكاملة: استرجاع جزئي + سترايب تجريبي + مخزون + عمولة (565 ملفاً فوق ألفا، متأخر 282). |
| `office/desktop-a3-commerce-seller-ops-filter-status-a11y-contract-v1` | 2026-08-12 | +104 | -282 | نفس سلسلة التجارة تقريباً حتى عقود وصولية عمليات البائع. |
| `office/commerce-buyer-cart-wishlist-search-a11y-ui-contract-v1` | 2026-08-12 | +104 | -282 | نفس سلسلة التجارة حتى عقود وصولية السلة والبحث. |
| `office/desktop-a2-stripe-operator-readiness-evidence-pack-v1` | 2026-08-10 | +103 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-dependency-chain-integration-proof-v1` | 2026-08-10 | +102 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-commerce-release-candidate-final-regression-pack-v1` | 2026-08-10 | +103 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-external-prerequisite-operator-packet-v1` | 2026-08-10 | +101 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-controlled-execution-final-precheck-v1` | 2026-08-10 | +98 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-release-candidate-safety-matrix-v1` | 2026-08-10 | +99 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-activation-dry-run-orchestration-v1` | 2026-08-10 | +97 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-reconciliation-terminal-e2e-matrix-v1` | 2026-08-10 | +98 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-terminal-state-replay-invariants-v1` | 2026-08-10 | +96 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-activation-state-machine-regression-invariants-v1` | 2026-08-10 | +96 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-activation-state-machine-safety-v1` | 2026-08-09 | +95 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-idempotency-replay-safety-v1` | 2026-08-09 | +95 | -282 | طبقة سلسلة التجارة: اختبار استرجاع (رسالة الحفظة ناقصة) |
| `office/desktop-a2-stripe-test-control-plane-hardening-v1` | 2026-08-09 | +93 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-reconciliation-recovery-safety-v1` | 2026-08-09 | +94 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a2-stripe-controlled-test-pre-activation-safety-v1` | 2026-08-09 | +94 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-reconciliation-runtime-hardening-v1` | 2026-08-09 | +93 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a3-refund-provider-observability-readiness-v1` | 2026-08-09 | +92 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-offline-preflight-validator-v1` | 2026-08-09 | +90 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-fixture-pack-regression-v1` | 2026-08-09 | +89 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-fixture-pack-v1` | 2026-08-09 | +88 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/desktop-a2-stripe-test-fixture-env-readiness-v1` | 2026-08-09 | +89 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة سترايب (دفع تجريبي) على قاعدة قديمة. |
| `office/commerce-partial-refund-committed-reservation-compensation-v1` | 2026-08-07 | +84 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-in-flight-committing-visibility-v1` | 2026-08-07 | +83 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-reservation-stuck-committing-recovery-v1` | 2026-08-06 | +80 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-reservation-accounting-audit-review-v1` | 2026-08-06 | +79 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-reservation-actions-wiring-v1` | 2026-08-06 | +78 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-ledger-service-adapter-v1` | 2026-08-06 | +77 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-rpc-remote-apply-readiness-v1` | 2026-08-06 | +76 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/platform-commerce-learning-chrome-wiring-v1` | 2026-08-06 | +5 | -206 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-partial-refund-ledger-commit-boundary-v1` | 2026-08-06 | +74 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-partial-refund-path-v1` | 2026-08-06 | +73 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-seller-live-payout-manual-ops-drill-v1` | 2026-08-06 | +72 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-seller-live-payout-provider-v1` | 2026-08-06 | +71 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-remote-migration-blocker-remediation-v1` | 2026-08-05 | +38 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-chain-migration-apply-readiness-v1` | 2026-08-05 | +37 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-sot-unification-stock-drift-v1` | 2026-08-02 | +62 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون على قاعدة قديمة. |
| `office/cancellation-stock-release-safety-audit-v1` | 2026-08-02 | +56 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون على قاعدة قديمة. |
| `office/commerce-chain-remote-preflight-recheck-v1` | 2026-08-02 | +39 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-migration-history-repair-apply-v1` | 2026-08-02 | +39 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/refund-stock-restock-runtime-v1` | 2026-08-02 | +55 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-migration-history-drift-verification-v1` | 2026-08-02 | +38 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/refund-stock-restock-foundation-v1` | 2026-08-02 | +54 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-remote-migration-preflight-v1-current` | 2026-08-02 | +36 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-chain-migration-apply-readiness-v1-current` | 2026-08-02 | +35 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/purchase-stock-decrement-runtime-v1` | 2026-08-02 | +53 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون على قاعدة قديمة. |
| `office/commerce-commission-policy-activation-v1-current` | 2026-08-02 | +34 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/commerce-commission-decomposition-bridge-apply-v1-current` | 2026-08-02 | +33 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/purchase-stock-decrement-v1` | 2026-08-02 | +52 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون على قاعدة قديمة. |
| `office/commerce-digital-entitlement-revoke-on-refund-v1-current` | 2026-08-02 | +32 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-refund-operations-surface-v1-current` | 2026-08-02 | +31 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/seller-inventory-movement-ledger-v1` | 2026-08-02 | +51 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-seller-payout-rails-v1-current` | 2026-08-02 | +30 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-transactional-notifications-v1-current` | 2026-08-02 | +29 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/seller-inventory-adjustment-v1` | 2026-08-02 | +50 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-live-payment-production-gate-v1-current` | 2026-08-02 | +28 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-product-production-readiness-audit-v1-current` | 2026-08-02 | +27 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/seller-inventory-reservation-v1` | 2026-08-02 | +49 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-production-integration-preparation-v1` | 2026-08-02 | +26 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/seller-inventory-quantity-v1` | 2026-08-02 | +48 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-supplier-listing-create-hardening-v1` | 2026-08-02 | +25 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/seller-inventory-availability-v1` | 2026-08-02 | +47 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-catalog-category-taxonomy-seed-v1` | 2026-08-02 | +24 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/seller-catalog-category-short-description-v1` | 2026-08-02 | +46 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-bulk-field-editing-v1` | 2026-08-02 | +45 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-bulk-operations-v1` | 2026-08-01 | +44 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-pagination-experience-v1` | 2026-08-01 | +43 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-data-access-v1` | 2026-08-01 | +42 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-search-filtering-v1` | 2026-08-01 | +41 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-performance-batching-v1` | 2026-08-01 | +40 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-catalog-wiring-v1` | 2026-08-01 | +39 | -282 | طبقة من سلسلة التجارة غير المدمجة: كتالوج البائع على قاعدة قديمة. |
| `office/seller-experience-foundation-v1` | 2026-08-01 | +38 | -282 | طبقة من سلسلة التجارة غير المدمجة: تجربة البائع على قاعدة قديمة. |
| `office/commerce-physical-foundation-v1` | 2026-08-01 | +37 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-remote-migration-preflight-v1` | 2026-08-01 | +37 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-launch-readiness-v1` | 2026-08-01 | +36 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-commission-policy-activation-v1` | 2026-08-01 | +35 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/commerce-digital-entitlement-revoke-on-refund-v1b` | 2026-08-01 | +73 | -263 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-commission-decomposition-bridge-apply-v1` | 2026-08-01 | +32 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/commerce-digital-entitlement-revoke-on-refund-v1` | 2026-08-01 | +31 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-refund-operations-surface-v1` | 2026-07-31 | +30 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-seller-payout-rails-v1` | 2026-07-31 | +29 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-revenue-commission-decomposition-bridge-apply-v1` | 2026-07-31 | +28 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/commerce-transactional-notifications-v1` | 2026-07-31 | +28 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-live-payment-production-gate-v1` | 2026-07-31 | +27 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-product-production-readiness-audit-v1` | 2026-07-31 | +27 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-marketplace-supplier-listing-create-hardening-v1` | 2026-07-31 | +26 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-inventory-seller-availability-foundation-v1` | 2026-07-31 | +24 | -282 | طبقة من سلسلة التجارة غير المدمجة: مخزون وحجز الكمية على قاعدة قديمة. |
| `office/commerce-payments-full-order-refund-path-v1` | 2026-07-31 | +22 | -282 | طبقة من سلسلة التجارة غير المدمجة: استرجاع أموال على قاعدة قديمة. |
| `office/commerce-settlement-payout-booking-ops-helpers-v1` | 2026-07-31 | +21 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-revenue-commission-policy-foundation-v1` | 2026-07-31 | +20 | -282 | طبقة من سلسلة التجارة غير المدمجة: عمولة المنصّة على قاعدة قديمة. |
| `office/commerce-settlement-seller-payout-eligibility-surface-v1` | 2026-07-31 | +19 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-settlement-payout-reconciliation-surface-v1` | 2026-07-31 | +18 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-settlement-seller-payout-history-surface-v1` | 2026-07-31 | +17 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-settlement-payout-reconciliation-read-v1` | 2026-07-31 | +16 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-revenue-payout-balance-visibility-v1` | 2026-07-31 | +15 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-settlement-seller-payout-read-model-v1` | 2026-07-31 | +14 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/commerce-settlement-seller-payout-foundation-v1` | 2026-07-31 | +13 | -282 | طبقة من سلسلة التجارة غير المدمجة: صرف أرباح البائع على قاعدة قديمة. |
| `office/perf-store-query-optimization-v1` | 2026-07-31 | +12 | -282 | طبقة تسريع أداء غير مدمجة على قاعدة قديمة. |
| `office/commerce-digital-product-versioning-update-delivery-v1` | 2026-07-30 | +11 | -282 | طبقة من سلسلة التجارة غير المدمجة: منتج رقمي وتسليم بعد الشراء على قاعدة قديمة. |
| `office/commerce-buyer-delivery-post-purchase-flow-v1` | 2026-07-30 | +10 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-digital-product-publish-readiness-v1` | 2026-07-30 | +9 | -282 | طبقة من سلسلة التجارة غير المدمجة: منتج رقمي وتسليم بعد الشراء على قاعدة قديمة. |
| `office/commerce-seller-digital-product-asset-upload-v1` | 2026-07-30 | +8 | -282 | طبقة من سلسلة التجارة غير المدمجة: منتج رقمي وتسليم بعد الشراء على قاعدة قديمة. |
| `office/commerce-buyer-digital-access-delivery-v1` | 2026-07-30 | +7 | -282 | طبقة من سلسلة التجارة غير المدمجة: منتج رقمي وتسليم بعد الشراء على قاعدة قديمة. |
| `office/commerce-post-capture-settlement-release-v1` | 2026-07-30 | +6 | -282 | طبقة من سلسلة التجارة غير المدمجة: تسوية الأرباح على قاعدة قديمة. |
| `office/commerce-post-capture-digital-entitlement-grant-v1` | 2026-07-30 | +5 | -282 | طبقة من سلسلة التجارة غير المدمجة: منتج رقمي وتسليم بعد الشراء على قاعدة قديمة. |
| `office/commerce-post-capture-settlement-allocate-v1` | 2026-07-30 | +3 | -282 | طبقة من سلسلة التجارة غير المدمجة: تسوية الأرباح على قاعدة قديمة. |
| `office/commerce-live-payment-capture-adapter-v1` | 2026-07-30 | +2 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `office/commerce-marketplace-listing-provenance-hardening-v1` | 2026-07-30 | +1 | -282 | طبقة من سلسلة التجارة غير المدمجة (دفع/طلب/سوق) على قاعدة قديمة. |
| `integration/w2-commerce` | 2026-07-29 | +0 | -258 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-end-to-end-beta-readiness-v1` | 2026-07-28 | +0 | -282 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-marketplace-eligibility-listing-storefront-v1` | 2026-07-28 | +0 | -283 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-marketplace-supplier-seller-foundation-v1` | 2026-07-28 | +0 | -284 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-revenue-ledger-bridge-foundation-v1` | 2026-07-28 | +0 | -285 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-trading-domain-alignment-integrity-v1` | 2026-07-28 | +0 | -286 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-seller-dashboard-insights-v1` | 2026-07-28 | +0 | -287 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-seller-inventory-reservation-visibility-v1` | 2026-07-28 | +0 | -288 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-seller-catalog-product-management-v1` | 2026-07-28 | +0 | -289 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-seller-orders-operations-v1` | 2026-07-28 | +0 | -290 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-buyer-orders-experience-v1` | 2026-07-28 | +0 | -291 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-cart-checkout-experience-v1` | 2026-07-28 | +0 | -292 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/commerce-premium-storefront-experience-foundation-v1` | 2026-07-28 | +0 | -293 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/games-hub-catalog-data-wiring-v1` | 2026-07-24 | +2 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/store-commerce-safety-inventory-reservation-v1` | 2026-07-21 | +0 | -408 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/store-commerce-safety-inventory-v1` | 2026-07-20 | +3 | -410 | دليل تشغيل حجوزات المخزون. متأخر جداً. |
| `office/store-hardening-v1` | 2026-07-20 | +0 | -410 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/store-marketplace-v2` | 2026-07-19 | +0 | -425 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |

### التعلّم (154)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `desktop/learning-hub-v2-owner-pass-freeze-v1` | 2026-09-10 | +10 | -2 | لوحة تعلّم موحّدة جديدة لصفحة /learning + جدولة فردية بدون دفع + سوق شركاء الدورات. غير موجود على خط الإنتاج. |
| `learning/partner-marketplace-2026-09-09-import-v1` | 2026-09-10 | +1 | -2 | أساس سوق شركاء الدورات (مقارنة، شهادات، حفظ، صفحة تجريبية). مضمّن أيضاً داخل برانش لوحة التعلّم الأحدث. |
| `desktop/learning-intermittent-blank-loading-v1-live` | 2026-08-24 | +0 | -8 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `desktop/learning-intermittent-blank-loading-v1` | 2026-08-24 | +1 | -11 | إصلاح الشاشة البيضاء في التعلّم. الإصلاح وصل ألفا بكوميت مختلف؛ هذا البرانش متأخر 11 كوميت. |
| `desktop/learning-staged-production-deploy-v1` | 2026-08-24 | +0 | -11 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/learning-teacher-student-platform-v1` | 2026-08-23 | +1 | -12 | منصّة معلّم/طالب (تقديم، دورات، أرباح، تقييمات). الصفحات وملف 20260934 موجودان على ألفا؛ هذا كوميت مرشّح إضافي متأخر 12. |
| `central/web-perf-learning-autoplay-translation-v1` | 2026-08-22 | +0 | -20 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/learning-sandbox-exercise-runtime-fix-v1` | 2026-08-19 | +0 | -40 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/learning-executable-sandbox-v2` | 2026-08-18 | +1 | -46 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `central/learning-ja09-on-722ed3e5-v1` | 2026-08-18 | +0 | -48 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/learning-ja09-enroll-localization-v1` | 2026-08-18 | +1 | -50 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `central/learning-lesson-404-v1` | 2026-08-18 | +0 | -50 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/central-a1-learning-final-premium-integration-v1` | 2026-08-15 | +0 | -73 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-ai-tutor-learner-ui-integration-v1` | 2026-08-13 | +51 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/laptop-a1-learning-catalog-card-link-semantics-empty-state-v1` | 2026-08-11 | +49 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/laptop-a3-learning-content-block-safe-render-contract-tests-v1` | 2026-08-11 | +48 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/laptop-a1-learning-accessibility-audit-quickwins-v1` | 2026-08-11 | +17 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `agent/laptop-learning-agent-3/learning-production-readiness-final-reconciliation-v4` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-beta-runtime-post-gate-execution-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-final-release-evidence-reconciliation-v3` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-external-final-status-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-execution-readiness-final-v2` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-2/learning-beta-runtime-post-gate-validation-plan-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-external-dependency-closure-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-final-checklist-automation-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-beta-smoke-execution-plan-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-runtime-final-independent-closure-v3` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-beta-external-dependency-closure-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-final-package-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-beta-user-experience-final-hardening-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-documentation-and-operator-evidence-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-post-migration-verification-readiness-finalization-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-runtime-final-release-closure-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-final-evidence-reconciliation-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-post-migration-execution-or-blocker-closeout-v1` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-domain-regression-root-cause-and-closeout-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-beta-runtime-non-migration-hardening-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-surface-integrity-and-negative-path-closeout-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-runtime-release-closure-execution-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-final-release-owner-action-map-v2` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-final-gate-monitoring-and-execution-v1` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-2/learning-runtime-e2e-release-closure-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-final-blocker-execution-map-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-final-verification-after-gate-v1` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-migration-state-final-confirmation-v1` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-3/learning-release-final-evidence-consolidation-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-2/learning-execution-map-blocker-owner-closeout-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-post-migration-verification-execution-v1` | 2026-08-10 | +48 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-3/learning-production-readiness-blocker-execution-map-v1` | 2026-08-10 | +48 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `central/learning-canonical-domain-regression-remediation-v1` | 2026-08-10 | +47 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `agent/laptop-learning-agent-3/learning-release-readiness-final-evidence-board-v1` | 2026-08-10 | +47 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-post-central-migration-verification-runbook-v1` | 2026-08-10 | +47 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-3/learning-certification-release-blocker-triage-matrix-v1` | 2026-08-10 | +47 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-beta-runtime-e2e-release-evidence-preparation-v1` | 2026-08-10 | +47 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-release-blocker-evidence-refresh-v1` | 2026-08-10 | +47 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-post-migration-verification-preparation-v1` | 2026-08-10 | +47 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-pre-apply-application-contract-regression-v1` | 2026-08-10 | +47 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-3/learning-release-candidate-blocker-matrix-v1` | 2026-08-10 | +47 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-certification-post-migration-execution-readiness-v1` | 2026-08-10 | +47 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-migration-execution-packet-finalization-v1` | 2026-08-10 | +39 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-3/learning-production-readiness-exit-audit-v1` | 2026-08-10 | +39 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-3/learning-certification-end-to-end-pre-persistence-regression-matrix-v1` | 2026-08-10 | +36 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-verification-public-read-model-readiness-v1` | 2026-08-10 | +36 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-issuance-service-contract-and-test-pack-v1` | 2026-08-10 | +33 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-certification-eligibility-to-issuance-boundary-e2e-v1` | 2026-08-10 | +32 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-persistence-migration-readiness-contract-v1` | 2026-08-10 | +31 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-certification-eligibility-idempotency-negative-path-v1` | 2026-08-10 | +31 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-course-completion-certification-eligibility-contract-v1` | 2026-08-10 | +31 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certificate-issuance-foundation-implementation-readiness-v1` | 2026-08-10 | +31 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/desktop-a1-jinn-video-pilot-ingest-precheck-automation-v1` | 2026-08-09 | +1 | -162 | طبقة مسار جِنّ (فيديو/تعلّم) غير مدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certificate-verification-duplicate-issuance-contract-v1` | 2026-08-09 | +27 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-assessment-retry-idempotency-result-safety-v1` | 2026-08-09 | +27 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-assessment-progress-completion-consistency-v1` | 2026-08-09 | +24 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-certification-foundation-scope-runtime-readiness-v1` | 2026-08-09 | +24 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-instructor-assessment-authoring-to-learner-runtime-e2e-v1` | 2026-08-09 | +24 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-learner-course-completion-certification-readiness-v1` | 2026-08-09 | +24 | -275 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-instructor-learner-course-lifecycle-e2e-v1` | 2026-08-09 | +21 | -275 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-learning-agent-1/learning-learner-progress-completion-runtime-hardening-v1` | 2026-08-09 | +21 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-learning-agent-1/learning-jinn-assessment-runtime-e2e-hardening-v1` | 2026-08-09 | +21 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `agent/laptop-collaboration-agent-2/learning-instructor-authoring-runtime-completeness-v1` | 2026-08-09 | +21 | -275 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/learning-ds-foundation-v1` | 2026-08-09 | +18 | -275 | طبقة سلسلة التجارة: اختبار استرجاع (رسالة الحفظة ناقصة)(learning-ds): include ds foundation tests in vitest config |
| `agent/laptop-learning-agent-1/learning-jinn-runtime-blocker-fix-e2e-v1` | 2026-08-09 | +17 | -275 | طبقة توثيق/اختبار جاهزية التعلّم على قاعدة قديمة. مكرّرة مع باقي وكلاء التعلّم. |
| `office/collaboration-workspace-resource-link-learning-binding-v1` | 2026-08-08 | +28 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/learning-lesson-engine-o-course-rpc-hotfix-v1` | 2026-08-07 | +41 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-resume-accessible-target-hardening-v1` | 2026-08-07 | +41 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-structured-course-import-foundation-v1` | 2026-08-07 | +41 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-lesson-bookmarks-v1` | 2026-08-07 | +39 | -275 | طبقة إشارات الدرس غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-due-ux-followthrough-v1` | 2026-08-07 | +36 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-instructor-content-block-authoring-expansion-v1` | 2026-08-07 | +34 | -275 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-personal-notes-hub-v1` | 2026-08-07 | +33 | -275 | طبقة ملاحظات الدرس غير المدمجة على قاعدة قديمة. |
| `office/learning-accessibility-contract-suite-v1` | 2026-08-06 | +28 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-assessment-due-dates-calendar-v1` | 2026-08-06 | +31 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-personal-notes-foundation-v1` | 2026-08-06 | +29 | -275 | طبقة ملاحظات الدرس غير المدمجة على قاعدة قديمة. |
| `office/learning-personal-notes-migration-section-course-fix-v1` | 2026-08-06 | +30 | -275 | طبقة ملاحظات الدرس غير المدمجة على قاعدة قديمة. |
| `office/learning-public-catalog-ui-contract-suite-v1` | 2026-08-06 | +27 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-assessment-runtime-ui-contract-suite-v1` | 2026-08-06 | +26 | -275 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-instructor-ui-contract-suite-v1` | 2026-08-06 | +25 | -275 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-learner-ui-contract-suite-v1` | 2026-08-06 | +24 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-attempt-player-autosave-flush-coverage-v1` | 2026-08-06 | +23 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-e2e-fixture-provisioning-v1` | 2026-08-06 | +22 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-browser-e2e-foundation-v1` | 2026-08-06 | +21 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-content-block-render-test-coverage-v1` | 2026-08-06 | +20 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-production-smoke-e2e-gate-onto-sot-v1` | 2026-08-06 | +19 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-lesson-engine-composite-access-fix-v1` | 2026-08-06 | +18 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-production-smoke-e2e-gate-v1` | 2026-08-05 | +9 | -275 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-ai-tutor-thread-lesson-binding-v1` | 2026-08-05 | +8 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-collaboration-smoke-e2e-readiness-v1` | 2026-08-03 | +16 | -275 | طبقة سلسلة التجارة: اختبار استرجاع (رسالة الحفظة ناقصة)(collaboration): add smoke e2e readiness v1 |
| `office/learning-collaboration-workspace-activity-timeline-foundation-v1` | 2026-08-03 | +17 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/learning-collaboration-workspace-attachments-foundation-v1` | 2026-08-02 | +13 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/learning-collaboration-workspace-spine-foundation-v1` | 2026-08-02 | +12 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-thread-lifecycle-foundation-v1` | 2026-07-31 | +10 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-structured-oversize-serialization-v1` | 2026-07-31 | +9 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-thread-resume-history-v1` | 2026-07-31 | +8 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/perf-learning-catalog-optimization-v1` | 2026-07-31 | +13 | -282 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/platform-translation-learning-foundation-v1` | 2026-07-30 | +18 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/ai-tutor-provider-reconciliation-v1` | 2026-07-30 | +8 | -263 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-thread-metadata-read-v1` | 2026-07-30 | +6 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-thread-persistence-bridge-v1` | 2026-07-30 | +5 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-explain-again-v1` | 2026-07-29 | +4 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-ai-tutor-backend-foundation-v1` | 2026-07-29 | +3 | -275 | طبقة المعلّم الذكي في التعلّم غير المدمجة على قاعدة قديمة. |
| `office/profile-courses-products-structure-v1` | 2026-07-28 | +0 | -284 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-learner-experience-foundation-v1` | 2026-07-25 | +0 | -314 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-progress-mutations-v1` | 2026-07-25 | +14 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-beta-readiness-v1` | 2026-07-24 | +0 | -319 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-live-calendar-foundation-v1` | 2026-07-24 | +17 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-discussions-community-foundation-v1` | 2026-07-24 | +16 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-assignments-coursework-foundation-v1` | 2026-07-24 | +15 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-instructor-experience-foundation-v1` | 2026-07-24 | +14 | -339 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-completion-foundation-v1` | 2026-07-24 | +13 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-assessment-progress-integration-v1` | 2026-07-24 | +12 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-manual-review-foundation-v1` | 2026-07-24 | +11 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-objective-grading-foundation-v1` | 2026-07-24 | +10 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-submission-foundation-v1` | 2026-07-24 | +9 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-answer-persistence-v1` | 2026-07-24 | +8 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-attempt-foundation-v1` | 2026-07-24 | +7 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-delivery-minimal-v1` | 2026-07-24 | +6 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-assessment-authoring-minimal-v1` | 2026-07-24 | +4 | -339 | طبقة اختبارات/واجبات التعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-instructor-authoring-minimal-v1` | 2026-07-24 | +3 | -339 | طبقة أدوات المعلّم غير المدمجة على قاعدة قديمة. |
| `office/learning-result-policy-completion-v1` | 2026-07-24 | +1 | -339 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-learner-result-delivery-v1` | 2026-07-23 | +0 | -351 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-learner-delivery-v1` | 2026-07-23 | +2 | -357 | طبقة تعلّم إضافية غير مدمجة على قاعدة قديمة (أساس أو اختبار أو واجهة). |
| `office/learning-read-model-hardening-v1` | 2026-07-23 | +0 | -361 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-scoring-foundation-v1` | 2026-07-23 | +0 | -362 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-attempts-foundation-v1` | 2026-07-23 | +0 | -367 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-enrollments-foundation-v1` | 2026-07-22 | +0 | -372 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-questions-foundation-v1` | 2026-07-22 | +0 | -369 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-lesson-content-blocks-foundation-v1` | 2026-07-22 | +0 | -370 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-progress-foundation-v1` | 2026-07-22 | +0 | -371 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-activities-foundation-v1` | 2026-07-22 | +0 | -373 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-lessons-foundation-v1` | 2026-07-22 | +0 | -375 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-sections-foundation-v1` | 2026-07-22 | +0 | -378 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-courses-foundation-v1` | 2026-07-22 | +0 | -381 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-programs-foundation-v1` | 2026-07-22 | +0 | -384 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/learning-spaces-membership-foundation-v1` | 2026-07-22 | +0 | -389 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |

### العالم (10)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/world-curated-places-v1` | 2026-08-17 | +1 | -53 | 13 مكاناً معتمداً للمنصّة + ملف قاعدة 20260929. غير موجود على ألفا. |
| `central/world-catalog-population-v1` | 2026-08-17 | +0 | -53 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/world-discovery-production-hold-fix-v1` | 2026-08-17 | +0 | -59 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a1-learning-world-class-final-v1` | 2026-08-15 | +0 | -63 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a2-store-world-class-final-v1` | 2026-08-15 | +0 | -63 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a2-world-hold-final-decision-v3` | 2026-08-15 | +0 | -68 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a3-wave3-world-hold-ux-deploy-v1` | 2026-08-15 | +0 | -68 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/central-ui-world-map-consolidation-v1` | 2026-08-07 | +9 | -206 | طبقة تنظيم الواجهة غير المدمجة على قاعدة قديمة. |
| `office/platform-navigation-mobile-world-affordance-decision-v1` | 2026-07-28 | +0 | -278 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/world-discovery-hello-city-foundation-v1` | 2026-07-21 | +1 | -403 | أساس اكتشاف العالم ومدينة مرحبا. الأساس وصل ألفا؛ هذا الطرف متأخر جداً. |

### البث والفيديو (24)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/live-server-action-runtime-crash-repair-v2` | 2026-09-07 | +1 | -2 | نفس كوميت إصلاح الفهرسة (ليس إصلاح بث حي رغم الاسم). مكرّر. |
| `central/home-watch-production-regression-v1` | 2026-08-24 | +0 | -7 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-video-egress-low-risk-optimization-v1` | 2026-08-22 | +1 | -17 | طبقة فيديو/مشاهدة غير مدمجة. |
| `central/web-arabic-leak-watch-autoplay-closeout-v1` | 2026-08-22 | +0 | -17 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-visible-regressions-surgical-v1` | 2026-08-22 | +1 | -22 | طبقة تقليل حجم فيديو المشاهدة غير مدمجة. |
| `central/sound-library-v1-catalog-population` | 2026-08-20 | +2 | -31 | تسمية مقاطع مكتبة الصوت الأصلية ورفع صوتها. زيادة على مكتبة الصوت الموجودة في ألفا. |
| `central/create-editor-sound-library-v1` | 2026-08-20 | +0 | -35 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/following-and-video-seo-v1` | 2026-08-17 | +0 | -52 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/ugc-video-storage-optimization-v1` | 2026-08-17 | +3 | -60 | حماية مساحة القرص وتوازي عامل رفع فيديوهات المستخدمين. |
| `central/a1-create-upload-state-integrity-v1` | 2026-08-17 | +2 | -60 | منع إعادة نشر فيديو قديم بعد الرفع: تصفير المسودة وربط إعادة المحاولة بالملف الحالي. |
| `central/a2-create-publishing-final-v4` | 2026-08-15 | +0 | -67 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a2-create-write-post-video-editor-v2` | 2026-08-15 | +0 | -72 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/search-guest-p1-regression-closeout-v1` | 2026-08-14 | +0 | -76 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `agent/laptop-collaboration-agent-2/collaboration-release-candidate-regression-pack-v1` | 2026-08-10 | +50 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/collaboration-workspace-membership-removal-authorization-regression-v1` | 2026-08-10 | +48 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-release-candidate-regression-pack-v1` | 2026-08-10 | +5 | -107 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-validation-fuzz-property-regression-v1` | 2026-08-10 | +0 | -106 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-validation-hot-path-performance-regression-v1` | 2026-08-10 | +3 | -109 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-catalog-drift-regression-matrix-v1` | 2026-08-10 | +5 | -117 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-production-contract-regression-suite-v1` | 2026-08-09 | +2 | -124 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-health-history-regression-and-edge-case-v1` | 2026-08-09 | +0 | -138 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/home-circular-arc-video-edge-alignment-v1` | 2026-07-29 | +0 | -273 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/article-auto-teaser-video-v1` | 2026-07-27 | +0 | -296 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/living-video-navigation-prototype-v1` | 2026-07-21 | +2 | -403 | نموذج تنقّل فيديو حي على المشاهدة. متأخر 403 كوميت. |

### الرسائل وحياة أم (10)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `pc2/umtuba-communications-v1-part1b-identity-discovery` | 2026-09-13 | +24 | -162 | نسخة أقدم من اكتشاف الهوية (أرقام ملفات قاعدة بيانات مختلفة 20260915/16) ومتأخرة كثيراً عن ألفا. لقطة عمل غير مكتملة. |
| `pc2/um-streak-final-completion-v1` | 2026-09-05 | +6 | -2 | سلسلة أم (تحدّي يومي في الرسائل) + كاميرا اجتماعية خاصة + صفحتا معاينة. فيه ملفات قاعدة البيانات 20260937 و 20260938. |
| `central/umtuba-um-streak-on-3ccc-v1` | 2026-09-02 | +5 | -2 | نفس طرف برانش الملف الشخصي الغني/الاكتشاف (نفس آخر كوميت). لا يضيف سلسلة أم رغم الاسم. |
| `pc2/social-comm-rich-profile-renumber-integrate-v1` | 2026-09-02 | +5 | -2 | ملف شخصي غني + اكتشاف الهوية في الرسائل (هاتف/إيميل/رمز) + ربط حياة أم. فيه 20260935 و 20260936. قريب من خط الإنتاج (متأخر بكوميتين). |
| `pc2/umtuba-um-streak-social-camera-foundation-v1` | 2026-09-02 | +2 | -2 | أساس كاميرا سلسلة أم فقط (بدون إكمال الحلقة البصرية). أقدم من برانش الإكمال النهائي. |
| `pc2/umtuba-um-life-home-entry-v1` | 2026-08-30 | +22 | -162 | إدخال حياة أم من القائمة الرئيسية + أجزاء الملف الغني على قاعدة قديمة. متأخر 162 كوميت. |
| `pc2/um-life-rich-personal-profile-v1-part2b` | 2026-08-30 | +15 | -162 | الجزء 2ب من الملف الشخصي الغني (أماكن، تعليم، تقرير مخطط). أرقام ملفات قديمة. متأخر كثيراً. |
| `pc2/um-life-rich-personal-profile-v1-part2a` | 2026-08-30 | +13 | -162 | الجزء 2أ من الهوية الشخصية الغنية. متأخر كثيراً. |
| `pc2/um-life-part1b-a-social-home-candidate` | 2026-08-30 | +12 | -162 | مرشّح الصفحة الاجتماعية لحياة أم (مراجعة مالك). متأخر كثيراً. |
| `central/um-life-phase1-v1` | 2026-08-21 | +0 | -26 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |

### اللغات والترجمة (16)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/web-video-egress-post-locale-rebase-v1` | 2026-08-22 | +0 | -13 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-13-locale-runtime-certification-v1` | 2026-08-22 | +1 | -14 | طبقة شهادات التعلّم غير المدمجة على قاعدة قديمة. |
| `central/13-language-deep-linguistic-qa-v1` | 2026-08-19 | +0 | -36 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/professional-13-language-localization-v1` | 2026-08-19 | +0 | -37 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/resume-yesterday-localization-v1` | 2026-08-19 | +0 | -38 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/unified-web-locale-auto-detection-v1` | 2026-08-19 | +0 | -39 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-localization-wave2-v1` | 2026-08-17 | +1 | -53 | موجة ترجمة ثانية لست لغات. ألفا فيها لاحقاً 13 لغة بشكل أشمل؛ هذا الكوميت نفسه غير مدمج. |
| `central/a3-wave2-integrate-deploy-v1` | 2026-08-15 | +0 | -69 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-translation-trunk-port-v1` | 2026-08-15 | +10 | -162 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/central-auth-i18n-uaf-implementation-v1` | 2026-08-13 | +0 | -84 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/translation-migration-version-reallocation-v1` | 2026-08-06 | +1 | -199 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/platform-translation-intelligence-foundation-v1` | 2026-07-30 | +17 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/platform-translation-studio-app-shell-ingestion-v1` | 2026-07-30 | +16 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/platform-translation-studio-persistence-workflow-v1` | 2026-07-30 | +15 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/platform-translation-studio-foundation-v1` | 2026-07-30 | +14 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |
| `office/platform-app-shell-translation-v1` | 2026-07-30 | +13 | -263 | طبقة ترجمة/استوديو اللغات غير المدمجة على قاعدة قديمة. |

### المكافآت (2)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/rewards-referral-engine-v1` | 2026-08-20 | +0 | -31 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/unified-rewards-growth-engine-v1` | 2026-08-18 | +0 | -43 | لا كوميتات فريدة مقابل ألفا. اسمه مكافآت لكن آخر كوميت عزل مدفوعات التعلّم التجريبية. |

### الهوية والحساب والملف (26)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/approved-header-production-deploy-v1` | 2026-09-13 | +4 | -2 | شعار الهيدر المعتمد + إصلاح ظهور دروس التعلّم لمحركات البحث + تجاهل إعدادات المحرر. أحدث شغل هوية فوق ألفا. |
| `pc2/official-logo-from-approved-video-v1` | 2026-08-29 | +15 | -162 | عمل الشعار من فيديو النهاية المعتمد على قاعدة قديمة. الشعار نفسه وصل ألفا لاحقاً بكوميتات أخرى. |
| `central/settings-signup-release-gate-v1` | 2026-08-21 | +0 | -24 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/signup-remove-referral-code-v1` | 2026-08-21 | +0 | -24 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/settings-profile-arabic-and-header-contrast-v1` | 2026-08-21 | +0 | -25 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/profile-851a1d75-surgical-recovery-v1` | 2026-08-20 | +0 | -28 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/profile-facebook-style-recovery-v1` | 2026-08-20 | +0 | -30 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `pr/pc2-android-assetlinks` | 2026-08-15 | +1 | -61 | ملف ربط تطبيق أندرويد يظهر فقط إذا وُضع بصمة التوقيع. |
| `office/profile-hero-completeness-v1` | 2026-08-14 | +4 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-tab-overflow-fade-v1` | 2026-07-30 | +11 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-accessibility-v1` | 2026-07-30 | +10 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-error-states-v1` | 2026-07-30 | +9 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-loading-states-v1` | 2026-07-30 | +8 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-empty-states-v1` | 2026-07-30 | +7 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-hero-joined-label-v1` | 2026-07-30 | +6 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-creator-space-ia-rename-v1` | 2026-07-30 | +5 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-hero-social-links-v1` | 2026-07-30 | +4 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-identity-achievements-v1` | 2026-07-30 | +3 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-identity-strip-v1` | 2026-07-29 | +1 | -218 | طبقة تحسين الملف الشخصي/مساحة المبدع غير المدمجة على قاعدة قديمة. كثير منه وصل ألفا بطريق آخر. |
| `office/profile-all-timeline-contract-v1` | 2026-07-29 | +0 | -270 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/profile-photos-lightbox-v1` | 2026-07-29 | +0 | -271 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/profile-motion-a11y-pass-v1` | 2026-07-28 | +0 | -283 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/profile-pinned-content-structure-v1` | 2026-07-28 | +0 | -285 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/profile-about-live-structure-v1` | 2026-07-28 | +0 | -286 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/profile-creator-hub-readiness-v1` | 2026-07-28 | +0 | -288 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/creator-profile-article-deeplink-v1` | 2026-07-27 | +0 | -297 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |

### البنية الداخلية والذكاء والنشر (95)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/gsc-full-indexing-repair-v1` | 2026-09-07 | +1 | -2 | إصلاح فهرسة جوجل: السماح بفهرسة دروس التعلّم العامة وتصحيح صفحة المشاهدة. نفس الكوميت الموجود في برانش إصلاح البث. |
| `central/docs-launch-closeout-handoff-v1` | 2026-08-25 | +1 | -5 | تقارير إغلاق الإطلاق فقط (ملفات توثيق). لا ميزات للمستخدم. |
| `central/launch-closeout-phase2-localization-v1` | 2026-08-25 | +0 | -5 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-nextjs-cve-2026-64643-p1-v2` | 2026-08-22 | +0 | -12 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-google-seo-full-optimization-v1` | 2026-08-22 | +0 | -21 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/ingest-umtuba-originals-on-910fb3b8` | 2026-08-18 | +0 | -41 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/ingest-umtuba-originals-on-fbb6b364` | 2026-08-18 | +0 | -43 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/ingest-umtuba-originals-sandbox-v1` | 2026-08-18 | +1 | -46 | طبقة بيئة التجريب الخاصة غير المدمجة على قاعدة أقدم. |
| `central/full-business-sandbox-on-a085f667-v1` | 2026-08-18 | +0 | -47 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/full-business-sandbox-v1` | 2026-08-18 | +0 | -49 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-manifest-validation-p2` | 2026-08-14 | +6 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/production-db-baseline-renumber-apply-v2` | 2026-08-12 | +1 | -87 | إعادة ترقيم ملفات ذكاء ألفا وإعادة إصدار توكنات الإشعارات لخط قاعدة الإنتاج. |
| `central/shared-ai-core-alpha-recon-v4` | 2026-08-10 | +0 | -87 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/shared-ai-core-catalog-aiservice-surgical-onto-alpha-v1` | 2026-08-10 | +0 | -89 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/shared-ai-core-quotas-billing-reconcile-onto-alpha-v1` | 2026-08-10 | +0 | -90 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `agent/laptop-collaboration-agent-2/collaboration-release-acceptance-handoff-closeout-v1` | 2026-08-10 | +50 | -275 | أحدث طرف لمساحات التعاون (فرق عمل): أعضاء، صلاحيات، اختبارات قبول. |
| `audit/um-core-production-readiness-exit-v1` | 2026-08-10 | +1 | -109 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-referential-integrity-dependency-index-perf-v1` | 2026-08-10 | +2 | -117 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-diagnostic-findings-normalization-v1` | 2026-08-10 | +1 | -127 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-referential-integrity-contract-v1` | 2026-08-10 | +1 | -142 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-dependency-validator-consumer-readiness-audit-v1` | 2026-08-10 | +1 | -109 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-dependency-validator-integration-boundary-hardening-v1` | 2026-08-10 | +1 | -109 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-lifecycle-readiness-foundation-v1` | 2026-08-10 | +2 | -127 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-configuration-validation-foundation-v1` | 2026-08-10 | +1 | -122 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-health-reporter-foundation-p17` | 2026-08-10 | +1 | -143 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-api-stability-and-error-contract-hardening-v1` | 2026-08-10 | +1 | -130 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-operational-error-and-release-signoff-closeout-v1` | 2026-08-10 | +0 | -99 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-spec-standards-release-contract-closeout-v1` | 2026-08-10 | +0 | -102 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-p23-wiring-closeout-v1` | 2026-08-10 | +2 | -106 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-production-readiness-blocker-closeout-v1` | 2026-08-10 | +0 | -104 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-p1-p19-contract-coherence-matrix-v1` | 2026-08-10 | +0 | -108 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-dependency-validator-foundation-p19` | 2026-08-10 | +0 | -112 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-public-api-backward-compatibility-guard-v1` | 2026-08-09 | +2 | -122 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-performance-and-scale-assumptions-audit-v1` | 2026-08-09 | +2 | -122 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-deterministic-serialization-and-snapshot-safety-v1` | 2026-08-09 | +0 | -120 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-capability-compatibility-matrix-foundation-v1` | 2026-08-09 | +2 | -124 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-public-api-documentation-and-contract-matrix-v1` | 2026-08-09 | +2 | -127 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-state-concurrency-and-immutability-hardening-v1` | 2026-08-09 | +0 | -126 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-integration-golden-path-e2e-foundation-v1` | 2026-08-09 | +3 | -130 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-bounded-health-history-foundation-v1` | 2026-08-09 | +0 | -140 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-sdk-factory-foundation-v1` | 2026-08-09 | +0 | -141 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-fleet-health-aggregation-foundation-v1` | 2026-08-09 | +0 | -141 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-referential-integrity-foundation-v1` | 2026-08-09 | +0 | -140 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-health-diagnostics-join-foundation-v1` | 2026-08-09 | +0 | -142 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/um-core-platform-onto-alpha-port-v1` | 2026-08-09 | +0 | -145 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/server-a1-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/server-a2-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/server-a3-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/umtuba-central-migration-registry-reconciliation-v1` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/collaboration-workspace-settings-migration-reallocation-v1` | 2026-08-07 | +18 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-event-publisher-foundation-p16` | 2026-08-07 | +16 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-capability-asserter-foundation-p15` | 2026-08-07 | +15 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-flag-evaluator-foundation-p14` | 2026-08-07 | +14 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-validator-composition-foundation-p13` | 2026-08-07 | +13 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-aggregate-registry-facade-foundation-p12` | 2026-08-07 | +12 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-naming-registry-foundation-p11` | 2026-08-07 | +11 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-health-declaration-catalog-foundation-p10` | 2026-08-07 | +10 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-dependency-registry-foundation-p9` | 2026-08-07 | +9 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-feature-flag-registry-foundation-p8` | 2026-08-07 | +8 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-event-routing-foundation-p7` | 2026-08-07 | +7 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-event-type-registry-foundation-p6` | 2026-08-07 | +6 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-capability-registry-foundation-p5` | 2026-08-06 | +5 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-registry-foundation-p4` | 2026-08-06 | +4 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-compliance-engine-p3` | 2026-08-06 | +3 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/um-core-platform-foundation-p1` | 2026-08-06 | +1 | -206 | طبقة نواة المنصّة الداخلية (سجلات وصحّة النظام) غير المدمجة على قاعدة قديمة. |
| `office/ai-core-private-ai-deployment-runtime-onto-alpha-v1` | 2026-08-06 | +0 | -206 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-private-ai-workflow-lifecycle-onto-alpha-v1` | 2026-08-06 | +0 | -207 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-data-platform-workflow-dataset-approval-onto-alpha-v1` | 2026-08-06 | +0 | -208 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-model-registry-onto-alpha-v1` | 2026-08-06 | +0 | -208 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-knowledge-acquisition-onto-alpha-v1` | 2026-08-06 | +0 | -209 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-data-platform-foundation-onto-alpha-v1` | 2026-08-06 | +0 | -210 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-private-ai-foundation-onto-alpha-v1` | 2026-08-06 | +0 | -211 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-provider-streaming-foundation-v1` | 2026-08-06 | +0 | -212 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-providers-onto-alpha-v1` | 2026-08-05 | +0 | -213 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-anthropic-on-gemini-recovery-v1` | 2026-08-05 | +11 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/ai-core-local-on-gemini-recovery-v1` | 2026-08-05 | +12 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/ai-core-gemini-adapter-recovery-v1` | 2026-08-05 | +10 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-foundation-v1` | 2026-08-05 | +23 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/perf-home-javascript-optimization-v1` | 2026-08-03 | +14 | -282 | طبقة الصفحة الرئيسية غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-inference-invocation-orchestration-v1` | 2026-07-31 | +32 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-provider-adapter-boundary-v1` | 2026-07-31 | +31 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-provider-routing-policy-v1` | 2026-07-31 | +30 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-inference-execution-boundary-v1` | 2026-07-31 | +29 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-inference-request-contracts-v1` | 2026-07-31 | +28 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-runtime-operations-failover-v1` | 2026-07-31 | +27 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-deployment-runtime-v1` | 2026-07-31 | +26 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-private-ai-workflow-lifecycle-v1-final` | 2026-07-31 | +25 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-shared-ai-surface-integration-v1` | 2026-07-31 | +24 | -263 | طبقة ربط المنصّة غير المدمجة على قاعدة قديمة. |
| `office/platform-knowledge-acquisition-foundation-v1` | 2026-07-30 | +19 | -263 | طبقة ربط المنصّة غير المدمجة على قاعدة قديمة. |
| `office/ai-core-local-adapter-v1` | 2026-07-30 | +11 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/ai-core-anthropic-adapter-v1` | 2026-07-30 | +10 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/ai-core-gemini-adapter-v1` | 2026-07-30 | +9 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `backup/ai-core-anthropic-gemini-recovery-local-20260913` | 2026-07-29 | +0 | -218 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-provider-foundation-v1` | 2026-07-29 | +0 | -263 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ai-core-platform-foundation-v1` | 2026-07-28 | +0 | -280 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |

### أخرى (تعاون، ألعاب، إعلانات، تنقّل، دمج) (117)

| البرانش | آخر حفظة | أمام | خلف | ماذا فيه |
|---|---|---:|---:|---|
| `central/web-user-defects-final-v1` | 2026-08-23 | +1 | -51 | توثيق تجميد عيوب المتجر/التعلّم فقط. |
| `central/web-live-visual-white-strip-v1` | 2026-08-22 | +0 | -19 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/web-whole-platform-final-reconciliation-v1` | 2026-08-21 | +0 | -23 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a3-web-share-viewport-fix-v1` | 2026-08-17 | +1 | -60 | إبقاء قائمة المشاركة داخل الشاشة على الكمبيوتر. |
| `central/web-account-deletion-copy-neutral-v1` | 2026-08-16 | +0 | -60 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a3-security-integration-production-final-v4` | 2026-08-15 | +0 | -64 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a1-user-blockers-final-v4` | 2026-08-15 | +0 | -67 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/a1-user-reported-final-blockers-v2` | 2026-08-15 | +0 | -72 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `pc2/wp-qa-user-findings-v1` | 2026-08-14 | +0 | -77 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `central/uaf12-owner-delete-integrate-v1` | 2026-08-14 | +0 | -79 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/pwa-auth-callback-packet-integrate-v2` | 2026-08-13 | +0 | -85 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/laptop-a2-collaboration-workspace-card-shell-a11y-v1` | 2026-08-12 | +51 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/desktop-games-page-composition-implementation-v1` | 2026-08-11 | +1 | -87 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/desktop-a2-games-hub-safe-components-v1` | 2026-08-10 | +0 | -90 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `agent/laptop-collaboration-agent-2/collaboration-release-final-acceptance-matrix-v1` | 2026-08-10 | +50 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/collaboration-release-candidate-final-revalidation-v1` | 2026-08-10 | +50 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/collaboration-release-status-reconciliation-v1` | 2026-08-10 | +50 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-2/collaboration-workspace-membership-lifecycle-release-readiness-v1` | 2026-08-10 | +49 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-settings-lifecycle-ui-v1` | 2026-08-10 | +49 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/pc2-a1-ready` | 2026-08-10 | +1 | -162 | توثيق تسليم جهاز فقط. لا ميزة للمستخدم. |
| `agent/laptop-collaboration-agent-1/collab-removed-member-session-and-stale-access-e2e-v1` | 2026-08-10 | +47 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-membership-lifecycle-runtime-hardening-v1` | 2026-08-10 | +47 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-ownership-transfer-safety-v1` | 2026-08-10 | +47 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-role-change-authorization-e2e-v1` | 2026-08-09 | +43 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-resource-permission-matrix-hardening-v1` | 2026-08-09 | +41 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-resource-access-control-e2e-v1` | 2026-08-09 | +41 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-workspace-member-management-experience-v1` | 2026-08-09 | +41 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-membership-roles-permissions-runtime-hardening-v1` | 2026-08-09 | +40 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `agent/laptop-collaboration-agent-1/collab-next-milestone-impl-v1` | 2026-08-09 | +39 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/desktop-a3-provider-exec-safety-pack-v1` | 2026-08-09 | +87 | -282 | طبقة سلسلة التجارة: أمان تنفيذ مزوّد الدفع على قاعدة قديمة. |
| `office/collaboration-local-link-unlink-fixture-rpc-browser-e2e-followup-v1` | 2026-08-09 | +37 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/desktop-a1-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/desktop-a2-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/desktop-a3-ready` | 2026-08-09 | +0 | -162 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-ai-streaming-port-to-creator-v1` | 2026-08-08 | +39 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-resource-link-mutation-runtime-v1` | 2026-08-08 | +26 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-resource-link-foundation-v1` | 2026-08-07 | +23 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-member-role-management-ui-v1` | 2026-08-07 | +21 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/central-ui-product-integration-v1` | 2026-08-07 | +9 | -206 | طبقة تنظيم الواجهة غير المدمجة على قاعدة قديمة. |
| `office/central-ui-home-organization-v1` | 2026-08-07 | +7 | -206 | طبقة تنظيم الواجهة غير المدمجة على قاعدة قديمة. |
| `office/collaboration-platform-gate-keepalive-v1` | 2026-08-07 | +20 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/central-ui-shell-navigation-coherence-v1` | 2026-08-07 | +6 | -206 | طبقة تنظيم الواجهة غير المدمجة على قاعدة قديمة. |
| `office/central-ui-product-unification-plan-v1` | 2026-08-07 | +6 | -206 | طبقة تنظيم الواجهة غير المدمجة على قاعدة قديمة. |
| `office/central-server-multi-agent-assignment-plan-v1` | 2026-08-07 | +1 | -206 | خطة توزيع مهام داخلية فقط. لا ميزة للمستخدم. |
| `office/platform-main-user-navigation-wiring-v1` | 2026-08-06 | +4 | -206 | طبقة القوائم والتنقّل غير المدمجة على قاعدة قديمة. |
| `office/platform-unified-navigation-wiring-v1` | 2026-08-06 | +3 | -206 | طبقة القوائم والتنقّل غير المدمجة على قاعدة قديمة. |
| `office/platform-unified-navigation-foundation-v1` | 2026-08-06 | +2 | -206 | طبقة القوائم والتنقّل غير المدمجة على قاعدة قديمة. |
| `office/platform-unified-page-registry-v1` | 2026-08-06 | +1 | -206 | طبقة ربط المنصّة غير المدمجة على قاعدة قديمة. |
| `office/collaboration-smoke-e2e-on-settings-tip-v1` | 2026-08-05 | +18 | -275 | طبقة سلسلة التجارة: اختبار استرجاع (رسالة الحفظة ناقصة)(collaboration): port smoke e2e readiness onto settings tip |
| `office/collaboration-settings-lifecycle-ui-v1` | 2026-08-03 | +17 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-ui-foundation-v1` | 2026-08-03 | +15 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-membership-runtime-v1` | 2026-08-02 | +13 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/collaboration-workspace-spine-foundation-v1` | 2026-08-02 | +12 | -275 | طبقة مساحات التعاون (فرق العمل) غير المدمجة على قاعدة قديمة. |
| `office/unified-integration-verification-v1` | 2026-08-01 | +72 | -263 | طبقة توحيد المنصّة غير المدمجة على قاعدة قديمة. |
| `integration/laptop-desktop-unification-v1` | 2026-08-01 | +71 | -263 | برانش دمج تاريخي. غالباً سلف بلا قيمة منفصلة اليوم. |
| `office/platform-ai-creator-studio-foundation-v1` | 2026-07-31 | +38 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-unified-capability-execution-v1` | 2026-07-31 | +37 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-service-orchestration-foundation-v1` | 2026-07-31 | +36 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-policy-governance-foundation-v1` | 2026-07-31 | +35 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-usage-quotas-billing-foundation-v1` | 2026-07-31 | +34 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-capability-catalog-service-registry-v1` | 2026-07-31 | +33 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-gemini-live-provider-v1` | 2026-07-31 | +23 | -263 | طبقة ربط المنصّة غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-data-platform-workflow-v1` | 2026-07-30 | +21 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-ai-data-platform-foundation-v1` | 2026-07-30 | +20 | -263 | طبقة الذكاء الاصطناعي الداخلي غير المدمجة على قاعدة قديمة. |
| `office/platform-internationalization-foundation-v1` | 2026-07-30 | +12 | -263 | طبقة ربط المنصّة غير المدمجة على قاعدة قديمة. |
| `integration/alpha-beta-productization-v1` | 2026-07-29 | +0 | -226 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `integration/w4-alpha-stabilization` | 2026-07-29 | +0 | -230 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `integration/w3-alpha-final` | 2026-07-29 | +0 | -234 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `integration/w3-ai` | 2026-07-29 | +0 | -238 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `integration/w1-revenue` | 2026-07-29 | +0 | -271 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/unified-revenue-platform-foundation-v1` | 2026-07-29 | +0 | -271 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/home-assembly-v1` | 2026-07-29 | +0 | -272 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/home-circular-arc-preview-v1` | 2026-07-29 | +0 | -274 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/home-circular-arc-navigation-foundation-v1` | 2026-07-29 | +0 | -275 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/home-readiness-guardrails-v1` | 2026-07-28 | +0 | -276 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-navigation-content-flow-policy-decision-v1` | 2026-07-28 | +0 | -277 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-navigation-secondary-surface-cleanup-v1` | 2026-07-28 | +0 | -279 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-navigation-deeplink-alias-clarity-v1` | 2026-07-28 | +0 | -280 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/usermenu-capability-links-v1` | 2026-07-28 | +0 | -281 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/platform-navigation-contract-sync-v1` | 2026-07-28 | +0 | -282 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/nav-chrome-hygiene-v1` | 2026-07-28 | +0 | -290 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/creator-space-content-cards-v1` | 2026-07-28 | +0 | -291 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/unified-content-services-v2` | 2026-07-27 | +0 | -294 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/unified-content-foundation-v1` | 2026-07-27 | +0 | -295 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/games-hub-runtime-submit-outcome-local-apply-consumer-contract-v1` | 2026-07-24 | +32 | -338 | أحدث طرف لمحرّك الألعاب (عقود تنفيذ النتيجة محلياً). صفحة الألعاب في ألفا ما زالت تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-lifecycle-model-contract-v1` | 2026-07-24 | +31 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-mutation-input-contract-v1` | 2026-07-24 | +30 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-dry-run-effects-description-contract-v1` | 2026-07-24 | +29 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-execution-authorization-contract-v1` | 2026-07-24 | +28 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-execution-precondition-guard-v1` | 2026-07-24 | +27 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-local-apply-plan-contract-v1` | 2026-07-24 | +26 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-apply-eligibility-contract-v1` | 2026-07-24 | +24 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-acknowledgment-contract-v1` | 2026-07-24 | +23 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-submit-outcome-adaptation-trusted-v1` | 2026-07-24 | +22 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-session-start-composition-v1` | 2026-07-24 | +21 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-completion-submit-composition-v1` | 2026-07-24 | +20 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-completion-submit-request-assembly-v1` | 2026-07-24 | +19 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-platform-session-bind-trusted-v1` | 2026-07-24 | +18 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-session-result-submit-trusted-v1` | 2026-07-24 | +17 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-session-result-submit-response-parser-v1` | 2026-07-24 | +16 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-session-result-submit-request-validation-v1` | 2026-07-24 | +15 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-session-start-trusted-v1` | 2026-07-24 | +14 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-privacy-settings-update-trusted-v1` | 2026-07-24 | +13 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-privacy-settings-lookup-trusted-v1` | 2026-07-24 | +12 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-achievements-lookup-trusted-v1` | 2026-07-24 | +11 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-progress-lookup-trusted-v1` | 2026-07-24 | +10 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-session-lookup-trusted-v1` | 2026-07-24 | +8 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-catalog-lifecycle-trusted-v1` | 2026-07-24 | +7 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-catalog-entry-lookup-trusted-v1` | 2026-07-24 | +6 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-catalog-title-seed-v1` | 2026-07-24 | +4 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-experience-foundation-v1` | 2026-07-24 | +1 | -338 | طبقة محرّك الألعاب غير المدمجة على قاعدة قديمة. في ألفا الصفحة تقول غير متاحة. |
| `office/games-hub-runtime-foundation-v1` | 2026-07-24 | +0 | -338 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/games-platform-foundation-v1` | 2026-07-24 | +0 | -339 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ads-canonical-authority-hardening-v1` | 2026-07-24 | +0 | -346 | لا كوميتات فريدة مقابل خط الإنتاج. الشغل مدمج مسبقاً أو نفس النسخة. |
| `office/ads-design-v2` | 2026-07-20 | +3 | -425 | مراجعة جاهزية الإعلانات (توثيق) على قاعدة قديمة. |
| `office/legal-pages-v1` | 2026-07-19 | +1 | -429 | مسودات صفحات الشروط والخصوصية على قاعدة قديمة جداً. الصفحات موجودة في ألفا بشكل أحدث. |
| `master` | 2026-07-09 | +0 | -475 | صفحة هبوط ألفا القديمة. لا شغل فريد. مرشّح حذف. |

---

## 2 — الشغل المكرر

برانشات تلمس نفس الميزة. الأحدث = أحدث تاريخ + أكبر عدد حفظات فريدة + أكبر عدد ملفات، مع القرب من ألفا.

### متجر الكتالوج المعتمد / تصميم المتجر

- **الأكثر تقدماً والحي:** `alpha-0.2` = `store/540-full-production-release-v1` (نفس الحفظة `9080b79c`).
- مرشّح النشر `central/deploy-approved-store-candidate-from-origin-v1` وإيداع المكتب `office/pc2-umtuba-store-approved-design-productization-v1`: تصميم أقدم من كتالوج 540، وجزء كبير منه صار في ألفا.
- برانشات المعاينة الخاصة والترجمة (`store-private-demo-preview-*`, `store-i18n-*`, `store-live-localization-*`): معظمها **بلا شغل فريد** (مدموج) أو بقي كوميت واحد على قاعدة أقدم.
- **متروكة:** سلسلة مكتب التجارة القديمة (`office/commerce-*` قبل آب) مكررة بأسماء `-current` وبدونها.

### موافقة البائع

- **الأكثر تقدماً:** `central/store-seller-approval-admin-v1` (+2، 23 آب). غير مدمج في ألفا.
- تحذير: ملف قاعدته اسمه `20260935` أيضاً، لكنه **لمتجر البائعين** وليس للملف الشخصي الغني.

### سلسلة أم (تحدّي يومي في الرسائل) + الكاميرا

- **الأكثر تقدماً:** `pc2/um-streak-final-completion-v1` (5 أيلول، +6، −2، فيه 20260937 و 20260938).
- الأساس فقط: `pc2/umtuba-um-streak-social-camera-foundation-v1` (أقدم، بدون إكمال الحلقة).
- `central/umtuba-um-streak-on-3ccc-v1`: **اسم مضلل** — نفس طرف الملف الشخصي/الاكتشاف، بلا ملفات سلسلة أم.

### الملف الشخصي الغني + اكتشاف الأصدقاء في الرسائل

- **الأقرب لخط الإنتاج:** `pc2/social-comm-rich-profile-renumber-integrate-v1` و `central/umtuba-um-streak-on-3ccc-v1` (نفس الطرف 2 أيلول، +5، −2، فيهما 20260935 و 20260936 الصحيحان).
- **الأحدث تاريخاً لكن على قاعدة قديمة:** `pc2/umtuba-communications-v1-part1b-identity-discovery` (13 أيلول، +24، −162، أرقام ملفات قديمة 20260915/16، لقطة غير مكتملة).
- أجزاء حياة أم 30 آب (`um-life-rich-personal-profile-*`, `um-life-home-entry`, `um-life-part1b-a-*`): أسلاف متأخرة 162 حفظة. **متروكة لصالح نسخة إعادة الترقيم.**

### لوحة التعلّم وسوق الشركاء ومنصّة المعلّم

- **الأكثر تقدماً للواجهة الجديدة:** `desktop/learning-hub-v2-owner-pass-freeze-v1` (+10، −2، 10 أيلول، 77 ملفاً) ويشمل سوق الشركاء.
- سوق الشركاء وحده: `learning/partner-marketplace-2026-09-09-import-v1` (كوميت واحد، مضمّن في اللوحة).
- منصّة المعلّم/الطالب: صفحاتها وملف 20260934 **موجودان على ألفا**. برانش `central/learning-teacher-student-platform-v1` كوميت مرشّح إضافي متأخر 12.
- عشرات برانشات `agent/laptop-learning-agent-*`: نفس السلسلة تقريباً (+47/+48، −275) وفروقها في الغالب **تقارير توثيق شهادات**. الأكثر تقدماً بينها توثيقاً: `learning-production-readiness-final-reconciliation-v4`. **مكررات متروكة.**

### فهرسة جوجل + شعار الهيدر

- إصلاح الفهرسة نفس الحفظة في `central/gsc-full-indexing-repair-v1` و `central/live-server-action-runtime-crash-repair-v2` (الاسم الثاني مضلل).
- **الأكثر تقدماً:** `central/approved-header-production-deploy-v1` يحتوي إصلاح الفهرسة + شعار الهيدر + 4 حفظات فوق ألفا (اليوم 13 أيلول).
- شعار المكتب `pc2/official-logo-from-approved-video-v1`: الشغل البصري وصل ألفا بطريق آخر؛ هذا البرانش متأخر 162.

### اللغات

- موجات 13 لغة (`professional-13-language-*`, `13-language-deep-linguistic-qa`, كشف اللغة، استعادة كلمة السر) **مدموجة** في ألفا (أمام = 0).
- الباقي الفريد: شهادة إغلاق 13 لغة (توثيق) وموجة 2 القديمة وبرانش منصّة الترجمة على قاعدة قديمة.

### التجارة العميقة (سترايب، استرجاع، مخزون، عمولة)

- سلسلة واحدة متراكمة. **الأكثر تقدماً:** `office/commerce-partial-refund-provider-money-execution-v1` (+105، −282، 565 ملفاً).
- كل `office/desktop-a2-stripe-*` و `office/desktop-a3-refund-*` طبقات أقدم من نفس السلسلة.
- النسخ المزدوجة `*-current` مقابل بدون `-current`: **مكررات.**

### التعاون (فرق العمل)

- **الأكثر تقدماً:** `agent/laptop-collaboration-agent-2/collaboration-release-acceptance-handoff-closeout-v1` (+50، −275).
- باقي `collab-*` و `collaboration-*`: طبقات اختبار أو واجهة أقدم. **مكررات سلسلة.**

### الألعاب

- **الأكثر تقدماً:** `office/games-hub-runtime-submit-outcome-local-apply-consumer-contract-v1` (+32، −338).
- الباقي طبقات عقود على نفس المحرّك. في ألفا صفحة `/games` تقول إن اللعب غير متاح في هذه التجربة.

### العالم

- تجربة «العالم معلّق» مدموجة (`a2-world-hold-*` و `a3-wave3-world-hold-*` بلا شغل فريد).
- **غير مدمج:** `central/world-curated-places-v1` (13 مكاناً معتمداً).

### بيئة التجريب الخاصة (ساندبوكس)

- عدة برانشات (`ingest-umtuba-originals-*`, `full-business-sandbox-*`, `learning-executable-sandbox-v2`) تتداخل. الحي منها غالباً مدمج (أمام = 0). الفريد: شرائح تعلّم قابلة للتشغيل + أساس ما قبل الشركة.

---

## 3 — الشغل غير المدموج (الأهم)

شغل حقيقي **لم يدخل** `origin/alpha-0.2`. هذا ما بُني ولم يُنشر على خط الإنتاج.

### أ) قريب من خط الإنتاج (متأخر حفظتين أو أقل) — الأهم للقرار

1. **شعار الهيدر + فهرسة جوجل** — `central/approved-header-production-deploy-v1`
   - شعار أم فوق كلمة أمتوبا في الشريط العلوي.
   - السماح لجوجل بفهرسة دروس التعلّم العامة وتصحيح صفحة المشاهدة.
   - ملفات: شريط التنقّل، الشعار، دروس التعلّم، المشاهدة، أدوات فهرسة جوجل.

2. **لوحة التعلّم الجديدة + سوق الشركاء** — `desktop/learning-hub-v2-owner-pass-freeze-v1`
   - صفحة `/learning` لوحة موحّدة (متابعة، مستحق، مقترحات، فردي، شركاء).
   - جدولة فردية **بدون دفع حقيقي**.
   - سوق شركاء تجريبي (مقارنة دورات، شهادات، حفظ).
   - ألفا ما زالت على الصفحة الحالية `LearningHomeView` وليست هذه اللوحة.

3. **سلسلة أم في الرسائل** — `pc2/um-streak-final-completion-v1`
   - تحدّي يومي بين شخصين، شارات، حالة السلسلة، كاميرا سريعة خاصة، صفحة معاينة.
   - ألفا فيها رسائل عادية (محادثة، كتابة، بحث) **بدون** سلسلة أم ولا كاميرا.
   - يحتاج ملفي قاعدة 20260937 و 20260938 (موجودان على السيرفر الحي حسب المالك، غير موجودين في ألفا).

4. **ملف شخصي غني + اكتشاف الأصدقاء** — `pc2/social-comm-rich-profile-renumber-integrate-v1`
   - أماكن/تعليم/هوية في الملف، لوحة خصوصية الاتصالات، البحث بهاتف أو إيميل أو رمز، بطاقة QR.
   - صفحة قصيرة `/u/اسم` — **غير موجودة على ألفا.**
   - يحتاج 20260935 (ملف شخصي) و 20260936 (اكتشاف الهوية). موجودان على السيرفر الحي حسب المالك، غير موجودين في ألفا.

5. **موافقة الإدارة على البائعين** — `central/store-seller-approval-admin-v1`
   - إبقاء البائع المعلّق خارج مركز البائع، وتسجيل قرار المراجع.
   - ملف قاعدة باسم 20260935 **مختلف** عن ملف الملف الشخصي. لا يُخلط بينهما.

### ب) مبني وكبير لكنه على قاعدة قديمة (خلف عشرات أو مئات الحفظات)

6. **تجارة كاملة (دفع، استرجاع، مخزون، عمولة، سترايب تجريبي)** — طرفها `office/commerce-partial-refund-provider-money-execution-v1`
   - 105 حفظات فريدة و 565 ملفاً فوق ألفا، ومتأخر 282 حفظة.
   - ألفا فيها تصفّح وسلة وطلب **بدون تحصيل دفع حي** (محاولة دفع مؤجّلة في كود المتجر).

7. **مساحات التعاون / فرق العمل** — طرفها `collaboration-release-acceptance-handoff-closeout-v1`
   - أعضاء، أدوار، صلاحيات، نقل ملكية، ربط موارد التعلّم. غير ظاهر كمنتج في قائمة ألفا.

8. **محرّك الألعاب** — طرف سلسلة `office/games-hub-runtime-*`
   - عقود بدء الجلسة ونتائجها. في ألفا `/games` صفحة «غير متاح في هذه التجربة».

9. **شهادات التعلّم وملاحظات الدرس واستيراد المقررات** — سلاسل `office/learning-*` و `agent/laptop-learning-agent-*`
   - إصدار شهادة، ملاحظات شخصية، إشارات الدرس، تواريخ التسليم، استيراد مقرر. على قاعدة متأخرة 275 حفظة.

10. **اكتشاف الهوية (النسخة القديمة يوم 13 أيلول)** — `pc2/umtuba-communications-v1-part1b-identity-discovery`
    - أحدث تاريخ لكن خلف 162 حفظة وأرقام ملفات قديمة. لا تُفضَّل على نسخة إعادة الترقيم القريبة من ألفا.

### ج) تحسينات أصغر غير مدمجة

- عالم: 13 مكاناً معتمداً (`central/world-curated-places-v1`) + ملف 20260929.
- مكتبة الصوت: تسمية أوضح ومقاطع أعلى صوتاً.
- رفع الفيديو: حماية مساحة القرص + منع إعادة نشر مسودة قديمة.
- مشاركة سطح المكتب: القائمة تبقى داخل الشاشة.
- أندرويد: ملف ربط التطبيق إن وُجدت بصمة التوقيع.
- محتوى أصلي قبل الشركة + شرائح تجريب التعلّم.
- إعادة ترقيم ذكاء ألفا في القاعدة (`office/production-db-baseline-renumber-apply-v2`).

### د) يبدو غير مدمج بالعدّ، لكن الميزة وصلت ألفا بطريق آخر

- إصلاح الشاشة البيضاء في التعلّم: ألفا فيها حفظة بنفس المعنى بتاريخ 24 آب.
- تصميم المتجر المعتمد: ألفا بعدها أضافت كتالوج 540.
- الشعار الرسمي: ألفا فيها حفظات شعار 29 آب.
- حياة أم المرحلة 1: مدموجة (21 آب، أمام = 0).
- 13 لغة واحتراف الترجمة: مدموجة.

---

## 4 — البرانشات الميتة (مرشّحة للحذف — لم يُحذف شيء)

القاعدة: لا حفظات فريدة مقابل ألفا، **أو** آخر حفظة قبل 15 تموز 2026 وليس فيها شغل غير مدمج.

### لا حفظات فريدة (163 برانش)

كلها إما نفس ألفا أو أسلاف مدموجة. أبرزها:

- `store/540-full-production-release-v1` — **نفس ألفا تماماً** (يمكن إبقاؤه كاسم احتياطي).
- `master` — 9 تموز 2026، خلف 475، لا شغل فريد. **أوضح مرشّح حذف.**
- كل موجات وسط (`central/*`) ذات أمام = 0 من 15 آب إلى 25 آب (حياة أم 1، مكافآت، أصوات، 13 لغة، إصلاحات مشاهدة، متجر معتمد على الحي، إلخ).
- سلاسل أساس التعلّم في تموز (`office/learning-*-foundation-v1` ذات أمام = 0).
- سلاسل المتجر الممتاز في تموز (`office/commerce-premium-*` ذات أمام = 0).
- `office/ai-core-*-onto-alpha-v1` ذات أمام = 0 (الذكاء الداخلي وُضِع على ألفا).
- `integration/w1-w4` و `integration/alpha-beta-productization-v1`.
- `backup/ai-core-anthropic-gemini-recovery-local-20260913` (أمام = 0 رغم تاريخ الاسم).

القائمة الكاملة لهذه الـ 163 ظاهرة في القسم 1 حيث العمود «أمام» = +0.

### أقدم من 60 يوماً مع شغل فريد

**لا يوجد.** كل برانش فيه حفظات فريدة آخر حفظة فيه في 19 تموز 2026 أو بعده (داخل نافذة 60 يوماً من 13 أيلول).

الأقدم بشغل فريد: `office/legal-pages-v1` (19 تموز) و `office/ads-design-v2` (20 تموز) — قديمة جداً مقابل ألفا (−425/−429) ويمكن اعتبارها **ميتة عملياً** رغم أنها داخل 60 يوماً باليوم.

---

## 5 — حالة خط الإنتاج alpha-0.2

الدليل: صفحات `app/**/page.tsx` على `origin/alpha-0.2`، وآخر 30 حفظة، وملفات قاعدة أيلول، وليس تخميناً من أسماء البرانشات.

آخر حفظتين (10 أيلول): كتالوج المتجر المعتمد 540 + طبقة التصفّح. قبلها: إزالة تسميات ألفا 0.2، الشعار، إصلاحات عربية/مشاهدة/تعلّم، أمان Next.js، حياة أم المرحلة 1، مكافآت الدعوة.

| الوحدة | الحالة على هذا البرانش | الدليل |
|---|---|---|
| **الفيديوهات** | **جزئي / جاهز للاستخدام** | صفحات `/watch` و`/create/video` و`/following` و`/create` و`/create/post`. لا يوجد في ألفا إصلاح الفهرسة الأخير ولا نموذج التنقّل الحي. |
| **البث الحي** | **جزئي** | `/live` و`/live/[غرفة]`. يوجد مختبر وسائط `/live/media-lab`. لا يوجد في ألفا إصلاح باسم البث (البرانش المسمّى كذلك هو فهرسة جوجل). اكتمال غرف البث الحقيقية: غير معروف من الملفات وحدها بدون تشغيل حي. |
| **الرسائل** | **جزئي** | `/messages` مع محادثة وكتابة وبحث وحالة كتابة. **لا** ملفات سلسلة أم ولا كاميرا ولا اكتشاف هوية. |
| **حياة أم** | **جزئي** | `/life` و`/life/compose` موجودتان. المرحلة 1 (الخلاصة والمنشور) مدموجة في 21 آب. **لا** صفحة `/u/اسم` ولا محرّر الملف الغني. |
| **العالم** | **جزئي / معلّق عمداً** | `/world` وبحث ومدينة ومكان. الكود يُظهر العالم للناس فقط إذا القاعدة جاهزة **والعلم مفتوح**. لا ملف 20260929 لأماكن المنصّة. يوجد اقتراح أماكن في مجلد الكتالوج. |
| **التعلّم** | **جزئي / واسع في الكود** | كتالوج، درس، نشاط، اختبار، معلّم، مدرّس (`/learning/teacher/**`)، مجتمع، تقويم، مدرّس خاص. الصفحة الرئيسية الحالية لوحة قديمة وليست لوحة v2. ملف 20260934 **موجود في الكود** وغير مطبّق على السيرفر الحي (قول المالك + الملف موجود على ألفا). |
| **المتجر** | **جزئي** | `/store` وبحث ومنتج وسلة وطلبات ومفضلة ومركز بائع وإدارة. كتالوج 540 في آخر حفظة. الدفع: محاولات **مؤجّلة** في كود الدفع، وبيئة التجريب تقول صراحة لا دفع حي. موافقة البائع الإدارية غير هذه الحفظة. |
| **المكافآت** | **جزئي / موجود** | `/rewards` + `/invite/[رمز]` + ملف قاعدة 20260933 في الشجرة. |
| **الألعاب** | **ناقص كمنتج** | `/games` موجودة. في تقارير التدقيق الصفحة تقول غير متاحة في التجربة. محرّك الألعاب غير مدمج. |
| **الإعلانات** | **جزئي / داخلي** | `/advertise/**` و`/admin/ads/**`. |
| **الذكاء الداخلي** | **جزئي / إداري** | صفحات إدارة بيانات الذكاء والذكاء الخاص و`/ai-hub`. كثير منه خلف أعلام إيقاف. |

صفحات أخرى على ألفا: حساب، إعدادات، إشعارات، محفوظات، بحث، شروط، خصوصية، مقالات، مدينة (نموذج)، تغذية (مغلقة في الإنتاج حسب تقارير أخرى — غير مؤكد على هذا البرانش بدون تشغيل).

---

## 6 — الفجوة مع قاعدة البيانات

قول المالك: السيرفر الحي فيه مايغريشنز **ليست** في ألفا: 20260935 إلى 20260938. و20260934 موجود في الكود وغير مطبّق حي.

### 20260934 على ألفا

**مؤكد.** الملف على `origin/alpha-0.2`:

`supabase/migrations/20260934_learning_teacher_student_platform_v1.sql`

معناه: منصّة معلّم/طالب (تقديم معلّم، حقول دورة، تقييمات، هيكل أرباح بدون دفع). هذا يطابق قول المالك أنه في الكود وغير مطبّق على الحي.

ملفات أيلول الأخرى على ألفا فقط: ترجمة 20260902 و20260910–14، سلامة المحتوى 20260928، تسجيل حر في التعلّم 20260930، مكتبة الصوت 20260932، مكافآت الدعوة 20260933. **لا** 20260929 ولا 20260935–38.

### أين توجد ملفات 20260935–20260938

بحث في **كل** برانشات الأصل عن أسماء الملفات:

| الملف | المعنى | البرانشات التي فيها الملف |
|---|---|---|
| `20260935_rich_personal_profile_foundation_v1.sql` | أساس الملف الشخصي الغني | `central/umtuba-um-streak-on-3ccc-v1` ، `pc2/social-comm-rich-profile-renumber-integrate-v1` |
| `20260935_store_seller_approval_reviewer_audit_v1.sql` | سجل موافقة البائع (**اسم رقم مكرر لشيء آخر**) | `central/store-seller-approval-admin-v1` |
| `20260936_communications_identity_discovery_v1.sql` | اكتشاف الهوية في الرسائل | `central/umtuba-um-streak-on-3ccc-v1` ، `pc2/social-comm-rich-profile-renumber-integrate-v1` |
| `20260937_um_streak_social_camera_foundation_v1.sql` | أساس كاميرا سلسلة أم | `pc2/um-streak-final-completion-v1` ، `pc2/umtuba-um-streak-social-camera-foundation-v1` |
| `20260938_um_streak_final_completion_v1.sql` | إكمال سلسلة أم | `pc2/um-streak-final-completion-v1` فقط |

نسخ قديمة بنفس المعنى لكن بأرقام أخرى (ليست 20260935–38):

- `20260915_rich_personal_profile_foundation_v1.sql` و `20260916_communications_identity_discovery_v1.sql` على برانشات حياة أم/الاتصالات المتأخرة.

**خطر:** رقم 20260935 مستخدم لملفين مختلفين على برانشات مختلفة. الحي طبّق واحداً منهما (حسب المالك: الملف الشخصي الغني). لا يُعاد تطبيق ملف البائع بنفس الرقم.

---

## 7 — الخلاصة

المشروع حي على خط `alpha-0.2` وفيه فيديوهات وتعلّم ومتجر كتالوج 540 ورسائل عادية وبث وحياة أم أولى وعالم معلّق ومكافآت و13 لغة.
انتهى تقريباً كمنتج يومي: المشاهدة، التعلّم العام، كتالوج المتجر، الدخول والحساب، الترجمة الأساسية.
نصف مبني على ألفا: البث، حياة أم، العالم، مركز البائع، المكافآت، الإعلانات، الذكاء الإداري.
مبني وجاهز خارج ألفا وقريب منها: شعار الهيدر وفهرسة جوجل، لوحة التعلّم الجديدة، سلسلة أم، الملف الغني واكتشاف الأصدقاء، موافقة البائعين.
مبني وكبير لكنه بعيد عن ألفا: تجارة الدفع/الاسترجاع، فرق التعاون، محرّك الألعاب، شهادات التعلّم.
قاعدة البيانات الحيّة سبقت ألفا بأربعة ملفات (35–38) بينما ألفا تملك 34 للتعلّم ولم يُطبَّق حي.
هناك نحو 600 برانش؛ نحو 163 بلا شغل فريد ومرشّحة للتنظيف؛ مئات الطبقات مكررة.
المالك يجب أن يقرر: أي خط يُعتمد بعد ألفا (الهيدر/التعلّم/الرسائل/الملف) دون خلط رقم 20260935.
المالك يجب أن يقرر: هل تُقرَّب سلسلة التجارة والألعاب والتعاون أم تُترك حتى لا تُكسر ألفا.
المالك يجب أن يقرر: تنظيف البرانشات الميتة بعد أخذ نسخة احتياطية — هذا الملف لا يحذف شيئاً.

---

**منهج الدليل:** `git fetch origin --prune` في 13 أيلول 2026، ثم عدّ الحفظات أمام/خلف `origin/alpha-0.2`، وسجلات الحفظات، وقوائم الملفات، وشجرة صفحات ألفا. لا أسرار ولا كلمات مرور في هذا الملف.
