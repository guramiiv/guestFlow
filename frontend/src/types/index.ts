export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  language: string;
  is_property_owner: boolean;
}

export interface SeasonalRate {
  id: number;
  name_ka: string;
  start_date: string;
  end_date: string;
  price_gel: string;
  min_stay: number;
}

export interface Room {
  id: number;
  name_ka: string;
  name_en: string;
  room_type: string;
  max_guests: number;
  base_price_gel: string;
  description_ka: string;
  description_en: string;
  amenities: string[];
  photos: string[];
  floor: number;
  is_active: boolean;
  sort_order: number;
  seasonal_rates: SeasonalRate[];
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  name_ka: string;
  name_en: string;
  slug: string;
  property_type: string;
  description_ka: string;
  description_en: string;
  address_ka: string;
  city: string;
  region: string;
  latitude: string | null;
  longitude: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  check_in_time: string;
  check_out_time: string;
  house_rules_ka: string;
  house_rules_en: string;
  tax_id: string;
  amenities: string[];
  photos: string[];
  banner_photo: string;
  plan: string;
  is_active: boolean;
  rooms: Room[];
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  property: number;
  room: number;
  room_name: string;
  guest: number | null;
  source: string;
  external_id: string;
  status: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_nights: number;
  total_price_gel: string;
  paid_amount_gel: string;
  payment_status: string;
  payment_method: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_country: string;
  notes: string;
  guest_message: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

export interface BookingCalendar {
  id: number;
  room: number;
  room_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
}

export interface Guest {
  id: number;
  property: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  id_type: string;
  id_number: string;
  total_stays: number;
  total_spent_gel: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface GuestDetail extends Guest {
  recent_bookings: BookingCalendar[];
}

export interface DashboardData {
  today_check_ins: number;
  today_check_outs: number;
  current_occupancy: number;
  month_revenue: number;
  upcoming_arrivals: BookingCalendar[];
  recent_bookings: Booking[];
  share_count_this_month: number;
  share_breakdown: Record<string, number>;
}

export interface RevenueDataPoint {
  date: string;
  revenue_gel: number;
  bookings_count: number;
}

export interface OccupancyDataPoint {
  date: string;
  occupancy_percent: number;
  rooms_occupied: number;
  rooms_total: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BookingFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
  source?: string;
}

export interface RecordPaymentData {
  amount: string;
  payment_method?: string;
}
