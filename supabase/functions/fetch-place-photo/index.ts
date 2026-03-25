import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GooglePlacePhoto {
  photo_reference: string;
}

interface GooglePlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  photos?: GooglePlacePhoto[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

const GENERIC_PLACE_TOKENS = new Set([
  'timisoara', 'timișoara', 'romania', 'românia', 'strada', 'bulevardul', 'bulevard', 'calea', 'piata', 'piața',
  'hotel', 'apart', 'apartament', 'centru', 'center', 'mall', 'city', 'town', 'clinica', 'clinic', 'de', 'la', 'din',
  'si', 'și', 'the', 'of', 'shop', 'shopping', 'restaurant', 'cafe', 'bar', 'pub', 'bank', 'banca', 'spitalul',
  'spital', 'urgenta', 'urgență', 'agenția', 'agentia'
]);

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string | null | undefined) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);

const getDistinctiveTokens = (value: string | null | undefined) =>
  tokenize(value).filter((token) => !GENERIC_PLACE_TOKENS.has(token));

function getDistanceInMeters(
  latitudeA?: number,
  longitudeA?: number,
  latitudeB?: number,
  longitudeB?: number,
) {
  if (
    !Number.isFinite(latitudeA) ||
    !Number.isFinite(longitudeA) ||
    !Number.isFinite(latitudeB) ||
    !Number.isFinite(longitudeB)
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians((latitudeB as number) - (latitudeA as number));
  const lngDelta = toRadians((longitudeB as number) - (longitudeA as number));
  const startLat = toRadians(latitudeA as number);
  const endLat = toRadians(latitudeB as number);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function scorePlaceCandidate(
  place: GooglePlaceResult,
  expectedName: string,
  expectedAddress: string,
  expectedLatitude?: number,
  expectedLongitude?: number,
) {
  const placeName = normalizeText(place.name);
  const placeAddress = normalizeText(place.formatted_address);
  const expectedNameTokens = tokenize(expectedName);
  const expectedAddressTokens = tokenize(expectedAddress);
  const distinctiveNameTokens = getDistinctiveTokens(expectedName);
  const distinctiveAddressTokens = getDistinctiveTokens(expectedAddress);
  const normalizedExpectedName = normalizeText(expectedName);
  const normalizedExpectedAddress = normalizeText(expectedAddress);

  let score = 0;

  expectedNameTokens.forEach((token) => {
    if (placeName.includes(token)) score += 5;
    if (placeAddress.includes(token)) score += 2;
  });

  expectedAddressTokens.forEach((token) => {
    if (placeAddress.includes(token)) score += 3;
    if (placeName.includes(token)) score += 1;
  });

  distinctiveNameTokens.forEach((token) => {
    if (placeName.includes(token)) {
      score += 12;
    } else {
      score -= 8;
    }

    if (placeAddress.includes(token)) {
      score += 4;
    }
  });

  distinctiveAddressTokens.forEach((token) => {
    if (placeAddress.includes(token)) {
      score += 6;
    } else {
      score -= 4;
    }
  });

  if (place.photos?.length) score += 8;
  if (placeName === normalizedExpectedName) score += 22;
  if (placeAddress === normalizedExpectedAddress) score += 18;
  if (placeName.includes(normalizedExpectedName) || normalizedExpectedName.includes(placeName)) score += 16;
  if (placeAddress.includes(normalizedExpectedAddress) || normalizedExpectedAddress.includes(placeAddress)) score += 10;

  const candidateLatitude = place.geometry?.location?.lat;
  const candidateLongitude = place.geometry?.location?.lng;
  const distanceInMeters = getDistanceInMeters(
    expectedLatitude,
    expectedLongitude,
    candidateLatitude,
    candidateLongitude,
  );

  if (distanceInMeters !== null) {
    if (distanceInMeters <= 150) score += 18;
    else if (distanceInMeters <= 500) score += 10;
    else if (distanceInMeters <= 1200) score += 2;
    else if (distanceInMeters <= 3000) score -= 10;
    else score -= 24;
  }

  return score;
}

function pickBestPlace(
  results: GooglePlaceResult[],
  expectedName: string,
  expectedAddress: string,
  expectedLatitude?: number,
  expectedLongitude?: number,
) {
  if (!results.length) return null;

  return [...results]
    .sort(
      (a, b) =>
        scorePlaceCandidate(b, expectedName, expectedAddress, expectedLatitude, expectedLongitude) -
        scorePlaceCandidate(a, expectedName, expectedAddress, expectedLatitude, expectedLongitude)
    )[0];
}

function buildSearchQueries(query?: string, address?: string) {
  const rawName = (query || '').split(',')[0]?.trim();
  const candidates = [query, rawName, address, rawName && address ? `${rawName}, ${address}` : null];

  return [...new Set(candidates.filter((value): value is string => !!value && value.trim().length > 0))];
}

async function fetchGoogleApiJson(url: string) {
  const response = await fetch(url);
  return response.json();
}

async function resolveGooglePhotoUrl(place: GooglePlaceResult, googlePlacesApiKey: string) {
  if (!place.photos?.length) return null;

  const photoReference = place.photos[0].photo_reference;
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoReference}&key=${googlePlacesApiKey}`;
  const photoResponse = await fetch(photoUrl, { redirect: 'follow' });

  if (!photoResponse.ok) return null;

  await photoResponse.arrayBuffer();
  return photoResponse.url;
}

async function searchNearbyPlace(
  expectedName: string,
  expectedAddress: string,
  latitude: number | undefined,
  longitude: number | undefined,
  googlePlacesApiKey: string
) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !expectedName.trim()) {
    return null;
  }

  const nearbyQueries = [...new Set([expectedName, `${expectedName} ${expectedAddress}`.trim()])];

  for (const nearbyQuery of nearbyQueries) {
    const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    nearbyUrl.searchParams.set('location', `${latitude},${longitude}`);
    nearbyUrl.searchParams.set('rankby', 'distance');
    nearbyUrl.searchParams.set('keyword', nearbyQuery);
    nearbyUrl.searchParams.set('key', googlePlacesApiKey);

    const nearbyData = await fetchGoogleApiJson(nearbyUrl.toString());
    if (nearbyData.status === 'OK' && Array.isArray(nearbyData.results) && nearbyData.results.length > 0) {
      const place = pickBestPlace(nearbyData.results, expectedName, expectedAddress, latitude, longitude);
      if (place?.photos?.length) {
        return { place, source: 'google_places_nearby' };
      }
    }
  }

  return null;
}

async function fetchGooglePlacePhoto(options: {
  query?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlacesApiKey: string;
}) {
  const { query, address, latitude, longitude, googlePlacesApiKey } = options;
  const searchQueries = buildSearchQueries(query, address);
  const expectedName = (query || address || '').split(',')[0]?.trim() || query || address || '';
  const expectedAddress = address || query || '';

  const nearbyMatch = await searchNearbyPlace(expectedName, expectedAddress, latitude, longitude, googlePlacesApiKey);
  if (nearbyMatch?.place) {
    const photoUrl = await resolveGooglePhotoUrl(nearbyMatch.place, googlePlacesApiKey);
    if (photoUrl) {
      return { photoUrl, place: nearbyMatch.place, source: nearbyMatch.source };
    }
  }

  for (const searchQuery of searchQueries) {
    const findPlaceUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    findPlaceUrl.searchParams.set('input', searchQuery);
    findPlaceUrl.searchParams.set('inputtype', 'textquery');
    findPlaceUrl.searchParams.set('fields', 'place_id,name,photos,formatted_address,geometry');
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      findPlaceUrl.searchParams.set('locationBias', `circle:5000@${latitude},${longitude}`);
    }
    findPlaceUrl.searchParams.set('key', googlePlacesApiKey);

    const findPlaceData = await fetchGoogleApiJson(findPlaceUrl.toString());
    if (findPlaceData.status === 'OK' && Array.isArray(findPlaceData.candidates) && findPlaceData.candidates.length > 0) {
        const place = pickBestPlace(findPlaceData.candidates, expectedName, expectedAddress, latitude, longitude);
      if (place) {
        const photoUrl = await resolveGooglePhotoUrl(place, googlePlacesApiKey);
        if (photoUrl) {
          return { photoUrl, place, source: 'google_places_findplace' };
        }
      }
    }

    const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    textSearchUrl.searchParams.set('query', searchQuery);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      textSearchUrl.searchParams.set('location', `${latitude},${longitude}`);
      textSearchUrl.searchParams.set('radius', '5000');
    }
    textSearchUrl.searchParams.set('key', googlePlacesApiKey);

    const textSearchData = await fetchGoogleApiJson(textSearchUrl.toString());
    if (textSearchData.status === 'OK' && Array.isArray(textSearchData.results) && textSearchData.results.length > 0) {
        const place = pickBestPlace(textSearchData.results, expectedName, expectedAddress, latitude, longitude);
      if (place) {
        const photoUrl = await resolveGooglePhotoUrl(place, googlePlacesApiKey);
        if (photoUrl) {
          return { photoUrl, place, source: 'google_places_textsearch' };
        }
      }
    }
  }

  return null;
}

// Pexels API search
async function searchPexels(query: string): Promise<{ url: string; source: string } | null> {
  const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
  
  if (!PEXELS_API_KEY) {
    console.log('Pexels API key not configured, skipping');
    return null;
  }

  try {
    const searchTerms = `${query} Romania`;
    console.log(`Searching Pexels for: ${searchTerms}`);
    
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=5&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      console.log(`Pexels API error: ${response.status}`);
      await response.text();
      return null;
    }
    
    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const imageUrl = data.photos[0].src.large || data.photos[0].src.medium;
      console.log(`Pexels found image: ${imageUrl}`);
      return { url: imageUrl, source: 'pexels' };
    }
    
    // Try broader search without location
    console.log('No Pexels results with location, trying broader search...');
    const broaderResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );
    
    if (!broaderResponse.ok) {
      await broaderResponse.text();
      return null;
    }
    
    const broaderData = await broaderResponse.json();
    
    if (broaderData.photos && broaderData.photos.length > 0) {
      const imageUrl = broaderData.photos[0].src.large || broaderData.photos[0].src.medium;
      console.log(`Pexels broader search found image: ${imageUrl}`);
      return { url: imageUrl, source: 'pexels' };
    }
    
    console.log('No Pexels images found');
    return null;
  } catch (error) {
    console.error('Pexels search error:', error);
    return null;
  }
}

// Unsplash API search
async function searchUnsplash(query: string): Promise<{ url: string; source: string } | null> {
  const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('Unsplash API key not configured, skipping');
    return null;
  }

  try {
    const searchTerms = `${query} Romania`;
    console.log(`Searching Unsplash for: ${searchTerms}`);
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerms)}&per_page=5&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      console.log(`Unsplash API error: ${response.status}`);
      await response.text();
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular || data.results[0].urls.small;
      console.log(`Unsplash found image: ${imageUrl}`);
      return { url: imageUrl, source: 'unsplash' };
    }
    
    // Try broader search without location
    console.log('No Unsplash results with location, trying broader search...');
    const broaderResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    
    if (!broaderResponse.ok) {
      await broaderResponse.text();
      return null;
    }
    
    const broaderData = await broaderResponse.json();
    
    if (broaderData.results && broaderData.results.length > 0) {
      const imageUrl = broaderData.results[0].urls.regular || broaderData.results[0].urls.small;
      console.log(`Unsplash broader search found image: ${imageUrl}`);
      return { url: imageUrl, source: 'unsplash' };
    }
    
    console.log('No Unsplash images found');
    return null;
  } catch (error) {
    console.error('Unsplash search error:', error);
    return null;
  }
}

// Pixabay fallback search
async function searchPixabay(query: string): Promise<{ url: string; source: string } | null> {
  const PIXABAY_API_KEY = Deno.env.get('PIXABAY_API_KEY');
  
  if (!PIXABAY_API_KEY) {
    console.log('Pixabay API key not configured, skipping fallback');
    return null;
  }

  try {
    const searchTerms = `${query} Timisoara Romania`;
    const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchTerms)}&image_type=photo&orientation=horizontal&min_width=640&per_page=5&lang=ro`;
    
    console.log(`Searching Pixabay for: ${searchTerms}`);
    
    const response = await fetch(pixabayUrl);
    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      const imageUrl = data.hits[0].webformatURL || data.hits[0].largeImageURL;
      console.log(`Pixabay found image: ${imageUrl}`);
      return { url: imageUrl, source: 'pixabay' };
    }
    
    // Try a broader search without location if no results
    console.log('No Pixabay results with location, trying broader search...');
    const broaderUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&min_width=640&per_page=5`;
    
    const broaderResponse = await fetch(broaderUrl);
    const broaderData = await broaderResponse.json();
    
    if (broaderData.hits && broaderData.hits.length > 0) {
      const imageUrl = broaderData.hits[0].webformatURL || broaderData.hits[0].largeImageURL;
      console.log(`Pixabay broader search found image: ${imageUrl}`);
      return { url: imageUrl, source: 'pixabay' };
    }
    
    console.log('No Pixabay images found');
    return null;
  } catch (error) {
    console.error('Pixabay search error:', error);
    return null;
  }
}

// Cascade fallback through all free image sources
async function searchFreeImageSources(query: string): Promise<{ url: string; source: string } | null> {
  console.log('Starting cascade fallback through free image sources...');
  
  // Try Pixabay first (usually best results for specific locations)
  const pixabayResult = await searchPixabay(query);
  if (pixabayResult) return pixabayResult;
  
  // Try Pexels second
  const pexelsResult = await searchPexels(query);
  if (pexelsResult) return pexelsResult;
  
  // Try Unsplash last
  const unsplashResult = await searchUnsplash(query);
  if (unsplashResult) return unsplashResult;
  
  console.log('No images found in any free source');
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, address, latitude, longitude, forcePixabay, forcePexels, forceUnsplash, forceFreeOnly } = await req.json();
    
    if (!query && !address) {
      return new Response(
        JSON.stringify({ error: 'Query or address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = query || address;
    console.log(`Searching for place: ${searchQuery}`);

    // Force specific free source modes
    if (forcePixabay) {
      console.log('Force Pixabay mode');
      const result = await searchPixabay(searchQuery);
      if (result) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: result.url,
            place_name: searchQuery,
            source: result.source,
            message: 'Image from Pixabay (forced mode)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (forcePexels) {
      console.log('Force Pexels mode');
      const result = await searchPexels(searchQuery);
      if (result) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: result.url,
            place_name: searchQuery,
            source: result.source,
            message: 'Image from Pexels (forced mode)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (forceUnsplash) {
      console.log('Force Unsplash mode');
      const result = await searchUnsplash(searchQuery);
      if (result) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: result.url,
            place_name: searchQuery,
            source: result.source,
            message: 'Image from Unsplash (forced mode)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Force free sources only (cascade through Pixabay → Pexels → Unsplash)
    if (forceFreeOnly || forcePixabay || forcePexels || forceUnsplash) {
      console.log('Free sources only mode - cascade fallback');
      const freeResult = await searchFreeImageSources(searchQuery);
      
      if (freeResult) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: freeResult.url,
            place_name: searchQuery,
            source: freeResult.source,
            message: `Image from ${freeResult.source} (free sources cascade)`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'No images found in any free source', 
          query: searchQuery 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normal flow: prefer real Google Places photos for exact locations
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('Google Places API key not configured, using free sources');
      const freeResult = await searchFreeImageSources(searchQuery);
      
      if (freeResult) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: freeResult.url,
            place_name: searchQuery,
            source: freeResult.source,
            message: `Image from ${freeResult.source} (Google API unavailable)`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'No API keys configured and no free images found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleResult = await fetchGooglePlacePhoto({
      query,
      address,
      latitude,
      longitude,
      googlePlacesApiKey: GOOGLE_PLACES_API_KEY,
    });

    if (!googleResult) {
      return new Response(
        JSON.stringify({
          error: 'No real place photo found',
          query: searchQuery,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        photo_url: googleResult.photoUrl,
        place_name: googleResult.place.name,
        place_id: googleResult.place.place_id,
        address: googleResult.place.formatted_address,
        photos_available: googleResult.place.photos?.length || 0,
        source: googleResult.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching place photo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to fetch place photo', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
