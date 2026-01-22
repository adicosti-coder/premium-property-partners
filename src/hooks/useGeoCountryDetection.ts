import { useState, useEffect } from "react";
import { countries, CountryInfo, getDefaultCountry } from "@/utils/phoneCountryDetector";

interface GeoLocationState {
  country: CountryInfo;
  isLoading: boolean;
  error: string | null;
  source: 'ip' | 'gps' | 'default' | null;
}

/**
 * Hook to detect user's country based on their location
 * Uses IP-based geolocation (no permission required) with optional GPS fallback
 */
export const useGeoCountryDetection = () => {
  const [state, setState] = useState<GeoLocationState>({
    country: getDefaultCountry(),
    isLoading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    const detectCountry = async () => {
      // Try IP-based geolocation first (no permission required)
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.country_code;
          
          if (countryCode) {
            const matchedCountry = countries.find(
              c => c.code.toUpperCase() === countryCode.toUpperCase()
            );
            
            if (matchedCountry) {
              setState({
                country: matchedCountry,
                isLoading: false,
                error: null,
                source: 'ip',
              });
              return;
            }
          }
        }
      } catch (error) {
        console.log('IP geolocation failed, using default country');
      }

      // Fallback to default country
      setState({
        country: getDefaultCountry(),
        isLoading: false,
        error: null,
        source: 'default',
      });
    };

    detectCountry();
  }, []);

  return state;
};

/**
 * Request GPS-based location (requires user permission)
 * Returns country code or null if unavailable
 */
export const requestGPSLocation = (): Promise<CountryInfo | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding with coordinates
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://ipapi.co/${latitude},${longitude}/json/`,
            { signal: AbortSignal.timeout(5000) }
          );
          
          if (response.ok) {
            const data = await response.json();
            const countryCode = data.country_code;
            
            if (countryCode) {
              const matchedCountry = countries.find(
                c => c.code.toUpperCase() === countryCode.toUpperCase()
              );
              resolve(matchedCountry || null);
              return;
            }
          }
        } catch (error) {
          console.log('GPS reverse geocoding failed');
        }
        resolve(null);
      },
      () => {
        // User denied permission or error occurred
        resolve(null);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
};
