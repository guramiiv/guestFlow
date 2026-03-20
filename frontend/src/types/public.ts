export interface PublicProperty {
  name_ka: string;
  name_en: string;
  slug: string;
  property_type: string;
  description_ka: string;
  description_en: string;
  address_ka: string;
  city: string;
  region: string;
  phone: string;
  whatsapp: string;
  email: string;
  check_in_time: string;
  check_out_time: string;
  house_rules_ka: string;
  house_rules_en: string;
  amenities: string[];
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  rooms: PublicRoom[];
}

export interface PublicRoom {
  id: string;
  name_ka: string;
  name_en: string;
  room_type: string;
  max_guests: number;
  base_price_gel: number;
  effective_price_gel: number;
  description_ka: string;
  description_en: string;
  amenities: string[];
  photos: string[];
}

export interface AvailableRoom {
  room: PublicRoom;
  price_per_night_gel: number;
  total_price_gel: number;
  nights: number;
}

export interface PublicBookingRequest {
  room_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_country?: string;
  guest_language?: string;
  guest_message?: string;
  payment_method: 'bog_ipay' | 'pay_at_property';
}

export interface BookingConfirmation {
  id: string;
  property_name: string;
  room_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  num_nights: number;
  num_guests: number;
  total_price_gel: number;
  payment_status: string;
  status: string;
  confirmation_code: string;
}

export interface SeoProperty {
  name_ka: string;
  name_en: string;
  slug: string;
  property_type: string;
  description_ka: string;
  description_en: string;
  address_ka: string;
  city: string;
  region: string;
  region_ka: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  check_in_time: string | null;
  check_out_time: string | null;
  photos: string[];
  amenities: string[];
}

export interface SeoRoom {
  name_en: string;
  name_ka: string;
  room_type: string;
  max_guests: number;
  base_price_gel: number;
  effective_price_gel: number;
  description_en: string;
  amenities: string[];
}

export interface SeoData {
  property: SeoProperty;
  rooms: SeoRoom[];
  pricing: {
    currency: string;
    min_price: number | null;
    max_price: number | null;
  };
  stats: {
    total_rooms: number;
    total_reviews: number;
    average_rating: number | null;
  };
  urls: {
    booking_url: string;
    canonical_url: string;
  };
}
