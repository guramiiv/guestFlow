import axios from 'axios';
import type {
  PublicProperty,
  AvailableRoom,
  PublicBookingRequest,
  BookingConfirmation,
  SeoData,
} from '@/types/public';

const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getPublicProperty(slug: string): Promise<PublicProperty> {
  const { data } = await publicClient.get<PublicProperty>(`/public/${slug}/`);
  return data;
}

export async function checkAvailability(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<AvailableRoom[]> {
  const { data } = await publicClient.get<AvailableRoom[]>(
    `/public/${slug}/availability/`,
    { params: { check_in: checkIn, check_out: checkOut, guests } },
  );
  return data;
}

export async function createPublicBooking(
  slug: string,
  bookingData: PublicBookingRequest,
): Promise<BookingConfirmation & { payment_redirect_url?: string }> {
  const { data } = await publicClient.post<
    BookingConfirmation & { payment_redirect_url?: string }
  >(`/public/${slug}/book/`, bookingData);
  return data;
}

export async function getBookingStatus(
  slug: string,
  bookingId: string,
  email: string,
): Promise<BookingConfirmation> {
  const { data } = await publicClient.get<BookingConfirmation>(
    `/public/${slug}/booking/${bookingId}/`,
    { params: { email } },
  );
  return data;
}

export async function getSeoData(slug: string): Promise<SeoData> {
  const { data } = await publicClient.get<SeoData>(`/public/${slug}/seo/`);
  return data;
}
