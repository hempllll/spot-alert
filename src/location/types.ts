/** A geographic coordinate in decimal degrees. */
export interface Coords {
  lat: number
  lon: number
}

/** A place returned by city/geocoding search. */
export interface Place {
  name: string
  lat: number
  lon: number
  /** Country name, when the geocoder provides it. */
  country?: string
  /** Region/state (Open-Meteo's admin1), when provided. */
  region?: string
}
