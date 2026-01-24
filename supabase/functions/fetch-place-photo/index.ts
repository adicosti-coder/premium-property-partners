import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Missing GOOGLE_PLACES_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, address, latitude, longitude } = await req.json();
    
    if (!query && !address) {
      return new Response(
        JSON.stringify({ error: 'Query or address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for place: ${query || address}`);

    // Step 1: Find Place using Text Search
    const searchQuery = query || address;
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
        return new Response(
          JSON.stringify({ 
            error: 'No photos available for this place',
            place_name: place.name,
            place_id: place.place_id
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get photo URL
      const photoReference = place.photos[0].photo_reference;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log('Fetching photo from Text Search result...');
      
      // Fetch the actual photo to get the final URL (Google redirects)
      const photoResponse = await fetch(photoUrl, { redirect: 'follow' });
      const finalPhotoUrl = photoResponse.url;
      
      // Consume the response body to prevent resource leaks
      await photoResponse.arrayBuffer();
      
      console.log('Photo URL obtained successfully');
      
      return new Response(
        JSON.stringify({
          success: true,
          photo_url: finalPhotoUrl,
          place_name: place.name,
          place_id: place.place_id,
          address: place.formatted_address,
          photos_available: place.photos.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = findPlaceData.candidates[0];
    
    if (!place.photos || place.photos.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No photos available for this place',
          place_name: place.name,
          place_id: place.place_id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get Photo URL
    const photoReference = place.photos[0].photo_reference;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Fetching photo...');
    
    // Fetch the actual photo to get the final URL (Google redirects)
    const photoResponse = await fetch(photoUrl, { redirect: 'follow' });
    const finalPhotoUrl = photoResponse.url;
    
    // Consume the response body to prevent resource leaks
    await photoResponse.arrayBuffer();
    
    console.log('Photo URL obtained successfully');

    return new Response(
      JSON.stringify({
        success: true,
        photo_url: finalPhotoUrl,
        place_name: place.name,
        place_id: place.place_id,
        address: place.formatted_address,
        photos_available: place.photos.length
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
