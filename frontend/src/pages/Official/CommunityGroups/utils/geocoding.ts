// Define types for Mapbox geocoding response
interface MapboxFeature {
  center?: [number, number]
  geometry?: {
    coordinates?: [number, number]
  }
  place_name?: string
  place_type?: string[]
  relevance?: number
  properties?: {
    accuracy?: string
  }
}

interface MapboxGeocodingResponse {
  features?: MapboxFeature[]
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string
  if (!token) throw new Error("Missing VITE_MAPBOX_TOKEN")
  
  // Log the exact coordinates being geocoded for debugging
  console.log(`🔍 Reverse geocoding coordinates: lng=${lng.toFixed(6)}, lat=${lat.toFixed(6)}`)
  
  // Validate coordinates are within reasonable range for Philippines
  if (lng < 116 || lng > 127 || lat < 4 || lat > 21) {
    console.warn(`⚠️ Coordinates outside Philippines bounds: lng=${lng}, lat=${lat}`)
  }
  
  // Improved configuration for more accurate address results:
  // - Use only 'address' type for precise street-level results
  // - Add routable=true for better address matching
  // - Use proximity to prioritize results near the clicked point
  // - Increase limit to 3 to have fallback options
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address&country=PH&proximity=${lng},${lat}&routable=true&limit=3`
  
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`Reverse geocoding failed: ${res.status} ${res.statusText}`)
    throw new Error("Failed to reverse geocode")
  }
  
  const data: MapboxGeocodingResponse = await res.json()
  
  // Check if we got valid results
  if (!data?.features || data.features.length === 0) {
    console.warn(`No address results found for coordinates: ${lng}, ${lat}`)
    
    // Fallback: Try with broader types (poi, place, locality) if no addresses found
    const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=poi,place,locality&country=PH&proximity=${lng},${lat}&limit=1`
    const fallbackRes = await fetch(fallbackUrl)
    
    if (fallbackRes.ok) {
      const fallbackData: MapboxGeocodingResponse = await fallbackRes.json()
      if (fallbackData?.features && fallbackData.features.length > 0) {
        const fallbackAddress = fallbackData.features[0]?.place_name
        if (fallbackAddress) {
          console.log(`Using fallback result: ${fallbackAddress}`)
          return fallbackAddress
        }
      }
    }
    
    // Final fallback: return coordinates
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
  
  // Find the most accurate result - prefer results with higher relevance and accuracy
  let bestFeature = data.features[0]
  for (const feature of data.features) {
    // Prefer results with street-level accuracy
    if (feature.properties?.accuracy === 'street' && bestFeature.properties?.accuracy !== 'street') {
      bestFeature = feature
      break
    }
    // Prefer results with higher relevance
    if ((feature.relevance ?? 0) > (bestFeature.relevance ?? 0)) {
      bestFeature = feature
    }
  }
  
  const address = bestFeature?.place_name
  if (!address) {
    console.warn(`Invalid place_name in geocoding response for: ${lng}, ${lat}`)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
  
  console.log(`Selected address: ${address} (relevance: ${bestFeature.relevance}, accuracy: ${bestFeature.properties?.accuracy})`)
  
  // Additional validation: Check if the returned coordinates are significantly different from input
  const returnedCoords = bestFeature.center || bestFeature.geometry?.coordinates
  if (returnedCoords && Array.isArray(returnedCoords) && returnedCoords.length >= 2) {
    const [returnedLng, returnedLat] = returnedCoords
    const distanceKm = calculateDistance(lat, lng, returnedLat, returnedLng)
    if (distanceKm > 5) { // If geocoded location is more than 5km away, warn
      console.warn(`⚠️ Geocoded location is ${distanceKm.toFixed(2)}km away from clicked point`)
      console.warn(`Input: [${lng.toFixed(6)}, ${lat.toFixed(6)}] → Output: [${returnedLng.toFixed(6)}, ${returnedLat.toFixed(6)}]`)
    }
  }
  
  return address
}

export async function forwardGeocode(query: string): Promise<{ lng: number; lat: number; place_name: string } | null> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string
  if (!token) throw new Error("Missing VITE_MAPBOX_TOKEN")
  
  // Improved configuration for better search results
  // - Prioritize address types but include poi and place as fallbacks
  // - Use autocomplete=true for better text matching
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=PH&types=address,poi,place,locality&autocomplete=true&limit=3`
  
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`Forward geocoding failed: ${res.status} ${res.statusText}`)
    return null
  }
  
  const data: MapboxGeocodingResponse = await res.json()
  
  // Find the best match - prefer address types over others
  let bestFeature = data?.features?.[0]
  
  if (data?.features && data.features.length > 1) {
    // Prefer address type results
    const addressFeature = data.features.find((f: MapboxFeature) => f.place_type?.includes('address'))
    if (addressFeature) {
      bestFeature = addressFeature
    }
  }
  
  if (!bestFeature) {
    console.warn(`No geocoding results found for query: "${query}"`)
    return null
  }
  
  const [lng, lat] = bestFeature.center || []
  
  if (lng == null || lat == null) {
    console.warn(`Invalid coordinates in geocoding response for: "${query}"`)
    return null
  }

  const placeName = bestFeature.place_name
  if (!placeName) {
    console.warn(`Missing place_name in geocoding response for: "${query}"`)
    return null
  }
  
  return { lng, lat, place_name: placeName }
}
