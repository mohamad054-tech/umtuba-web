# جرد ميزات منصة UMTUBA

**تاريخ الجرد:** 13 أيلول / سبتمبر 2026  
**الفرع الذي فُحص محلياً:** `feat/legal-pages-v1` (الالتزام `c7dd4d68`)  
**خط النشر الحالي للمقارنة:** `origin/central/approved-header-production-deploy-v1`  
**ما فُحص أيضاً:** مجلد `docs/`، مجلد `supabase/migrations/`، وكل فروع `origin` بعد `git fetch origin --prune`

هذا الملف مكتوب لصاحب القرار الذي لا يبرمج.  
كل حكم مبني على ملفات موجودة في المستودع. إذا لم نستطع الجزم كتبنا: **غير معروف**.

**معنى العلامات**

| العلامة | المعنى |
|---|---|
| مستخدم | يوجد كود تطبيق يقرأ أو يكتب هذا الجدول أو يفتح هذه الصفحة للمستخدم |
| موجود بلا استخدام | الجدول أو الصفحة مبنية في الملفات لكن التطبيق الحي لا يستخدمها بشكل واضح — هذه هي الميزات المدفونة |
| غير معروف | يوجد أثر، لكن لا نستطيع الجزم إن كان يعمل على الموقع الحي |
| مكتمل | يظهر للمستخدم ويعمل لغرضه الأساسي |
| جزئي | جزء يعمل وجزء ناقص أو تجميلي |
| هيكل فارغ | صفحة أو جدول موجودان والواجهة تقول صراحة إن الشيء غير جاهز |
| مهجور | بقي من تجربة قديمة، أو محجوب في الإنتاج، أو على فرع لم يُدمج |

لم نلمس قاعدة البيانات الحية. لم ندمج ولم نحذف ولم نُسجّل التزاماً.

---

## القسم 1 — كل الجداول

عدد الجداول التي أنشأتها ملفات الترحيل في هذا الفرع: **284 جدولاً**.  
جدول المنشورات `posts` موجود من قبل هذه الملفات ويُعدَّل فيها؛ أضفناه في البداية.

عدد الأعمدة تقريبي (من تعريف الإنشاء الأول؛ بعض الجداول اكتسبت أعمدة لاحقاً).

### 1-أ. الحساب والمنشورات — أساس الموقع

| الجدول | الغرض بلغة بسيطة | أعمدة تقريباً | الاستخدام |
|---|---|---|---|
| `posts` | منشورات الفيديو والنصوص | غير معروف (قديم + تعديلات كثيرة) | **مستخدم** — `lib/supabase/posts.ts` و`videoPosts.ts` |
| `profiles` | ملف المستخدم (الاسم، المدينة، الدولة…) | 5 عند الإنشاء ثم زيدت | **مستخدم** — `lib/supabase/profiles.ts` |
| `account_deletion_requests` | طلب حذف الحساب | 10 | **مستخدم** — صفحة `/account-deletion` |
| `data_export_requests` | طلب تصدير بيانات المستخدم | 10 | **مستخدم في الكود** على هذا الفرع؛ الترحيل **لم يُطبَّق** على القاعدة الحية بعد — `supabase/migrations/20260940_data_export_requests_v1.sql` |
| `platform_admins` | من يُعدّ مشرف منصة | 4 | **مستخدم** في مسارات الإدارة والإعلانات |
| `user_blocks` | حظر مستخدم لمستخدم | 4 | **غير معروف** — جداول سلامة `20260928`؛ لا يظهر زر واضح لكل المستخدمين |
| `ugc_reports` | بلاغ عن محتوى | 9 | **غير معروف** — نفس ملف السلامة |

### 1-ب. الإعجاب والتعليق والمشاهدة

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `post_likes` | إعجابات | 3 | **مستخدم** |
| `post_comments` | تعليقات | 5 | **مستخدم** |
| `post_saves` | محفوظات | 3 | **مستخدم** — `/saved` |
| `post_shares` | مشاركات | 4 | **مستخدم** |
| `post_views` | سجل مشاهدة المنشور + دولة تقريبية لاحقاً | 3 ثم زيدت | **مستخدم** عبر إجراء تسجيل المشاهدة |
| `profile_follows` | متابعة حساب | 3 | **مستخدم** — `/following` |

### 1-ج. رحلة المنشور والإشعارات والنقاط

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `post_journey_countries` | الدول التي وصلها منشور | 7 | **مستخدم جزئياً**: القائمة على `/post-journey` تقرأه؛ الكرة الأرضية **لا** ترسم هذه الدول. الكتابة تحتاج رمز دولة من الشبكة. الدليل: تحقيق سابق + `app/post-journey/page.tsx` |
| `notifications` | إشعارات المستخدم | 12 | **مستخدم** — `/notifications` |
| `notification_preferences` | ماذا يريد المستخدم أن يصله | 7 | **مستخدم** من الإعدادات |
| `um_point_balances` | رصيد نقاط UM | 3 | **مستخدم** — `/rewards` و`lib/wallet/adapters/umPoints.ts` |
| `um_points_ledger` | سجل كسب النقاط | 7 | **مستخدم** — `/rewards` |
| `um_points_config` | أرقام حدود النقاط | 4 | **مستخدم** من الخادم |
| `creator_ai_insights` | نصائح ذكاء للناشر | 8 | **مستخدم** — `/creator/insights` |
| `user_invites` | دعوات مستخدمين | 7 | **موجود بلا استخدام** — لا يظهر من التطبيق استدعاء مباشر |
| `push_tokens` | أجهزة لاستقبال إشعار الجوال | 15 | **موجود بلا استخدام** — لا كود تطبيق يكتب فيه (`20260805`) |
| `activity_score_balances` | نقاط نشاط للمستخدم | 4 | **غير معروف** — كود مكافآت يلمسه؛ الواجهة العامة ضعيفة |
| `activity_score_ledger` | سجل نقاط النشاط | 9 | **غير معروف** |
| `activity_tier_history` | ترقية مستوى النشاط | 8 | **موجود بلا استخدام** |
| `activity_tier_config` | إعداد مستويات النشاط | 3 | **غير معروف** |

### 1-د. الإحالات ومحرّك المكافآت الجديد

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `referral_codes` | رمز دعوة | 5 | **مستخدم** — `/join` و`/invite/[code]` و`/rewards` |
| `referral_attributions` | من دعا من | 11 | **مستخدم** من الخادم |
| `referral_conversions` | تحولت الدعوة لتسجيل | 10 | **مستخدم** من الخادم |
| `referral_risk_signals` | شبهة احتيال إحالة | 7 | **غير معروف** — خلفية فقط |
| `reward_event_types` | أنواع أحداث المكافأة | 4 | **غير معروف** — محرّك `20260933`؛ الواجهة ما زالت تعتمد النقاط القديمة أكثر |
| `reward_rules` | قواعد المكافأة | 22 | **غير معروف** |
| `reward_rule_versions` | نسخ القواعد | 8 | **غير معروف** |
| `reward_events` | أحداث المكافأة | 9 | **موجود بلا استخدام** من واجهة المستخدم |
| `reward_qualifications` | من يستحق مكافأة | 11 | **غير معروف** |
| `reward_abuse_flags` | علامات إساءة | 8 | **غير معروف** |
| `reward_rule_audits` | سجل تغيير القواعد | 8 | **غير معروف** |
| `reward_account_eligibility` | أهلية الحساب | 4 | **غير معروف** |

### 1-هـ. الرسائل

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `conversations` | محادثة | 9 | **مستخدم** — `/messages` |
| `conversation_participants` | أعضاء المحادثة | 10 | **مستخدم** |
| `direct_conversation_pairs` | محادثة ثنائية فريدة | 4 | **مستخدم** |
| `messages` | الرسائل | 13 | **مستخدم** |
| `message_attachments` | مرفقات | 13 | **جزئي / غير معروف** — الأساس وُضع «لاحقاً» في `20260713_messenger_v1_foundation.sql` |
| `message_reactions` | تفاعل على رسالة | 4 | **مستخدم** بعد مرحلة الرسائل 2 |
| `message_hides` | إخفاء رسالة | 3 | **مستخدم** بعد مرحلة الرسائل 2 |

### 1-و. البث المباشر — كثير منه مدفون

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `live_rooms` | غرفة البث (عنوان، مدينة، دولة) | 21 | **مستخدم** — `/live` |
| `live_participants` | من داخل الغرفة | 8 | **مستخدم** |
| `live_chat_messages` | دردشة البث | 11 | **مستخدم** |
| `live_sessions` | جلسة بث | 11 | **غير معروف** — كود يلمح للأعمدة |
| `live_stage_requests` | طلب الصعود للمنصة | 10 | **غير معروف** — أساس ضيف متعدد |
| `live_stage_invitations` | دعوة للمنصة | 8 | **غير معروف** |
| `live_room_precise_location` | إحداثيات دقيقة للغرفة | 4 | **موجود بلا استخدام** — النموذج لا يرسل خطاً وطولاً |
| `live_reports` | بلاغ على بث | 11 | **موجود بلا استخدام** |
| `live_bans` | حظر من غرفة | 10 | **موجود بلا استخدام** |
| `live_gifts` | هدايا البث | 8 | **موجود بلا استخدام** — **مدفون** |
| `live_reactions` | تفاعلات البث | 6 | **غير معروف** — أثر ضعيف |
| `live_recordings` | تسجيل البث | 11 | **موجود بلا استخدام** — **مدفون** |
| `live_replays` | إعادة المشاهدة | 10 | **موجود بلا استخدام** — **مدفون** |
| `live_moderation_events` | أحداث إشراف البث | 8 | **موجود بلا استخدام** |
| `live_polls` | استطلاع أثناء البث | 10 | **موجود بلا استخدام** — **مدفون** |
| `live_poll_votes` | أصوات الاستطلاع | 4 | **موجود بلا استخدام** |
| `live_quizzes` | اختبار أثناء البث | 10 | **موجود بلا استخدام** — **مدفون** |
| `live_audience_questions` | أسئلة الجمهور | 10 | **موجود بلا استخدام** — **مدفون** |
| `live_ai_artifacts` | مخرجات ذكاء للبث | 9 | **موجود بلا استخدام** — **مدفون** |

### 1-ز. القصص والأصوات والمقالات والتوصية

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `stories` | قصص قصيرة | 7 | **مستخدم** — `lib/stories/queries.ts` |
| `story_views` | مشاهدة قصة | 5 | **مستخدم** — `lib/stories/views.ts` |
| `social_sounds` | مكتبة أصوات للفيديو | 18 | **مستخدم** — `/sounds/[id]` |
| `social_sound_saves` | حفظ صوت | 3 | **غير معروف** |
| `social_sound_reports` | بلاغ عن صوت | 7 | **غير معروف** |
| `articles` | مقالات | 8 | **مستخدم** — `/articles/[articleId]` و`/create/article` |
| `article_teaser_jobs` | توليد فيديو تشويقي للمقال | 15 | **غير معروف** — خلفية |
| `content_registry` | سجل موحّد لأنواع المحتوى | 12 | **مستخدم** في طبقة المحتوى |
| `video_product_attachments` | منتجات معلّقة على فيديو | 10 | **مستخدم** في رف التجارة على الفيديو |
| `video_commerce_events` | أحداث النقر على منتج في فيديو | 8 | **غير معروف** |
| `watch_signals` | إشارات المشاهدة للتوصية | 21 | **غير معروف** — بنية توصية `20260731` |
| `video_quality_signals` | جودة الفيديو للتوصية | 19 | **غير معروف** |
| `creator_quality_signals` | جودة الناشر | 18 | **غير معروف** |
| `user_interest_profiles` | اهتمامات المستخدم | 15 | **غير معروف** |

### 1-ح. المتجر — مستخدم في معظمه

جداول المتجر كثيرة وتعمل مع صفحات `/store` و`/seller` و`/admin/store`. الحكم العام: **مستخدم** ما لم يُذكر خلاف ذلك.

`stores`, `store_members`, `store_products`, `product_categories`, `product_brands`, `product_variants`, `product_prices`, `product_inventory`, `product_media`, `product_category_links`, `seller_applications`, `store_wishlist_items`, `carts`, `cart_items`, `buyer_addresses`, `checkout_quotes`, `orders`, `order_items`, `order_status_history`, `order_discounts`, `payment_attempts`, `store_payment_outcome_events`, `store_coupons`, `store_coupon_products`, `store_coupon_categories`, `store_coupon_regions`, `store_coupon_redemptions`, `order_fulfillments`, `order_fulfillment_events`, `order_shipments`, `store_shipping_methods`, `store_shipping_providers`, `store_shipping_zones`, `store_shipping_rates`, `store_tax_configs`, `store_commerce_config`, `store_commerce_config_audit`, `inventory_reservations`, `inventory_reservation_events`, `store_seller_listings`.

| الجدول | ملاحظة | الاستخدام |
|---|---|---|
| `store_settlement_events` | تسوية أموال البائع | **موجود بلا استخدام** من واجهة المشتري — إدارة مالية داخلية |
| `store_settlement_active_allocations` | توزيع التسوية | **موجود بلا استخدام** من الواجهة العامة |

عدد الأعمدة تقريباً: من 2 (`store_coupon_products`) إلى 19 (`inventory_reservations`). الملفات: `supabase/migrations/20260728_store_product_foundation_v1.sql` وما بعدها حتى `20260870`.

### 1-ط. الإعلانات

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `advertiser_accounts` | حساب معلن | 13 | **مستخدم** — `/advertise` و`/admin/ads` |
| `advertiser_members` | أعضاء حساب الإعلان | 5 | **مستخدم** |
| `ad_campaigns` | حملة | 14 | **مستخدم** |
| `ad_sets` | مجموعة إعلان | 25 | **مستخدم** |
| `ad_creatives` | الإبداع | 16 | **مستخدم** |
| `ads` | الإعلان نفسه | 8 | **مستخدم** |
| `ad_review_events` | مراجعة المشرف | 9 | **مستخدم** في الإدارة |
| `ad_impression_events` | ظهور الإعلان | 10 | **غير معروف** إن كان يُسجَّل حيّاً |
| `ad_click_events` | نقر الإعلان | 10 | **غير معروف** |
| `ad_daily_metrics` | أرقام يومية | 13 | **غير معروف** |

الملف: `supabase/migrations/20260807_ads_platform_foundation_v1.sql`.

### 1-ي. التعلم — أكبر مجموعة جداول

هذه الجداول تغذي `/learning` ولوحة المعلّم. الحكم العام لمجموعة الدورة والتسجيل والتقدّم: **مستخدم** في الصفحات. بعض الجداول أدقّ من الواجهة الظاهرة للمستخدم العادي.

**فضاءات وبرامج ودورات:**  
`learning_spaces`, `learning_space_members`, `learning_space_invites`, `learning_space_settings`, `learning_audit_events`, `learning_programs`, `learning_program_staff`, `learning_program_settings`, `learning_courses`, `learning_course_staff`, `learning_course_settings`, `learning_course_public_previews`, `learning_sections`, `learning_section_settings`, `learning_lessons`, `learning_lesson_settings`, `learning_lesson_content_blocks`.

**أنشطة واختبارات:**  
`learning_activities`, `learning_activity_settings`, `learning_questions`, `learning_question_answer_keys`, `learning_attempts`, `learning_attempt_answers`, `learning_attempt_results`, `learning_attempt_answer_results`, `learning_attempt_result_releases`, `learning_attempt_progress_applications`.

**واجبات ومشاريع ومختبر:**  
`learning_assignment_specs`, `learning_assignment_resources`, `learning_assignment_submissions`, `learning_assignment_artifacts`, `learning_assignment_reviews`, `learning_assignment_progress_applications`, `learning_project_specs`, `learning_project_submissions`, `learning_project_reviews`, `learning_lab_specs`, `learning_lab_completions`.

**تقدّم وشهادات ومجتمع:**  
`learning_enrollments`, `learning_enrollment_events`, `learning_course_progress`, `learning_lesson_progress`, `learning_section_progress`, `learning_progress_events`, `learning_certificates`, `learning_discussion_threads`, `learning_discussion_replies`, `learning_qa_questions`, `learning_qa_answers`, `learning_announcements`.

**بث تعليمي وموارد:**  
`learning_live_sessions`, `learning_live_attendance`, `learning_course_resources`, `learning_course_resource_downloads`, `learning_lesson_objectives`, `learning_lesson_prerequisites`, `learning_lesson_point_costs`, `learning_lesson_unlocks`.

**معلّم ومنصّة طلاب:**  
`learning_teacher_profiles`, `learning_teacher_course_products`, `learning_course_reviews`, `learning_teacher_earnings_entries`, `learning_welcome_video_hooks`.

| الجدول | الغرض | الاستخدام |
|---|---|---|
| `learning_ai_tutor_threads` | محادثة مدرّس ذكاء | **جزئي** — صفحة `/learning/lessons/[lessonId]/ai-tutor` موجودة |
| `learning_ai_tutor_messages` | رسائل المدرّس الذكي | **جزئي** |
| `learning_welcome_video_hooks` | فيديو ترحيب للمعلّم | **موجود بلا استخدام** واضح في الواجهة العامة |

### 1-ك. العالم والمدن — كثير مدفون

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `world_countries` | دول الكتالوج | 8 | **مستخدم** — `/world` |
| `world_regions` | مناطق | 9 | **مستخدم** خلف الكواليس |
| `world_cities` | مدن | 11 | **مستخدم** — `/world/city/[citySlug]` |
| `world_districts` | أحياء | 10 | **غير معروف** |
| `world_places` | أماكن (متجر، مطعم…) | 19 | **مستخدم** — `/world/place/[placeSlug]` |
| `world_place_categories` | تصنيفات المكان | 10 | **مستخدم** |
| `world_place_category_assignments` | ربط تصنيف | 4 | **مستخدم** |
| `world_place_media` | صور المكان | 10 | **مستخدم** |
| `world_place_links` | روابط المكان | 9 | **مستخدم** |
| `world_place_opening_hours` | ساعات العمل | 9 | **مستخدم** |
| `world_place_post_links` | ربط مكان بمنشور | 4 | **غير معروف** |
| `world_place_live_links` | ربط مكان ببث | 4 | **غير معروف** |
| `world_city_post_links` | ربط مدينة بمنشور | 4 | **غير معروف** |
| `world_city_live_links` | ربط مدينة ببث | 4 | **غير معروف** |
| `world_feature_flags` | مفاتيح تشغيل طبقات العالم | 5 | **مستخدم** من الخادم |
| `world_feature_flag_events` | سجل المفاتيح | 6 | **غير معروف** |
| `world_layers` | طبقات (رحلة، مجتمع…) | 4 | **غير معروف** |
| `world_city_layers` | تشغيل طبقة لمدينة | 5 | **غير معروف** |
| `world_place_layers` | تشغيل طبقة لمكان | 5 | **غير معروف** |
| `world_moderation_events` | إشراف أماكن | 8 | **غير معروف** |
| `user_location_safety` | أمان موقع المستخدم | 3 | **موجود بلا استخدام** |
| `hello_city_posts` | منشورات «مرحباً أيتها المدينة» | 14 | **موجود بلا استخدام** — **مدفون** |
| `hello_city_reports` | بلاغات مرحباً أيتها المدينة | 6 | **موجود بلا استخدام** |
| `world_journeys` | رحلة سياحية مرتّبة بين مدن | 11 | **موجود بلا استخدام** — **مدفون** |
| `world_journey_stops` | محطات الرحلة السياحية | 6 | **موجود بلا استخدام** |
| `world_journey_posts` | منشورات على الرحلة السياحية | 3 | **موجود بلا استخدام** |
| `world_city_communities` | مجتمع مدينة | 7 | **موجود بلا استخدام** — **مدفون** |
| `world_local_events` | مناسبات محلية | 13 | **موجود بلا استخدام** — **مدفون** |
| `world_business_profiles` | ملف عمل للمكان | 7 | **موجود بلا استخدام** |
| `world_place_reviews` | تقييمات الأماكن | 9 | **موجود بلا استخدام** — **مدفون** |
| `world_place_ai_summaries` | ملخص ذكاء للمكان | 8 | **موجود بلا استخدام** |

الملفات: `20260825_world_discovery_hello_city_foundation_v1.sql` و`20260826_world_discovery_domain_phase2.sql`.  
الوثيقة تقول إن رحلة المنشور منفصلة عن رحلات العالم: `docs/world/WORLD_DISCOVERY_PHASE2_ARCHITECTURE.md`.

### 1-ل. الألعاب — جداول موجودة واللعب غير حي

| الجدول | الغرض | أعمدة | الاستخدام |
|---|---|---|---|
| `games` | كتالوج الألعاب | 14 | **موجود بلا استخدام** حيّاً — الصفحة تقول «غير متاح بعد» (`app/games/page.tsx`) |
| `game_player_profiles` | ملف لاعب | 3 | **موجود بلا استخدام** |
| `game_privacy_settings` | خصوصية اللعب | 7 | **موجود بلا استخدام** |
| `game_sessions` | جلسة لعب | 18 | **موجود بلا استخدام** |
| `game_session_results` | نتيجة جلسة | 17 | **موجود بلا استخدام** |
| `game_player_progress` | تقدّم اللاعب | 10 | **موجود بلا استخدام** |
| `game_achievements` | إنجازات | 9 | **موجود بلا استخدام** |
| `game_player_achievements` | إنجازات اللاعب | 6 | **موجود بلا استخدام** |

الدليل: `docs/games/implementation/GAMES_PLATFORM_FOUNDATION_V1.md` يقول صراحة: لا لعبة قابلة للعب في هذه الشريحة. الترحيل `20260846` **غير مطبّق على القاعدة الحية** حسب نفس الوثيقة.

### 1-م. نظام المال الداخلي UEOS — مدفون بالكامل

سبعة جداول في `20260822_ueos_foundation_v1.sql`. لا يوجد `.from("ueos_...")` في `app/` أو `lib/`.

`ueos_products`, `ueos_assets`, `ueos_policies`, `ueos_accounts`, `ueos_journal_entries`, `ueos_ledger_lines`, `ueos_account_balances`.

**موجود بلا استخدام — مدفون.** دفتر حسابات داخلي لكل أموال المنصة مستقبلاً. الوثيقة: `docs/ueos/UEOS_FOUNDATION_V1.md`.

### 1-ن. الذكاء الاصطناعي والمعرفة والترجمة الخاصة بالإدارة

صفحات تحت `/admin/...` موجودة. هذا لا يعني أن المستخدم العادي يراها، ولا أن القاعدة الحية مملوءة.

| المجموعة | الجداول | الاستخدام |
|---|---|---|
| نواة الذكاء | `ai_sessions`, `ai_runs`, `ai_run_events`, `ai_usage_records`, `ai_evaluations`, `ai_memory_records` | **غير معروف** — بوابة `UMTUBA_AI_HUB` مغلقة افتراضياً (`app/ai-hub/page.tsx`) |
| بيانات الذكاء | `ai_datasets`, `ai_dataset_versions`, `ai_evaluation_sets`, `ai_experiments`, `ai_models`, `ai_promotion_queue` + جداول سير الموافقة | **غير معروف** — لوحة `/admin/ai-data` |
| ذكاء خاص | `private_ai_models`, `private_ai_capabilities`, `private_ai_hardware_contracts`, `private_ai_deployment_profiles`, `private_ai_routing_contracts`, `private_ai_permissions`, `private_ai_lifecycle_audit` | **موجود بلا استخدام** للمستخدم — خطط أجهزة خاصة |
| المعرفة | `knowledge_sources`, `knowledge_assets`, `knowledge_datasets`, `knowledge_graph_nodes`, `knowledge_graph_edges`, `knowledge_acquisition_history` | **غير معروف** — `/admin/knowledge` |
| استوديو الترجمة | `translation_studio_*` (9 جداول) + `translation_intelligence_*` (3) | **مستخدم** لفريق التشغيل عبر `/admin/translation-studio` |
| البحث | `search_entity_types`, `search_recent_queries` | **مستخدم** — `/search` |

### 1-س. جداول على فروع أخرى ولم تُدمج هنا

فرع `origin/pc2/um-streak-final-completion-v1` فيه ترحيلات `20260937` و`20260938` لميزة **سلسلة UM** (كاميرا اجتماعية يومية بين الأصدقاء).  
هذه الملفات **غير موجودة** على الفرع الحالي. **مهجور بالنسبة للنشر الحالي.**

---

## القسم 2 — كل المسارات

المصدر: كل ملف `app/**/page.tsx` على هذا الفرع (**206 صفحات**) + مسارات إضافية ظهرت على فروع `origin` ولم تُدمج.

شريط التنقل الأساسي للمستخدم (`app/lib/nav/routes.ts`): الرئيسية، العالم، التعلّم، البث، الرسائل.  
التذييل القانوني يضيف: الخصوصية، الشروط، الكوكيز، المجتمع، الحقوق، الدعم، عنّا، حذف الحساب، تصدير البيانات.

### 2-أ. ما يراه الزائر أو العضو عادة

| المسار | ماذا يظهر | الحالة |
|---|---|---|
| `/` | الصفحة الرئيسية / الاكتشاف | مكتمل |
| `/welcome` | ترحيب | مكتمل |
| `/discover` | نفس خط الاكتشاف (اسم قديم) | مكتمل كاختصار |
| `/watch` | مشاهدة الفيديو | مكتمل |
| `/live` | قائمة البث | جزئي (الغرف تعمل؛ الهدايا/التسجيل/الاختبارات غير ظاهرة) |
| `/live/[roomId]` | غرفة بث | جزئي |
| `/life` | خلاصة حياة / منشورات | جزئي |
| `/life/compose` | كتابة منشور حياة | جزئي |
| `/messages` | الرسائل | مكتمل لأساس الدردشة |
| `/notifications` | الإشعارات | مكتمل |
| `/settings` | الإعدادات | مكتمل |
| `/saved` | المحفوظات | مكتمل |
| `/following` | المتابَعون | مكتمل |
| `/search` | البحث العام | مكتمل |
| `/login` `/signup` `/forgot-password` `/auth/update-password` | الدخول والتسجيل | مكتمل |
| `/register` | يحوّل فوراً إلى التسجيل | مهجور (اختصار قديم) |
| `/join` | رابط دعوة | مكتمل |
| `/invite/[code]` | دعوة برمز | مكتمل |
| `/profile` `/profile/[username]` | الملف الشخصي | مكتمل |
| `/create` `/create/video` `/create/post` `/create/article` | النشر | مكتمل للأساسيات |
| `/articles/[articleId]` | مقال | مكتمل |
| `/sounds/[id]` | صفحة صوت | جزئي (لا فهرس `/sounds`) |
| `/world` `/world/search` `/world/city/[citySlug]` `/world/place/[placeSlug]` | اكتشاف مدن وأماكن | جزئي (لا رحلات عالم ولا تقييمات) |
| `/learning` وكتالوج الدورات والدروس | التعلّم | جزئي إلى مكتمل حسب الدورة |
| `/store` والسلة والطلب والمتجر | التسوق | جزئي (مدفوعات حقيقية غير مؤكدة للمالك) |
| `/rewards` | النقاط والدعوة | مكتمل كواجهة نقاط |
| `/games` | يقول صراحة: غير متاح بعد | هيكل فارغ |
| `/privacy` `/terms` `/cookies` `/community-guidelines` `/copyright` `/about` `/support` `/account-deletion` `/data-export` | الصفحات القانونية | مكتمل **على هذا الفرع** — **غير منشور على الموقع الحي بعد** |

### 2-ب. مسارات موجودة لكن ضعيفة أو تجريبية

| المسار | ماذا يظهر | الحالة |
|---|---|---|
| `/post-journey` | رحلة المنشور: أرقام حقيقية + كرة ديكور | جزئي |
| `/city/[citySlug]` | مدينة بعد الكرة | جزئي / مهجور كتنقّل أساسي |
| `/journey-pro` | مختبر كرة؛ في الإنتاج يُخفى | مهجور للمستخدم الحي |
| `/feed` | خلاصة قديمة؛ في الإنتاج تُخفى | مهجور |
| `/live/media-lab` | مختبر بث؛ في الإنتاج يُخفى | مهجور |
| `/ai-hub` `/ai-hub/assistant` | مركز ذكاء؛ مغلق ما لم يُفتح مفتاح | هيكل فارغ للمستخدم الحي |
| `/creator/insights` | نصائح ناشر | جزئي |
| `/sandbox/business-preview` | معاينة تجريبية للأعمال | مهجور عن الزائر العادي |

### 2-ج. التعلّم — صفحات كثيرة (معلّم / طالب / مشرف دورة)

كل المسارات تحت `/learning/...` في قائمة الصفحات أعلاه موجودة كملفات.  
ما يراه الطالب العادي غالباً: الكتالوج، الدورة، الدرس، التقدّم.  
لوحة المعلّم (`/learning/teacher/...`) والمدرّب (`/learning/instructor/...`) **جزئية**: الأساس موجود، وجود دورات حقيقية على الموقع الحي **غير معروف**.

### 2-د. البائع والإعلانات والإدارة

`/seller/...` و`/advertise/...` و`/admin/...` كلها موجودة (متجر، إعلانات، معرفة، ذكاء خاص، استوديو ترجمة).  
ليست في الشريط السفلي. يصلها من يعرف الرابط أو قائمة داخلية.  
الحالة العامة: **جزئي** (واجهات تشغيل، لا منتج جاهز لكل زائر).

### 2-هـ. مسارات على فروع أخرى فقط (ليست على هذا الفرع)

| المسار | الفرع | المعنى |
|---|---|---|
| `/um-streak-preview` | `origin/pc2/um-streak-final-completion-v1` | معاينة سلسلة يومية مع الأصدقاء |
| `/edit/post/[postId]` | `origin/desktop/umtuba-post-publish-editing-v1` | تعديل منشور بعد النشر |
| `/learning/courses/[courseId]/workspace` | فروع التعاون المكتبية | مساحة عمل مشتركة للدورة |
| `/u/[username]` | `origin/prototypes/games-engine-v1` (وأقدم) | اختصار ملف شخصي |
| `/store/p/[slug]` | نفس الفرع تقريباً | اختصار منتج |
| `/sandbox/digital-asset/...` | فروع أقدم / ألعاب | محفظة أصول تجريبية |
| `/sandbox/learning/partners/...` | فروع أقدم | شركاء تعلّم تجريبيون |
| `/sandbox/store/cj-...` | فروع أقدم | تجريب كتالوج شريك |

### 2-و. مسارات لا يصلها أي زر تنقّل رئيسي

هذه تفتح برابط مباشر أو إشعار أو تجريب مطوّرين:

- `/feed`, `/journey-pro`, `/live/media-lab`, `/post-journey` (إلا من زر رحلة المنشور في المشاهدة أو من إشعار)
- `/city/[citySlug]` (من الكرة)
- كل `/admin/...`
- `/ai-hub` و`/ai-hub/assistant`
- `/sandbox/...`
- `/creator/insights` (رابط جانبي من رحلة المنشور)
- `/invite/[code]` و`/join` (روابط دعوة)
- `/register` (تحويل صامت)
- معظم `/learning/instructor/...` إن لم يكن المستخدم معلّماً
- `/games` إن لم تُضغط دائرة الألعاب في الرئيسية

---

## القسم 3 — الميزات المبنية جزئياً

هذه أفكار وُضعت في القاعدة أو في الشاشات ثم توقفت في المنتصف.

1. **رحلة المنشور حول العالم**  
   المقصود: المنشور يسافر على خريطة كلما شاهده ناس من دول مختلفة.  
   الموجود: جدول دول + صفحة أرقام + كرة جميلة بأربع مدن ثابتة.  
   الناقص: الكرة لا تستخدم الدول الحقيقية؛ موقع الفيديو يُكتب يدوياً «UMTUBA / حول العالم»؛ دولة المشاهد غالباً لا تُعرف على الخادم الحالي.

2. **هدايا واستطلاعات واختبارات وتسجيل البث**  
   المقصود: بث حي مثل المنصات الكبيرة (هدايا، أسئلة، إعادة).  
   الموجود: جداول كاملة في `20260713` و`20260714`.  
   الناقص: لا واجهة مستخدم تشغّلها.

3. **مرحباً أيتها المدينة + مجتمع المدينة + مناسبات محلية + تقييمات الأماكن**  
   المقصود: المدينة صفحة حيّة فيها ناس ومناسبات وآراء.  
   الموجود: جداول `hello_city_*` و`world_city_communities` و`world_local_events` و`world_place_reviews`.  
   الناقص: لا شاشات تستخدمها. صفحة العالم تعرض أماكن معتمدة فقط.

4. **رحلات العالم السياحية** (`world_journeys`)  
   المقصود: مسار معدّ بين مدن، غير رحلة وصول المنشور.  
   الموجود: جداول ووثيقة مستقبلية.  
   الناقص: لا واجهة.

5. **الألعاب**  
   المقصود: منصة ألعاب داخل UMTUBA.  
   الموجود: جداول جلسات وإنجازات + صفحة تقول «غير متاح بعد».  
   فرع آخر (`prototypes/games-engine-v1`) يدّعي 11 لعبة ولم يُدمج في خط النشر.

6. **دفتر المال الداخلي UEOS + منصة الإيرادات الموحّدة**  
   المقصود: كل فلوس المتجر والتعلّم والإعلانات والبث تمرّ من دفتر واحد.  
   الموجود: جداول ووثائق.  
   الناقص: التطبيق لا يكتب فيها. المدفوعات الحقيقية للمتجر **غير معروفة** إن كانت حيّة.

7. **مركز الذكاء والمدرّس الذكي والذكاء الخاص**  
   المقصود: مساعد داخل التطبيق، ومدرّس للدروس، وأجهزة ذكاء نملكها.  
   الموجود: صفحات ومفاتيح إيقاف. الافتراضي: مغلق.  
   الناقص: تجربة مستخدم مفتوحة على الموقع الحي.

8. **إشعارات الجوال**  
   المقصود: إشعار يصل الهاتف.  
   الموجود: جدول `push_tokens`.  
   الناقص: لا تسجيل أجهزة من التطبيق.

9. **سلسلة UM (كاميرا يومية بين الأصدقاء)**  
   المقصود: عادة يومية اجتماعية داخل الرسائل.  
   الموجود: على فروع PC2 فقط (ترحيل + صفحة معاينة).  
   الناقص: غير مدمج في الكود المنشور.

10. **تعديل المنشور بعد النشر**  
    الموجود: مسار `/edit/post/[postId]` على فرع مكتبي.  
    الناقص: غير مدمج هنا.

11. **مساحة تعاون الدورة (مرفقات وجدول نشاط)**  
    الموجود: فروع مكتبية + مسار `/learning/courses/.../workspace`.  
    الناقص: غير مدمج في هذا الفرع.

12. **توصية ذكية (اهتمامات وإشارات مشاهدة)**  
    الموجود: جداول `watch_signals` و`user_interest_profiles`.  
    الناقص: لا يظهر للمستخدم «لأنك شاهدت…» بشكل واضح من هذه الجداول.

13. **تصدير البيانات / حذف الحساب**  
    الواجهة موجودة. التصدير يضع طلباً في جدول ولا يُنشئ ملفاً يُحمَّل. الحذف طابور للمشغّل.  
    ترحيل التصدير على هذا الفرع لم يُطبَّق على القاعدة الحية.

---

## القسم 4 — الوثائق والخطط

حوالي **180** ملف توثيق تحت `docs/`. هذا ملخص بالموضوع، سطر واحد لكل مجموعة أو وثيقة بارزة.

### العالم والرحلة
- `docs/world/WORLD_DISCOVERY_PHASE2_ARCHITECTURE.md` — تصميم مدن وأماكن وطبقات؛ يذكر رحلات مستقبلية. **جزء منه غير مبنٍ في الواجهة.**
- `docs/world/WORLD_DISCOVERY_HELLO_CITY_FOUNDATION_V1.md` — أساس «مرحباً أيتها المدينة». **الجداول موجودة والواجهة غير ظاهرة.**

### التنقّل والتجربة
- `docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md` — أي صفحة أساسية وأيها تجريبية.
- `docs/architecture/UNIFIED_EXPERIENCE_PAGE_CONSOLIDATION_V1.md` — دمج الصفحات؛ يقترح إخفاء الخلاصة القديمة لاحقاً.
- `docs/architecture/HOME_READINESS_GUARDRAILS_V1.md` — قواعد ما يظهر في الرئيسية.
- `docs/architecture/CONTENT_CARD_SYSTEM_V1.md` — بطاقة المحتوى الموحّدة.
- `docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md` — تعدد اللغات.

### المتجر
ملفات كثيرة تحت `docs/store/implementation/` (سلة، طلب، دفع، شحن، بائع، إدارة).  
تصف بناء المتجر الذي تراه الصفحات.  
`docs/store/DEMO_CATALOG_PREVIEW.md` — كتالوج تجريبي ليس مخزوناً حقيقياً.

### التعلّم
عشرات الملفات تحت `docs/learning/implementation/` (دورة، درس، اختبار، مجتمع، معلّم).  
تصف نظام إدارة تعلّم كامل. ما هو **حي بدورات حقيقية** غير معروف من الملفات وحدها.

### الإعلانات
`docs/ads/` و`docs/ads/platform/` — رؤية ومنصّة قياس ومراجعة.  
جزء «القياس المتقدم» معلَّم **غير منفَّذ** في `05_MEASUREMENT_AND_REPORTING.md`.

### الألعاب
- `docs/games/implementation/GAMES_PLATFORM_FOUNDATION_V1.md` — أساس بلا لعب.
- `docs/games/implementation/GAMES_HUB_RUNTIME_FOUNDATION_V1.md` — تشغيل المحور.
- `docs/games/implementation/GAMES_CATALOG_FOUNDATION_V1.md` — الكتالوج.  
**اللعب الحي غير مبنٍ على خط النشر.**

### المال
- `docs/ueos/UEOS_FOUNDATION_V1.md` — دفتر داخلي. **غير مستخدم في التطبيق.**
- `docs/architecture/revenue/UNIFIED_REVENUE_PLATFORM_FOUNDATION_V1.md` — طبقة إيرادات مشتركة. **عقود أكثر مما هي منتج حي.**
- `docs/rewards/CROSS_PLATFORM_CONTRACT.md` — عقد النقاط عبر المنتجات.

### الذكاء والترجمة والمعرفة
- `docs/architecture/PRIVATE_AI_FOUNDATION_V1.md` و`PRIVATE_AI_DEPLOYMENT_RUNTIME_V1.md` و`PRIVATE_AI_WORKFLOW_LIFECYCLE_V1.md` — ذكاء نملك أجهزته. **غير حي للمستخدم.**
- `docs/architecture/TRANSLATION_STUDIO_FOUNDATION_V1.md` وملفات `docs/translation/` — استوديو ترجمة داخلي.
- `docs/ai/workstreams/` — خرائط تشغيل الذكاء.
- وثائق `docs/core/UM_CORE_*` — طبقة تقنية داخلية للمنصّة، ليست شاشة للمستخدم.

### القصص والبحث
- `docs/stories/STORY_FOUNDATION_V1.md` — أساس القصص.
- `docs/search/GLOBAL_SEARCH_FOUNDATION_V1.md` — البحث العام.

### تشغيل وتسليم داخلي
- `docs/DEVELOPMENT_WORKFLOW.md` — كيف نعمل على القيت والترحيلات.
- `docs/ai/PROJECT_STATE.md` و`CURRENT_TASK.md` و`CURSOR_REPORT.md` — حالة المهام بين الأجهزة.
- `docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md` — تسليم بين أجهزة.
- `docs/ops/` — نشر وتجريب وتعلّم وفراغات تحميل.
- تقارير `docs/ai/UM_CORE_PLATFORM_*_REPORT.md` — فحوص تقنية، ليست ميزات منتج.

### خطط تصف شيئاً لم يُبنَ للمستخدم الحي
- دفتر UEOS ومنصة الإيرادات الموحّدة.
- رحلات العالم ومجتمع المدينة والمناسبات وتقييمات الأماكن ومرحباً أيتها المدينة.
- ألعاب قابلة للعب (الوثائق تقول ذلك صراحة).
- ذكاء خاص على أجهزة نملكها.
- قياس إعلانات متقدم.
- سلسلة UM (وثائق على فروع PC2).
- مساحة تعاون الدورة (فروع مكتبية).

---

## القسم 5 — التعليقات والنوايا المتروكة في الكود

مجموعات من كلمات: TODO، FIXME، coming soon، not implemented، phase 2، later، v2.  
تجاهلنا التطابقات التافهة (أسماء فيديوهات `v2`، كلمة later في جملة عادية عن الوقت).

### البث
- الترجمة والوضوح: «قريباً» وليست أزراراً وهمية — `app/live/hooks/liveTrustHonesty.contract.test.ts`.
- تعاون الاستوديو: رفع لاحق — `app/live/types.ts`.
- هجرة الضيوف المتعددين اسمها Media V2.

### الرسائل
- المرفقات والصوت والفيديو صُمّمت «لاحقاً» في `20260713_messenger_v1_foundation.sql`.
- مرحلة 2 أضافت ردّاً وتفاعلاً وتعديلاً.

### العالم
- ملف الترحيل اسمه Phase 2.
- دمج أماكن العالم في البحث العام مؤجَّل — تعليق في `20260826`.

### التعلّم
- جدول ترتيب عناصر الدرس `learning_lesson_items` **غير منفَّذ** — تعليق في `20260836`.
- وثائق التعلّم فيها أقسام «خارج النطاق لاحقاً».

### الألعاب والمتجر
- بطاقة اللعبة تعرض «Coming soon» — `app/components/games/GameCard.tsx`.
- سكة علامات تجارية في المتجر: «Coming soon» — `app/components/store/BrandRail.tsx`.

### الإعلانات
- القياس المتقدم: «Explicitly not implemented» في `docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md`.

### الذكاء
- أدوات المساعد: «not implemented» عند الاستدعاء — `lib/ai/assistant/assistantFoundation.test.ts`.
- مصادر التوصية الحقيقية «تُسجَّل لاحقاً».

### الرحلة
- وصول الكرة: شريحة لاحقة دون تغيير الكرة القديمة — `JourneyHandoffArrival.tsx`.

### النقاط
- عقد المكافآت: `post_launch_v2` لاحقاً — `docs/rewards/CROSS_PLATFORM_CONTRACT.md`.

### حالة المشروع
- `docs/ai/PROJECT_STATE.md`: لا جوّال / لا أمان P1 كامل / لا حياة UM مرحلة 2 في الخط الحالي.

---

## القسم 6 — البرانشات اليتيمة

المعيار: اسم الفرع يوحي بميزة، وطرفه **ليس** داخل خط النشر `origin/central/approved-header-production-deploy-v1`.  
التاريخ = آخر التزام على ذلك الفرع.

| الفرع | ماذا يبدو أنه يضيف | آخر التزام |
|---|---|---|
| `origin/feat/legal-pages-v1` | صفحات قانونية جديدة (كوكيز، مجتمع، حقوق، عنّا، تصدير بيانات) | 2026-09-13 |
| `origin/prototypes/games-engine-v1` | محرّك ألعاب يدّعي 11 لعبة + صفحات تجريب أصول رقمية | 2026-09-13 |
| `origin/pc2/umtuba-communications-v1-part1b-identity-discovery` | اكتشاف الهوية للتواصل (عمل غير مكتمل) | 2026-09-13 |
| `origin/pc2/um-streak-final-completion-v1` | إكمال سلسلة UM اليومية | 2026-09-05 |
| `origin/pc2/umtuba-um-streak-social-camera-foundation-v1` | أساس كاميرا السلسلة في الرسائل | 2026-09-02 |
| `origin/pc2/umtuba-um-life-home-entry-v1` | دخول حياة UM من الرئيسية | 2026-08-30 |
| `origin/pc2/um-life-rich-personal-profile-v1-part2b` | ملف شخصي أغنى لحياة UM | 2026-08-30 |
| `origin/desktop/umtuba-post-publish-editing-v1` | تعديل المنشور بعد النشر | 2026-08-29 |
| `origin/office/profile-hero-completeness-v1` | اكتمال رأس الملف الشخصي | 2026-09-13 |
| `origin/office/learning-collaboration-workspace-attachments-foundation-v1` | مرفقات مساحة تعاون الدورة | 2026-09-13 |
| `origin/office/learning-collaboration-workspace-activity-timeline-foundation-v1` | خط زمني لنشاط التعاون | 2026-09-13 |
| `origin/learning/partner-marketplace-2026-09-09-import-v1` | سوق شركاء للتعلّم | 2026-09-10 |
| `origin/central/sound-library-v1-catalog-population` | ملء كتالوج الأصوات بأسماء أوضح | 2026-08-20 |
| `origin/desktop/learning-teacher-student-platform-v1` | منصّة معلّم/طالب (مزامنة سطح مكتب) | 2026-09-13 |
| `origin/desktop/learning-world-class-visual-design-v1` | تصميم بصري للتعلّم | 2026-09-13 |
| `origin/central/official-umtuba-brand-release-v1` | إصدار هوية بصرية | 2026-09-13 |
| `origin/desktop/umtuba-official-brand-phase2-v1` | مرحلة هوية ثانية | 2026-09-13 |

فروع كثيرة أخرى أسماؤها إصلاح أو نشر أو فهرسة جوجل؛ ليست «ميزات يتيمة» بالمعنى نفسه.

فرع `origin/alpha-0.2` يطابق `origin/store/540-full-production-release-v1` بتاريخ 2026-09-10؛ هو خط قديم للمنتج وليس ميزة جديدة غير مدمجة في الاتجاه المعاكس.

---

## القسم 7 — الخلاصة: خمسة عشر أمراً مميزاً بُنيت أو خُطّطت وليست حيّة اليوم

مرتّبة من الأكثر غرابة أولاً.

1. **دفتر مال داخلي لكل المنصة (UEOS)** — سبعة جداول جاهزة ولا شاشة ولا كتابة من التطبيق. هذا أغرب من متجر عادي: بنك داخلي بلا واجهة.
2. **بث فيه هدايا واستطلاعات واختبارات وتسجيل وإعادة** — الجداول موجودة كمنصة بث كاملة؛ المستخدم يرى غرفة ودردشة فقط.
3. **رحلة منشور على الكرة الأرضية** — الحلم واضح والكرة جميلة، لكن الدول الحقيقية لا تُرسم، والأصل مكتوب «UMTUBA / حول العالم».
4. **سلسلة يومية بالكاميرا بين الأصدقاء (UM Streak)** — مبنية على فروع أخرى بهجرات وصفحة معاينة؛ غائبة عن الكود المنشور.
5. **مرحباً أيتها المدينة + مجتمع + مناسبات + تقييمات** — مدينة حيّة اجتماعية في الجداول فقط.
6. **رحلات سياحية بين المدن** غير رحلة وصول الفيديو — جداول ووثيقة مستقبلية بلا شاشة.
7. **إحدى عشرة لعبة على فرع نموذج** بينما الصفحة الحيّة تقول «لا يمكن اللعب بعد».
8. **ذكاء خاص على عتاد نملكه** — لوحات إدارة ووثائق أجهزة؛ المستخدم لا يلمسه.
9. **مساحة تعاون للدورة بمرفقات وخط زمني** — على فروع مكتبية فقط.
10. **تعديل المنشور بعد نشره** — مسار جاهز على فرع ولم يُدمج.
11. **إشعارات تصل الهاتف** — جدول أجهزة فارغ من جهة التطبيق.
12. **صفحات قانونية جديدة وتصدير بيانات** — جاهزة على `feat/legal-pages-v1` وغير مدمجة في الموقع الحي.
13. **محرّك مكافآت وقواعد جديد** فوق نقاط UM القديمة — جداول كبيرة والاستخدام الظاهر ما زال صفحة النقاط البسيطة.
14. **مركز ذكاء ومدرّس درس** — الصفحات موجودة والمفتاح مغلق افتراضياً.
15. **قياس إعلانات متقدم ومنصة إيرادات موحّدة** — مخططات طويلة؛ التسليم الحي غير ظاهر للمستخدم.

---

**حدود هذا الجرد**

- لم نفتح الموقع الحي ولم نعدّ صفوف الجداول في قاعدة الإنتاج.
- «موجود بلا استخدام» يعني: لا قراءة/كتابة واضحة من مجلدَي التطبيق `app/` و`lib/` (عدا الاختبارات والترحيلات). قد يستخدمه إجراء خفي في القاعدة؛ إن لم نجد الاستدعاء كتبنا غير معروف أو مدفون.
- عدد الأعمدة تقريبي من أول تعريف إنشاء.
- فروع `origin` بالعشرات؛ القسم 6 يركز على ما اسمه ميزة واضحة ولم يدخل خط النشر.
