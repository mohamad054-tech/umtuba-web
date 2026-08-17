-- UMTUBA World catalog ingest — DRAFT upsert
-- Idempotent. Does not overwrite published/verified curated cities.
-- Rollback = unpublish, not DROP. No schema migration.

begin;

insert into public.world_countries (country_code, name, slug, is_active)
values
  ('SA', 'Saudi Arabia', 'saudi-arabia', true),
  ('QA', 'Qatar', 'qatar', true),
  ('LB', 'Lebanon', 'lebanon', true),
  ('IQ', 'Iraq', 'iraq', true),
  ('AE', 'United Arab Emirates', 'united-arab-emirates', true),
  ('GB', 'United Kingdom', 'united-kingdom', true),
  ('FR', 'France', 'france', true),
  ('ES', 'Spain', 'spain', true),
  ('IT', 'Italy', 'italy', true),
  ('NL', 'Netherlands', 'netherlands', true),
  ('AT', 'Austria', 'austria', true),
  ('GR', 'Greece', 'greece', true),
  ('PT', 'Portugal', 'portugal', true),
  ('CZ', 'Czechia', 'czechia', true),
  ('US', 'United States', 'united-states', true),
  ('CA', 'Canada', 'canada', true),
  ('MX', 'Mexico', 'mexico', true),
  ('BR', 'Brazil', 'brazil', true),
  ('AR', 'Argentina', 'argentina', true),
  ('PE', 'Peru', 'peru', true),
  ('CO', 'Colombia', 'colombia', true),
  ('NG', 'Nigeria', 'nigeria', true),
  ('KE', 'Kenya', 'kenya', true),
  ('ZA', 'South Africa', 'south-africa', true),
  ('MA', 'Morocco', 'morocco', true),
  ('GH', 'Ghana', 'ghana', true),
  ('KR', 'South Korea', 'south-korea', true),
  ('CN', 'China', 'china', true),
  ('IN', 'India', 'india', true),
  ('HK', 'Hong Kong', 'hong-kong', true),
  ('TH', 'Thailand', 'thailand', true),
  ('SG', 'Singapore', 'singapore', true),
  ('ID', 'Indonesia', 'indonesia', true),
  ('MY', 'Malaysia', 'malaysia', true),
  ('PH', 'Philippines', 'philippines', true),
  ('AU', 'Australia', 'australia', true),
  ('NZ', 'New Zealand', 'new-zealand', true),
  ('TN', 'Tunisia', 'tunisia', true),
  ('CL', 'Chile', 'chile', true)
on conflict (country_code) do update
set is_active = true
where public.world_countries.is_active is distinct from true;

insert into public.world_cities (
  slug,
  city_name,
  country_code,
  country_name,
  country_id,
  center_latitude,
  center_longitude,
  timezone_name,
  overview,
  is_active,
  profile_status,
  verification_status
)
select
  v.slug,
  v.city_name,
  c.country_code,
  c.name,
  c.id,
  v.center_latitude,
  v.center_longitude,
  v.timezone_name,
  v.overview,
  true,
  'draft',
  'unverified'
from (
  values
  ('riyadh', 'Riyadh', 'SA', 24.6333, 46.7167, 'Asia/Riyadh', 'Riyadh is the capital of Saudi Arabia, in the Najd plateau of the central Arabian Peninsula.'),
  ('doha', 'Doha', 'QA', 25.2867, 51.5333, 'Asia/Qatar', 'Doha is the capital of Qatar, on the east coast of the Qatar peninsula on the Persian Gulf.'),
  ('beirut', 'Beirut', 'LB', 33.8981, 35.5058, 'Asia/Beirut', 'Beirut is the capital of Lebanon, on the Mediterranean coast at the foot of the Lebanon Mountains.'),
  ('abu-dhabi', 'Abu Dhabi', 'AE', 24.4667, 54.3667, 'Asia/Dubai', 'Abu Dhabi is the capital of the United Arab Emirates, on an island along the southern Persian Gulf.'),
  ('baghdad', 'Baghdad', 'IQ', 33.3153, 44.3661, 'Asia/Baghdad', 'Baghdad is the capital of Iraq, on the Tigris in the Mesopotamian plain.'),
  ('london', 'London', 'GB', 51.5072, -0.1275, 'Europe/London', 'London is the capital of the United Kingdom, on the River Thames in southeastern England.'),
  ('paris', 'Paris', 'FR', 48.8567, 2.3522, 'Europe/Paris', 'Paris is the capital of France, on the River Seine in the north of the country.'),
  ('madrid', 'Madrid', 'ES', 40.4169, -3.7033, 'Europe/Madrid', 'Madrid is the capital of Spain, on the Meseta Central in the interior of the Iberian Peninsula.'),
  ('rome', 'Rome', 'IT', 41.8933, 12.4828, 'Europe/Rome', 'Rome is the capital of Italy, on the Tiber in the Lazio region of the Italian peninsula.'),
  ('amsterdam', 'Amsterdam', 'NL', 52.3728, 4.8936, 'Europe/Amsterdam', 'Amsterdam is the capital of the Netherlands, in the province of North Holland on the IJ and Amstel.'),
  ('vienna', 'Vienna', 'AT', 48.2083, 16.3725, 'Europe/Vienna', 'Vienna is the capital of Austria, in the northeast of the country on the River Danube.'),
  ('athens', 'Athens', 'GR', 37.9842, 23.7281, 'Europe/Athens', 'Athens is the capital of Greece, in Attica near the Saronic Gulf of the Aegean Sea.'),
  ('lisbon', 'Lisbon', 'PT', 38.7253, -9.15, 'Europe/Lisbon', 'Lisbon is the capital of Portugal, on the estuary of the River Tagus at the Atlantic.'),
  ('prague', 'Prague', 'CZ', 50.0875, 14.4214, 'Europe/Prague', 'Prague is the capital of Czechia, on the Vltava in Bohemia.'),
  ('barcelona', 'Barcelona', 'ES', 41.3833, 2.1833, 'Europe/Madrid', 'Barcelona is a major city in Spain, the capital of Catalonia, on the Mediterranean coast.'),
  ('los-angeles', 'Los Angeles', 'US', 34.05, -118.25, 'America/Los_Angeles', 'Los Angeles is a major city in the United States, in southern California on the Pacific coast.'),
  ('chicago', 'Chicago', 'US', 41.8819, -87.6278, 'America/Chicago', 'Chicago is a major city in the United States, on the southwestern shore of Lake Michigan.'),
  ('toronto', 'Toronto', 'CA', 43.6525, -79.3817, 'America/Toronto', 'Toronto is the capital of Ontario and the most populous city in Canada, on the northwestern shore of Lake Ontario.'),
  ('mexico-city', 'Mexico City', 'MX', 19.4333, -99.1333, 'America/Mexico_City', 'Mexico City is the capital of Mexico, in the Valley of Mexico on the south-central Mexican plateau.'),
  ('vancouver', 'Vancouver', 'CA', 49.2608, -123.1139, 'America/Vancouver', 'Vancouver is a major city in Canada, in British Columbia on the Strait of Georgia near the Pacific coast.'),
  ('sao-paulo', 'São Paulo', 'BR', -23.55, -46.6333, 'America/Sao_Paulo', 'São Paulo is the most populous city in Brazil, on the Piratininga plateau in the southeast of the country.'),
  ('rio-de-janeiro', 'Rio de Janeiro', 'BR', -22.9111, -43.2056, 'America/Sao_Paulo', 'Rio de Janeiro is a major city in Brazil, on the Atlantic coast of Guanabara Bay.'),
  ('buenos-aires', 'Buenos Aires', 'AR', -34.6039, -58.3814, 'America/Argentina/Buenos_Aires', 'Buenos Aires is the capital of Argentina, on the western shore of the Río de la Plata estuary.'),
  ('lima', 'Lima', 'PE', -12.06, -77.0375, 'America/Lima', 'Lima is the capital of Peru, on the central Pacific coast of the country beside the Rimac River.'),
  ('bogota', 'Bogotá', 'CO', 4.7111, -74.0722, 'America/Bogota', 'Bogotá is the capital of Colombia, on the Bogotá savanna of the Eastern Andes.'),
  ('santiago', 'Santiago', 'CL', -33.4375, -70.65, 'America/Santiago', 'Santiago is the capital of Chile, in the central valley between the Andes and the Chilean Coastal Range.'),
  ('lagos', 'Lagos', 'NG', 6.4561, 3.3936, 'Africa/Lagos', 'Lagos is the most populous city in Nigeria, on the Bight of Benin in the southwest of the country.'),
  ('nairobi', 'Nairobi', 'KE', -1.2864, 36.8172, 'Africa/Nairobi', 'Nairobi is the capital of Kenya, on the Athi plains south of the equator in the Kenyan highlands.'),
  ('cape-town', 'Cape Town', 'ZA', -33.9253, 18.4239, 'Africa/Johannesburg', 'Cape Town is the legislative capital of South Africa, on the Atlantic coast of the Cape Peninsula.'),
  ('johannesburg', 'Johannesburg', 'ZA', -26.2044, 28.0456, 'Africa/Johannesburg', 'Johannesburg is the most populous city in South Africa, on the Highveld of Gauteng.'),
  ('casablanca', 'Casablanca', 'MA', 33.5333, -7.5833, 'Africa/Casablanca', 'Casablanca is the largest city in Morocco, on the Atlantic coast of the Chaouia plain.'),
  ('accra', 'Accra', 'GH', 5.55, -0.2, 'Africa/Accra', 'Accra is the capital of Ghana, on the Gulf of Guinea in the south of the country.'),
  ('tunis', 'Tunis', 'TN', 36.8064, 10.1817, 'Africa/Tunis', 'Tunis is the capital of Tunisia, on the Lake of Tunis near the Mediterranean coast and ancient Carthage.'),
  ('seoul', 'Seoul', 'KR', 37.56, 126.99, 'Asia/Seoul', 'Seoul is the capital of South Korea, on the Han River in the northwest of the Korean Peninsula.'),
  ('beijing', 'Beijing', 'CN', 39.9067, 116.3975, 'Asia/Shanghai', 'Beijing is the capital of China, on the North China Plain at the northern edge of the North China agricultural heartland.'),
  ('shanghai', 'Shanghai', 'CN', 31.2325, 121.4692, 'Asia/Shanghai', 'Shanghai is a major city in China, on the Yangtze River delta at the East China Sea.'),
  ('mumbai', 'Mumbai', 'IN', 19.0761, 72.8775, 'Asia/Kolkata', 'Mumbai is the capital of Maharashtra and the most populous city in India, on the west coast of the Konkan.'),
  ('new-delhi', 'New Delhi', 'IN', 28.6139, 77.2089, 'Asia/Kolkata', 'New Delhi is the capital of India, in the National Capital Territory of Delhi on the Yamuna River.'),
  ('hong-kong', 'Hong Kong', 'HK', 22.3, 114.2, 'Asia/Hong_Kong', 'Hong Kong is a special administrative region of China, on the eastern side of the Pearl River estuary of the South China Sea.'),
  ('bangkok', 'Bangkok', 'TH', 13.7525, 100.4942, 'Asia/Bangkok', 'Bangkok is the capital of Thailand, on the Chao Phraya River near the Gulf of Thailand.'),
  ('singapore', 'Singapore', 'SG', 1.2833, 103.8333, 'Asia/Singapore', 'Singapore is a city-state at the southern tip of the Malay Peninsula, on the Strait of Singapore.'),
  ('jakarta', 'Jakarta', 'ID', -6.18, 106.83, 'Asia/Jakarta', 'Jakarta is the capital of Indonesia, on the northwest coast of Java on the Java Sea.'),
  ('kuala-lumpur', 'Kuala Lumpur', 'MY', 3.1478, 101.6953, 'Asia/Kuala_Lumpur', 'Kuala Lumpur is the capital of Malaysia, in the Klang Valley of Peninsular Malaysia.'),
  ('manila', 'Manila', 'PH', 14.5958, 120.9772, 'Asia/Manila', 'Manila is the capital of the Philippines, on Manila Bay on the western side of Luzon.'),
  ('sydney', 'Sydney', 'AU', -33.8678, 151.21, 'Australia/Sydney', 'Sydney is the capital of New South Wales and the most populous city in Australia, on Port Jackson on the Tasman Sea.'),
  ('melbourne', 'Melbourne', 'AU', -37.8142, 144.9631, 'Australia/Melbourne', 'Melbourne is the capital of Victoria, on Port Phillip in southeastern Australia.'),
  ('auckland', 'Auckland', 'NZ', -36.8492, 174.7653, 'Pacific/Auckland', 'Auckland is the most populous city in New Zealand, on an isthmus between the Waitematā and Manukau harbours of the North Island.')
) as v(slug, city_name, country_code, center_latitude, center_longitude, timezone_name, overview)
join public.world_countries c on c.country_code = v.country_code
on conflict (slug) do update
set
  city_name = excluded.city_name,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  country_id = excluded.country_id,
  center_latitude = excluded.center_latitude,
  center_longitude = excluded.center_longitude,
  timezone_name = excluded.timezone_name,
  overview = excluded.overview,
  updated_at = timezone('utc', now())
where public.world_cities.profile_status = 'draft'
  and public.world_cities.verification_status in ('unverified', 'pending');

commit;
