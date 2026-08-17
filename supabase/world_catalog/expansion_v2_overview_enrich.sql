-- UMTUBA World catalog ingest — OVERVIEW enrich
-- Fills empty overview only. Does not change published coordinates, names, or visibility.

begin;

update public.world_cities c
set
  overview = v.overview,
  updated_at = timezone('utc', now())
from (
  values
  ('riyadh', 'Riyadh is the capital of Saudi Arabia, in the Najd plateau of the central Arabian Peninsula.'),
  ('doha', 'Doha is the capital of Qatar, on the east coast of the Qatar peninsula on the Persian Gulf.'),
  ('beirut', 'Beirut is the capital of Lebanon, on the Mediterranean coast at the foot of the Lebanon Mountains.'),
  ('abu-dhabi', 'Abu Dhabi is the capital of the United Arab Emirates, on an island along the southern Persian Gulf.'),
  ('baghdad', 'Baghdad is the capital of Iraq, on the Tigris in the Mesopotamian plain.'),
  ('london', 'London is the capital of the United Kingdom, on the River Thames in southeastern England.'),
  ('paris', 'Paris is the capital of France, on the River Seine in the north of the country.'),
  ('madrid', 'Madrid is the capital of Spain, on the Meseta Central in the interior of the Iberian Peninsula.'),
  ('rome', 'Rome is the capital of Italy, on the Tiber in the Lazio region of the Italian peninsula.'),
  ('amsterdam', 'Amsterdam is the capital of the Netherlands, in the province of North Holland on the IJ and Amstel.'),
  ('vienna', 'Vienna is the capital of Austria, in the northeast of the country on the River Danube.'),
  ('athens', 'Athens is the capital of Greece, in Attica near the Saronic Gulf of the Aegean Sea.'),
  ('lisbon', 'Lisbon is the capital of Portugal, on the estuary of the River Tagus at the Atlantic.'),
  ('prague', 'Prague is the capital of Czechia, on the Vltava in Bohemia.'),
  ('barcelona', 'Barcelona is a major city in Spain, the capital of Catalonia, on the Mediterranean coast.'),
  ('los-angeles', 'Los Angeles is a major city in the United States, in southern California on the Pacific coast.'),
  ('chicago', 'Chicago is a major city in the United States, on the southwestern shore of Lake Michigan.'),
  ('toronto', 'Toronto is the capital of Ontario and the most populous city in Canada, on the northwestern shore of Lake Ontario.'),
  ('mexico-city', 'Mexico City is the capital of Mexico, in the Valley of Mexico on the south-central Mexican plateau.'),
  ('vancouver', 'Vancouver is a major city in Canada, in British Columbia on the Strait of Georgia near the Pacific coast.'),
  ('sao-paulo', 'São Paulo is the most populous city in Brazil, on the Piratininga plateau in the southeast of the country.'),
  ('rio-de-janeiro', 'Rio de Janeiro is a major city in Brazil, on the Atlantic coast of Guanabara Bay.'),
  ('buenos-aires', 'Buenos Aires is the capital of Argentina, on the western shore of the Río de la Plata estuary.'),
  ('lima', 'Lima is the capital of Peru, on the central Pacific coast of the country beside the Rimac River.'),
  ('bogota', 'Bogotá is the capital of Colombia, on the Bogotá savanna of the Eastern Andes.'),
  ('santiago', 'Santiago is the capital of Chile, in the central valley between the Andes and the Chilean Coastal Range.'),
  ('lagos', 'Lagos is the most populous city in Nigeria, on the Bight of Benin in the southwest of the country.'),
  ('nairobi', 'Nairobi is the capital of Kenya, on the Athi plains south of the equator in the Kenyan highlands.'),
  ('cape-town', 'Cape Town is the legislative capital of South Africa, on the Atlantic coast of the Cape Peninsula.'),
  ('johannesburg', 'Johannesburg is the most populous city in South Africa, on the Highveld of Gauteng.'),
  ('casablanca', 'Casablanca is the largest city in Morocco, on the Atlantic coast of the Chaouia plain.'),
  ('accra', 'Accra is the capital of Ghana, on the Gulf of Guinea in the south of the country.'),
  ('tunis', 'Tunis is the capital of Tunisia, on the Lake of Tunis near the Mediterranean coast and ancient Carthage.'),
  ('seoul', 'Seoul is the capital of South Korea, on the Han River in the northwest of the Korean Peninsula.'),
  ('beijing', 'Beijing is the capital of China, on the North China Plain at the northern edge of the North China agricultural heartland.'),
  ('shanghai', 'Shanghai is a major city in China, on the Yangtze River delta at the East China Sea.'),
  ('mumbai', 'Mumbai is the capital of Maharashtra and the most populous city in India, on the west coast of the Konkan.'),
  ('new-delhi', 'New Delhi is the capital of India, in the National Capital Territory of Delhi on the Yamuna River.'),
  ('hong-kong', 'Hong Kong is a special administrative region of China, on the eastern side of the Pearl River estuary of the South China Sea.'),
  ('bangkok', 'Bangkok is the capital of Thailand, on the Chao Phraya River near the Gulf of Thailand.'),
  ('singapore', 'Singapore is a city-state at the southern tip of the Malay Peninsula, on the Strait of Singapore.'),
  ('jakarta', 'Jakarta is the capital of Indonesia, on the northwest coast of Java on the Java Sea.'),
  ('kuala-lumpur', 'Kuala Lumpur is the capital of Malaysia, in the Klang Valley of Peninsular Malaysia.'),
  ('manila', 'Manila is the capital of the Philippines, on Manila Bay on the western side of Luzon.'),
  ('sydney', 'Sydney is the capital of New South Wales and the most populous city in Australia, on Port Jackson on the Tasman Sea.'),
  ('melbourne', 'Melbourne is the capital of Victoria, on Port Phillip in southeastern Australia.'),
  ('auckland', 'Auckland is the most populous city in New Zealand, on an isthmus between the Waitematā and Manukau harbours of the North Island.')
) as v(slug, overview)
where c.slug = v.slug
  and (c.overview is null or btrim(c.overview) = '');

commit;
