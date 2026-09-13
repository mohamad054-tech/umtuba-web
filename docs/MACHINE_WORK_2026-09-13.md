# تقرير شغل الجهاز — 2026-09-13

الجهاز: `WIN-MJRKAKK2MEH`  
الفرع: `central/approved-header-production-deploy-v1`  
المستودع: `https://github.com/mohamad054-tech/umtuba-web.git`  
لم يُمسّ إنتاج قاعدة البيانات. لا force-push. لا stash drop.

---

## 1) ما كان حيّاً أصلاً (لا يُعاد فتحه)

- إصلاح nginx 502 (حجم الهيدر) ما زال على الإنتاج.
- قفل الهيدر المعتمد (U فوق كلمة UMTUBA) حيّ من نشر `e95ed58d` / `BUILD_ID=-UrnnYvUzUBs1URdHu5I1`.
- GSC: انتظار خارجي فقط، بلا إعادة زحف.

---

## 2) مزامنة Git هذا الصباح

- commit `2af6eb3e` — `sync: WIN-MJRKAKK2MEH 2026-09-13` (تقرير + سكربتات GSC).
- commit `6734958f` — تجاهل إعداد Cursor MCP.
- دفع فروع محلية كثيرة **بأسمائها** فقط. لم يُمس `alpha-0.2`. لا force.
- الفرع المتباعد `office/ai-core-anthropic-on-gemini-recovery-v1` لم يُدمج؛ نُسخ احتياطي إلى  
  `backup/ai-core-anthropic-gemini-recovery-local-20260913` ودُفع.
- 17 stash في عائلة الويب **بقيت** (مشتركة، لم تُحذف).

---

## 3) جرد كل مستودعات الجهاز

- 218 نسخة محلية عند المسح الأول.
- ثلاثة أصول فقط:
  - `umtuba-web` — 188
  - `umtuba-mobile` — 29
  - `cursor-guardian` — 1 (بلا origin)
- بعد حذف الثلاث worktrees التالفة: المسح العميق وجد **216** (+ مستودع سطح مكتب `Call-Services-Client` خارج UMTUBA).
- التفصيل العربي: `docs/REPOS_STATE.md`

أبرز العمل غير المحفوظ (وقت الجرد، قبل الحذف):

- ويب: 34 نسخة غير نظيفة؛ أخطرها ثلاث worktrees تالفة بـ 1410 ملفاً لكل منها.
- موبايل: نسخة واحدة بـ 3 ملفات.
- stash الويب الحقيقي: **17** مشتركة، ليست 3145.

---

## 4) الثلاث worktrees التالفة — فحص ثم حذف

المسارات (حُذفت بعد التأكيد):

- `D:\umtuba-central\worktrees\server-integration-agent`
- `D:\umtuba-central\worktrees\server-planner-agent`
- `D:\umtuba-central\worktrees\server-review-agent`

النتيجة: فساد بيانات git (فروع `server/*-central-audit` لم تُولد، `HEAD=0000000`). المحتوى نسخة من commit تاريخي `6ea06344` موجود على origin. لا عمل فريد. لا stash عليها.

الحذف: `git worktree remove --force` ثم `prune` على المرآة فقط.  
قبل: 4 على المرآة. بعد: 1 (bare). عائلة الويب الرئيسية بقيت **184**. المرآة لم تُحذف.

---

## 5) خصوصية RLS — تجهيز فقط، بلا تطبيق

- ملف `umtuba_privacy_fix.sql` لم يصل إلى الجذر؛ لم تُنسخ هجرة سحب صلاحيات.
- خريطة الكسر للزائر (anon): أخطرها Home/Watch (`postColumns`)، صفحة البروفايل العامة (`full_name/city/country`)، بحث الأشخاص.
- فرق التسجيل إلى `is_username_available` **مقترح ولم يُطبَّق**.
- `get_profile_follow_snapshot` في هذا الفرع SECURITY DEFINER؛ الحيّ لم يُفحص (ممنوع الاتصال بالإنتاج).
- Supabase المحلي غير متاح (لا Docker).

---

## 6) هجرة الإشراف — ملف محلي فقط

- الملف: `supabase/migrations/20260939_moderation_foundation_v1.sql`
- الرقم 20260935 متروك لأن الإنتاج فيه 20260935–202608 أصلاً (20260935–20260938).
- إضافات فقط: `posts.deleted_at` / `posts.visibility` / `profiles.moderation_status` / `profiles.privacy_settings` + `is_username_available`.
- **لم تُطبَّق على قاعدة الإنتاج.** لا revoke ولا سياسات RLS.

---

## 7) ما لم يُفعل

- لا اتصال بقاعدة الإنتاج
- لا `supabase db push`
- لا force-push / rebase / stash drop
- لا تعديل تطبيق للتسجيل أو الواجهة في مهمة الخصوصية
- لا إعادة نشر إنتاج اليوم بعد الهيدر الحيّ
