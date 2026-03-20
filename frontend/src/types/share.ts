export interface SocialCaptions {
  facebook_ka: string;
  facebook_en: string;
  instagram_ka: string;
  instagram_en: string;
  whatsapp_ka: string;
  whatsapp_en: string;
  sms_ka: string;
  viber_ka: string;
}

export interface ShareInfo {
  booking_url: string;
  property_name_ka: string;
  property_name_en: string;
  property_type: string;
  city: string;
  region: string;
  region_ka: string;
  total_rooms: number;
  price_from_gel: number;
  description_short_ka: string;
  description_short_en: string;
  has_photos: boolean;
  cover_photo_url: string | null;
  social_captions: SocialCaptions;
  qr_code_url: string;
}
