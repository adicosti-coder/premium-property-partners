import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Normal flow: Try Google Places first, then cascade through free sources
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

    // Step 1: Find Place using Text Search
    let locationBias = '';
    
    if (latitude && longitude) {
      locationBias = `&locationBias=circle:5000@${latitude},${longitude}`;
    }

    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name,photos,formatted_address,geometry${locationBias}&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Find Place URL:', findPlaceUrl.replace(GOOGLE_PLACES_API_KEY, 'REDACTED'));
    
    const findPlaceResponse = await fetch(findPlaceUrl);
    const findPlaceData = await findPlaceResponse.json();
    
    console.log('Find Place Response status:', findPlaceData.status);

    if (findPlaceData.status !== 'OK' || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
      // Try Text Search as fallback
      console.log('Trying Text Search API as fallback...');
      
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery + ' Timisoara Romania')}&key=${GOOGLE_PLACES_API_KEY}`;
      
      const textSearchResponse = await fetch(textSearchUrl);
      const textSearchData = await textSearchResponse.json();
      
      console.log('Text Search Response status:', textSearchData.status);
      
      if (textSearchData.status !== 'OK' || !textSearchData.results || textSearchData.results.length === 0) {
        // Try free sources cascade as last resort
        console.log('Google Places found nothing, trying free sources cascade...');
        const freeResult = await searchFreeImageSources(searchQuery);
        
        if (freeResult) {
          return new Response(
            JSON.stringify({
              success: true,
              photo_url: freeResult.url,
              place_name: searchQuery,
              source: freeResult.source,
              message: `Image from ${freeResult.source} (Google Places found no results)`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Place not found', 
            details: textSearchData.status,
            query: searchQuery 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use first result from text search
      const place = textSearchData.results[0];
      
      if (!place.photos || place.photos.length === 0) {
        // Try free sources cascade for places without photos
        console.log('Place found but no photos, trying free sources cascade...');
        const freeResult = await searchFreeImageSources(place.name || searchQuery);
        
        if (freeResult) {
          return new Response(
            JSON.stringify({
              success: true,
              photo_url: freeResult.url,
              place_name: place.name,
              place_id: place.place_id,
              address: place.formatted_address,
              source: freeResult.source,
              message: `Image from ${freeResult.source} (Google Places had no photos)`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'No photos available for this place',
            place_name: place.name,
            place_id: place.place_id
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get photo URL from Google Places
      const photoReference = place.photos[0].photo_reference;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log('Fetching photo from Text Search result...');
      
      const photoResponse = await fetch(photoUrl, { redirect: 'follow' });
      const finalPhotoUrl = photoResponse.url;
      await photoResponse.arrayBuffer();
      
      console.log('Photo URL obtained successfully');
      
      return new Response(
        JSON.stringify({
          success: true,
          photo_url: finalPhotoUrl,
          place_name: place.name,
          place_id: place.place_id,
          address: place.formatted_address,
          photos_available: place.photos.length,
          source: 'google_places'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = findPlaceData.candidates[0];
    
    if (!place.photos || place.photos.length === 0) {
      // Try free sources cascade for places without photos
      console.log('Place found but no photos, trying free sources cascade...');
      const freeResult = await searchFreeImageSources(place.name || searchQuery);
      
      if (freeResult) {
        return new Response(
          JSON.stringify({
            success: true,
            photo_url: freeResult.url,
            place_name: place.name,
            place_id: place.place_id,
            address: place.formatted_address,
            source: freeResult.source,
            message: `Image from ${freeResult.source} (Google Places had no photos)`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'No photos available for this place',
          place_name: place.name,
          place_id: place.place_id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get Photo URL from Google Places
    const photoReference = place.photos[0].photo_reference;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Fetching photo...');
    
    const photoResponse = await fetch(photoUrl, { redirect: 'follow' });
    const finalPhotoUrl = photoResponse.url;
    await photoResponse.arrayBuffer();
    
    console.log('Photo URL obtained successfully');

    return new Response(
      JSON.stringify({
        success: true,
        photo_url: finalPhotoUrl,
        place_name: place.name,
        place_id: place.place_id,
        address: place.formatted_address,
        photos_available: place.photos.length,
        source: 'google_places'
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
