# Live production smoke — 2026-08-24

Host current: `/opt/umtuba/production/releases/a29a329d-20260824111302`  
SHA: `a29a329ddf21c4aa2b7d55887b2b276a12447892`  
BUILD_ID: `seZg_Z9XGfu6Eu3Vd8g7B`  
healthz: `200 umtuba-production-ok`

Playwright capture (`capture-production-qa.mjs`):

```
01-learning-home-desktop     200 visual true  lang en dir ltr  /learning?hl=en
02-learning-home-mobile      200 visual true  lang en dir ltr  /learning?hl=en
03-learning-catalog          200 visual true  lang en dir ltr  /learning/catalog?hl=en
04-course-ja-01              200 visual true  lang en dir ltr  /learning/catalog/ja-01?hl=en
05-lesson                    200 visual false lang en dir ltr  /login?next=/learning/lessons/603def66-...
06-my-learning               200 visual true  lang en dir ltr  /learning?tab=my-learning&hl=en
07-become-a-teacher          200 visual false lang en dir ltr  /login?next=/learning/become-a-teacher
08-teacher-center            200 visual false lang en dir ltr  /login?next=/learning/teacher
09-course-builder            200 visual false lang en dir ltr  /login?next=/learning/teacher
10-arabic-rtl-desktop        200 visual true  lang ar dir rtl  /learning?hl=ar
11-arabic-rtl-mobile         200 visual true  lang ar dir rtl  /learning?hl=ar
12-ltr-home                  200 visual true  lang en dir ltr  /learning?hl=en
13-discover-spotcheck        200 visual false lang en dir ltr  https://umtuba.com/
14-store-spotcheck           200 visual false lang en dir ltr  /store
15-home-spotcheck            200 visual false lang en dir ltr  https://umtuba.com/
```

HTTP probes also: `/learning` visual+live; catalog visual+live; `ja-01` visual+live; login 200; store 200.
