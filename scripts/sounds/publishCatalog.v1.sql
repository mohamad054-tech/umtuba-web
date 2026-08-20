-- Additive Sound Library V1 catalog publish. No 20260931.
-- Owner = oldest platform_admins.user_id. Idempotent on id.
-- UPDATE in place for existing rows (titles + storage_path + duration).
with owner as (
  select user_id
  from public.platform_admins
  order by created_at asc
  limit 1
),
payload(id, title, storage_path, duration_ms) as (
  values
    (
      '610920c5-c927-51c3-87a0-da56dc737dfc'::uuid,
      'Golden Horizon',
      'sounds/originals/umtuba-originals-01.m4a',
      6000
    ),
    (
      '7c4716ca-507e-5599-8c89-927b84cb4321'::uuid,
      'Desert Pulse',
      'sounds/originals/umtuba-originals-02.m4a',
      6000
    ),
    (
      '3d601c94-e642-5340-82ec-50f9e1fd947f'::uuid,
      'Night Drive',
      'sounds/originals/umtuba-originals-03.m4a',
      6000
    ),
    (
      'a8790686-592d-55c4-8042-c17bdd1c7015'::uuid,
      'Amber Current',
      'sounds/originals/umtuba-originals-04.m4a',
      6000
    ),
    (
      'db9085e7-a9eb-542d-86e5-70adf4924301'::uuid,
      'Velvet Signal',
      'sounds/originals/umtuba-originals-05.m4a',
      6000
    ),
    (
      'dd777c7b-28ee-5258-8fa8-89b95ef1b3a2'::uuid,
      'Copper Sky',
      'sounds/originals/umtuba-originals-06.m4a',
      6000
    ),
    (
      '117e1824-6a85-53f6-8b81-beab08640149'::uuid,
      'Quiet Ember',
      'sounds/originals/umtuba-originals-07.m4a',
      6000
    ),
    (
      'de2721c2-ffc0-51aa-85f2-66cc963df391'::uuid,
      'Lunar Thread',
      'sounds/originals/umtuba-originals-08.m4a',
      6000
    ),
    (
      '0d2de211-c6aa-5620-8633-94f7eff0c4bc'::uuid,
      'City Grid',
      'sounds/beats/umtuba-beats-01.m4a',
      8000
    ),
    (
      '5834dcbb-f854-586b-82b9-3db1893182c9'::uuid,
      'Midnight Kick',
      'sounds/beats/umtuba-beats-02.m4a',
      8000
    ),
    (
      '8ceeb967-3387-571b-8962-f2a7f3809433'::uuid,
      'Steel Pocket',
      'sounds/beats/umtuba-beats-03.m4a',
      8000
    ),
    (
      'a1037850-7540-58fc-8147-a5198f9334d6'::uuid,
      'Neon March',
      'sounds/beats/umtuba-beats-04.m4a',
      8000
    ),
    (
      '07b3003f-5cef-5f40-8067-9f1d3d57fd2e'::uuid,
      'Low Tide Beat',
      'sounds/beats/umtuba-beats-05.m4a',
      8000
    ),
    (
      'ed012cc5-1199-5b77-8a4f-6be779158eb0'::uuid,
      'Brick Pulse',
      'sounds/beats/umtuba-beats-06.m4a',
      8000
    ),
    (
      '627deec7-3a26-5571-893e-c8a51ba90336'::uuid,
      'After Hours',
      'sounds/beats/umtuba-beats-07.m4a',
      8000
    ),
    (
      '929c1629-5272-583b-83f8-b518bfaef250'::uuid,
      'Dust Groove',
      'sounds/beats/umtuba-beats-08.m4a',
      8000
    ),
    (
      'eb6dd9b5-bdfb-50f7-89a6-7234f4e16ccb'::uuid,
      'Iron Dawn',
      'sounds/cinematic/umtuba-cinematic-01.m4a',
      7000
    ),
    (
      '223852b5-4942-54e4-8d7f-f5a3e34e2ce1'::uuid,
      'Shadow Rise',
      'sounds/cinematic/umtuba-cinematic-02.m4a',
      7000
    ),
    (
      '017e2266-5e9e-59a9-8c45-61d77b2eb3ab'::uuid,
      'Glass Cathedral',
      'sounds/cinematic/umtuba-cinematic-03.m4a',
      7000
    ),
    (
      'd4c03058-bece-5e9b-87ad-910cc580c753'::uuid,
      'Last Light',
      'sounds/cinematic/umtuba-cinematic-04.m4a',
      7000
    ),
    (
      '55a3fc8a-476c-59a2-85f8-01a2991a4b54'::uuid,
      'Frozen Banner',
      'sounds/cinematic/umtuba-cinematic-05.m4a',
      7000
    ),
    (
      '13322727-c8d2-555e-8814-a19868db3458'::uuid,
      'Deep Chamber',
      'sounds/cinematic/umtuba-cinematic-06.m4a',
      7000
    ),
    (
      'b3857b56-7d30-584b-8981-58d64bc0c20f'::uuid,
      'Distant Crown',
      'sounds/cinematic/umtuba-cinematic-07.m4a',
      7000
    ),
    (
      '6a9808b2-ad73-5199-80d6-1fead36b6b52'::uuid,
      'Storm Gate',
      'sounds/cinematic/umtuba-cinematic-08.m4a',
      7000
    ),
    (
      '6a8fed5c-d357-53a9-88f7-f52f3cca01d2'::uuid,
      'Soft Harbor',
      'sounds/ambient/umtuba-ambient-01.m4a',
      8000
    ),
    (
      '68d88e33-cb7e-5bef-8e0b-70d4b4ba5a5f'::uuid,
      'Fog Room',
      'sounds/ambient/umtuba-ambient-02.m4a',
      8000
    ),
    (
      'b9cf2858-2d14-5bb9-81b9-2bad425174f0'::uuid,
      'Pale Drift',
      'sounds/ambient/umtuba-ambient-03.m4a',
      8000
    ),
    (
      'dfa66f73-4bc9-58fe-8abc-226af2d4ce7d'::uuid,
      'Still Water',
      'sounds/ambient/umtuba-ambient-04.m4a',
      8000
    ),
    (
      '4d6d4a79-15f0-51f8-8645-0f65c1673fac'::uuid,
      'Cloud Shelf',
      'sounds/ambient/umtuba-ambient-05.m4a',
      8000
    ),
    (
      '22340905-3326-5dcc-8bb6-50d97f00a8d3'::uuid,
      'Moss Hour',
      'sounds/ambient/umtuba-ambient-06.m4a',
      8000
    ),
    (
      'f2651b94-bc7a-5297-868e-2f9955e8263a'::uuid,
      'Silver Haze',
      'sounds/ambient/umtuba-ambient-07.m4a',
      8000
    ),
    (
      '253f3b69-5f48-505b-8b82-b7be4cf60df0'::uuid,
      'Open Meadow',
      'sounds/ambient/umtuba-ambient-08.m4a',
      8000
    ),
    (
      '5710d968-86b1-5ea6-89ed-cc0303e3e927'::uuid,
      'Soft Lift',
      'sounds/transitions/umtuba-transitions-01.m4a',
      1600
    ),
    (
      '2329efce-cddf-53b7-8726-17713fd1b7f3'::uuid,
      'Cross Fade',
      'sounds/transitions/umtuba-transitions-02.m4a',
      1600
    ),
    (
      'f41e807f-0c97-5976-8471-1963e9ad4440'::uuid,
      'Rise Cut',
      'sounds/transitions/umtuba-transitions-03.m4a',
      1600
    ),
    (
      '6648bb8d-5b6b-5535-8600-f971b12f3e7d'::uuid,
      'Drop Veil',
      'sounds/transitions/umtuba-transitions-04.m4a',
      1600
    ),
    (
      'f9e66c91-0a76-51d1-8a36-d9c3f01cf4f1'::uuid,
      'Slide North',
      'sounds/transitions/umtuba-transitions-05.m4a',
      1600
    ),
    (
      'b936b7d4-b51e-5146-87dc-efbdcd13868e'::uuid,
      'Bright Pass',
      'sounds/transitions/umtuba-transitions-06.m4a',
      1600
    ),
    (
      '52d89411-e640-5fda-842d-44bdf6f294c5'::uuid,
      'Quiet Turn',
      'sounds/transitions/umtuba-transitions-07.m4a',
      1600
    ),
    (
      '3c76e3b3-58a3-5c93-8556-6ed04c38e3bf'::uuid,
      'Fast Sweep',
      'sounds/whoosh/umtuba-whoosh-01.m4a',
      900
    ),
    (
      '84f73947-3529-5ec8-8508-1e260ff15c8d'::uuid,
      'Air Blade',
      'sounds/whoosh/umtuba-whoosh-02.m4a',
      900
    ),
    (
      'a99643c3-01cb-527a-8fc6-b3f707c30f20'::uuid,
      'Paper Rush',
      'sounds/whoosh/umtuba-whoosh-03.m4a',
      900
    ),
    (
      '118ffcd2-0836-55ff-8d02-1bb09a403f53'::uuid,
      'Wind Slice',
      'sounds/whoosh/umtuba-whoosh-04.m4a',
      900
    ),
    (
      '096d42a4-9271-5bbd-87dc-9e4c4a3cf03a'::uuid,
      'Silk Pass',
      'sounds/whoosh/umtuba-whoosh-05.m4a',
      900
    ),
    (
      'f6a2f90e-ee1a-5eb9-89d1-02f6856d16be'::uuid,
      'Tunnel Whoosh',
      'sounds/whoosh/umtuba-whoosh-06.m4a',
      900
    ),
    (
      'ec6d2baf-78da-5209-8689-fb14e5554725'::uuid,
      'Night Gust',
      'sounds/whoosh/umtuba-whoosh-07.m4a',
      900
    ),
    (
      '628ebec3-8d02-5b28-802f-b507bd9650a1'::uuid,
      'Heavy Stamp',
      'sounds/hits/umtuba-hits-01.m4a',
      700
    ),
    (
      '3215cad1-cda9-55cc-85a6-93103e88acc0'::uuid,
      'Soft Knock',
      'sounds/hits/umtuba-hits-02.m4a',
      700
    ),
    (
      'a725abfa-fd6c-5966-88f3-3c4fe373a5ff'::uuid,
      'Glass Hit',
      'sounds/hits/umtuba-hits-03.m4a',
      700
    ),
    (
      '987d0d7f-9552-5585-803f-c4610929a74a'::uuid,
      'Drum Punch',
      'sounds/hits/umtuba-hits-04.m4a',
      700
    ),
    (
      '1cc75e10-503b-5065-8ff4-05f83a721c40'::uuid,
      'Door Thud',
      'sounds/hits/umtuba-hits-05.m4a',
      700
    ),
    (
      '44010a17-84a5-5082-8906-358acb6fca9b'::uuid,
      'Snap Impact',
      'sounds/hits/umtuba-hits-06.m4a',
      700
    ),
    (
      '4321c14c-0a76-56d8-834f-e14d9c5979ba'::uuid,
      'Metal Tap',
      'sounds/hits/umtuba-hits-07.m4a',
      700
    ),
    (
      '8a51a4f6-9319-5b17-84af-5e84a9062724'::uuid,
      'Soft Click',
      'sounds/ui/umtuba-ui-01.m4a',
      400
    ),
    (
      'dd34d451-886b-53e3-8bdf-24cc099f3f00'::uuid,
      'Bright Tick',
      'sounds/ui/umtuba-ui-02.m4a',
      400
    ),
    (
      '40ce37be-922b-5a88-8637-91a5c4a25cc8'::uuid,
      'Confirm Tap',
      'sounds/ui/umtuba-ui-03.m4a',
      400
    ),
    (
      '369de039-cd8d-56e2-8a49-343687ed1541'::uuid,
      'Light Pop',
      'sounds/ui/umtuba-ui-04.m4a',
      400
    ),
    (
      'bfc36ee8-45ab-55bd-8364-291bf9e4a3ba'::uuid,
      'Menu Chip',
      'sounds/ui/umtuba-ui-05.m4a',
      400
    ),
    (
      'bceb02cd-7411-5ff7-8e6e-2d1c557e4d5c'::uuid,
      'Done Beep',
      'sounds/ui/umtuba-ui-06.m4a',
      400
    ),
    (
      '2df3212b-480f-52fa-82cd-261432711ae1'::uuid,
      'Wobble Walk',
      'sounds/funny/umtuba-funny-01.m4a',
      1800
    ),
    (
      '687c997f-4497-5a00-8c41-7385c6b44bfb'::uuid,
      'Silly Bounce',
      'sounds/funny/umtuba-funny-02.m4a',
      1800
    ),
    (
      'f628576b-4d40-5e01-8768-d0f23ca35f94'::uuid,
      'Cartoon Slide',
      'sounds/funny/umtuba-funny-03.m4a',
      1800
    ),
    (
      'bc52b0c6-a07c-5757-8e05-94e928068e23'::uuid,
      'Quack Step',
      'sounds/funny/umtuba-funny-04.m4a',
      1800
    ),
    (
      '7ad67a94-1578-5f99-80e0-7f004ff8b96d'::uuid,
      'Bounce Zip',
      'sounds/funny/umtuba-funny-05.m4a',
      1800
    ),
    (
      'cefdc876-ed06-5118-8e45-69eccbe57961'::uuid,
      'Goofy Spin',
      'sounds/funny/umtuba-funny-06.m4a',
      1800
    ),
    (
      '6aa16a48-98b3-59c4-8672-d6a0a6492ebd'::uuid,
      'Rain Patio',
      'sounds/nature/umtuba-nature-01.m4a',
      7000
    ),
    (
      '2bf114a2-92ad-516b-8936-3d7d147ca076'::uuid,
      'Wind Leaves',
      'sounds/nature/umtuba-nature-02.m4a',
      7000
    ),
    (
      '78e1f645-c286-5e87-8a96-a95f4457a6fa'::uuid,
      'Creek Bed',
      'sounds/nature/umtuba-nature-03.m4a',
      7000
    ),
    (
      '3ab65f8f-308d-51c1-862f-7db4de528cfc'::uuid,
      'Night Crickets',
      'sounds/nature/umtuba-nature-04.m4a',
      7000
    ),
    (
      '41276f49-aec5-593b-86f0-a77c26c67771'::uuid,
      'Shore Foam',
      'sounds/nature/umtuba-nature-05.m4a',
      7000
    ),
    (
      'aef3c60b-5f21-5df2-84ed-3f17bc34d418'::uuid,
      'Forest Drip',
      'sounds/nature/umtuba-nature-06.m4a',
      7000
    ),
    (
      '0c8b4ece-0755-54f8-835b-342a7c0dc97d'::uuid,
      'Data Chirp',
      'sounds/technology/umtuba-technology-01.m4a',
      1500
    ),
    (
      'f19952b2-e86d-5ad3-8551-15aa380b894e'::uuid,
      'Circuit Ping',
      'sounds/technology/umtuba-technology-02.m4a',
      1500
    ),
    (
      'cc1051a3-3796-58cf-8f65-cbf6f8be363a'::uuid,
      'Boot Tone',
      'sounds/technology/umtuba-technology-03.m4a',
      1500
    ),
    (
      'd5bed010-658a-5ab4-88e3-d8738d8d60db'::uuid,
      'Sync Pulse',
      'sounds/technology/umtuba-technology-04.m4a',
      1500
    ),
    (
      'a782f441-1576-5dbf-8d55-b4d1e2c2755a'::uuid,
      'Laser Tick',
      'sounds/technology/umtuba-technology-05.m4a',
      1500
    ),
    (
      'bb51ab4c-3e42-5b4b-81d8-cde3ffe3defc'::uuid,
      'Modem Flick',
      'sounds/technology/umtuba-technology-06.m4a',
      1500
    ),
    (
      'dcc2a6a2-ad9c-587d-8e72-c55e30fb44d5'::uuid,
      'Crowd Burst',
      'sounds/sports/umtuba-sports-01.m4a',
      2000
    ),
    (
      '9de86de5-b577-51e2-8d8c-768cf080cc51'::uuid,
      'Whistle Cut',
      'sounds/sports/umtuba-sports-02.m4a',
      2000
    ),
    (
      '119f0678-684f-5ec0-802d-faa0cc8d416c'::uuid,
      'Court Bounce',
      'sounds/sports/umtuba-sports-03.m4a',
      2000
    ),
    (
      '206e1f41-86b0-5e76-82c0-9a410f487a25'::uuid,
      'Goal Horn',
      'sounds/sports/umtuba-sports-04.m4a',
      2000
    ),
    (
      '1d0ae367-e6f3-5ace-8aa5-6712faf9581b'::uuid,
      'Sprint Hit',
      'sounds/sports/umtuba-sports-05.m4a',
      2000
    ),
    (
      '8bab6892-97df-518e-89e5-8b4e4bccee23'::uuid,
      'Tape Snap',
      'sounds/sports/umtuba-sports-06.m4a',
      2000
    ),
    (
      'e1edba71-9ce4-5f80-892c-7b18668fac7c'::uuid,
      'Party Rise',
      'sounds/celebration/umtuba-celebration-01.m4a',
      2500
    ),
    (
      'b12cb538-3844-5474-8a4c-fe68f903be5b'::uuid,
      'Confetti Fan',
      'sounds/celebration/umtuba-celebration-02.m4a',
      2500
    ),
    (
      '88b6e70b-1828-57c4-8452-a7b54591f0a4'::uuid,
      'Toast Spark',
      'sounds/celebration/umtuba-celebration-03.m4a',
      2500
    ),
    (
      'd28e1e09-1554-510c-873e-8aab3da59ebe'::uuid,
      'Victory Bell',
      'sounds/celebration/umtuba-celebration-04.m4a',
      2500
    ),
    (
      '1210189f-00f0-59e9-899d-ed9448b1ca45'::uuid,
      'Fireworks Lift',
      'sounds/celebration/umtuba-celebration-05.m4a',
      2500
    ),
    (
      '158b822a-a94b-5262-8fdf-fccf0a881a1a'::uuid,
      'Cheer Wave',
      'sounds/celebration/umtuba-celebration-06.m4a',
      2500
    ),
    (
      '5ccdc201-33f8-5eb4-89ed-0535ebe465dc'::uuid,
      'Warm Tea',
      'sounds/calm/umtuba-calm-01.m4a',
      8000
    ),
    (
      '3f061c3a-4ccb-583b-810e-9f910c118488'::uuid,
      'Slow Breath',
      'sounds/calm/umtuba-calm-02.m4a',
      8000
    ),
    (
      'fa362468-f4b8-5ea0-84fc-f9111b5687f3'::uuid,
      'Evening Lamp',
      'sounds/calm/umtuba-calm-03.m4a',
      8000
    ),
    (
      '0ec03f40-bc20-50a8-8c1c-fac4b14aaea3'::uuid,
      'Quiet Garden',
      'sounds/calm/umtuba-calm-04.m4a',
      8000
    ),
    (
      '8140d797-0a60-50ea-8d5c-8aabd417091a'::uuid,
      'Soft Piano Bed',
      'sounds/calm/umtuba-calm-05.m4a',
      8000
    ),
    (
      'ff83f66c-1391-5124-8df7-ac852ef5938e'::uuid,
      'Still Room',
      'sounds/calm/umtuba-calm-06.m4a',
      8000
    ),
    (
      '3b045a98-d9ef-522c-8e7e-64df1919eee6'::uuid,
      'Pocket Loop',
      'sounds/loops/umtuba-loops-01.m4a',
      4000
    ),
    (
      '7d1336be-2532-5bb0-88c3-2bb11aebf25b'::uuid,
      'Warm Cycle',
      'sounds/loops/umtuba-loops-02.m4a',
      4000
    ),
    (
      'ab0a05b8-a3c6-5890-8a46-4f4343eca072'::uuid,
      'Night Loop',
      'sounds/loops/umtuba-loops-03.m4a',
      4000
    ),
    (
      '2d92f2fc-c3be-5c4f-8c78-ba6264013d13'::uuid,
      'Soft Motor',
      'sounds/loops/umtuba-loops-04.m4a',
      4000
    ),
    (
      'b8ae60ed-b677-517a-89b3-20a4d708dbcf'::uuid,
      'Easy Repeat',
      'sounds/loops/umtuba-loops-05.m4a',
      4000
    )
)
insert into public.social_sounds (
  id,
  owner_user_id,
  source_type,
  title,
  storage_bucket,
  storage_path,
  duration_ms,
  visibility,
  reuse_permission,
  rights_status,
  rights_confirmed_at,
  rights_confirmation_text,
  moderation_status,
  usage_count
)
select
  p.id,
  o.user_id,
  'platform',
  p.title,
  'social-sounds',
  p.storage_path,
  p.duration_ms,
  'public_reusable',
  'public',
  'platform_licensed',
  now(),
  'UMTUBA_OWNED_ORIGINAL synthetic clip generated 2026-08-20 on WIN-MJRKAKK2MEH. No third-party samples. Commercial use and UGC sync on UMTUBA are permitted. Attribution not required.',
  'clean',
  0
from payload p
cross join owner o
on conflict (id) do update
set
  title = excluded.title,
  storage_path = excluded.storage_path,
  duration_ms = excluded.duration_ms,
  visibility = excluded.visibility,
  reuse_permission = excluded.reuse_permission,
  rights_status = excluded.rights_status,
  rights_confirmed_at = excluded.rights_confirmed_at,
  rights_confirmation_text = excluded.rights_confirmation_text,
  moderation_status = excluded.moderation_status
where public.social_sounds.rights_status not in ('blocked', 'takedown');

select count(*)::int as published_platform_sounds
from public.social_sounds
where source_type = 'platform'
  and rights_status = 'platform_licensed'
  and visibility = 'public_reusable';
