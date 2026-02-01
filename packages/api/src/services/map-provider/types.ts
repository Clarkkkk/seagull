export type MapProviderId = "mapbox";

export type AddressParts = {
  country: string;
  province: string;
  city: string;
  formattedAddress?: string;
};

export type GeocodeCandidate = AddressParts & {
  name: string;
  lat: number;
  lng: number;
  placeProvider: MapProviderId;
  placeId?: string;
};

export interface MapProvider {
  id: MapProviderId;
  searchPlaces(query: string, opts?: { limit?: number }): Promise<GeocodeCandidate[]>;
  reverseGeocode(lat: number, lng: number): Promise<AddressParts>;
}

