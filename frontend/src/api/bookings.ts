import client from './client';
import type {
  Booking,
  BookingCalendar,
  BookingFilters,
  PaginatedResponse,
  RecordPaymentData,
} from '../types';

export async function getBookings(
  params?: BookingFilters,
): Promise<PaginatedResponse<Booking>> {
  const response = await client.get<PaginatedResponse<Booking>>('/bookings/', { params });
  return response.data;
}

export async function getBooking(id: number): Promise<Booking> {
  const response = await client.get<Booking>(`/bookings/${id}/`);
  return response.data;
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  const response = await client.post<Booking>('/bookings/', data);
  return response.data;
}

export async function updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
  const response = await client.patch<Booking>(`/bookings/${id}/`, data);
  return response.data;
}

export async function checkIn(id: number): Promise<Booking> {
  const response = await client.post<Booking>(`/bookings/${id}/check_in/`);
  return response.data;
}

export async function checkOut(id: number): Promise<Booking> {
  const response = await client.post<Booking>(`/bookings/${id}/check_out/`);
  return response.data;
}

export async function cancelBooking(id: number, cancellationReason?: string): Promise<Booking> {
  const response = await client.post<Booking>(`/bookings/${id}/cancel/`, {
    cancellation_reason: cancellationReason || '',
  });
  return response.data;
}

export async function recordPayment(
  id: number,
  data: RecordPaymentData,
): Promise<Booking> {
  const response = await client.post<Booking>(`/bookings/${id}/record_payment/`, data);
  return response.data;
}

export async function getCalendarData(
  startDate: string,
  endDate: string,
): Promise<BookingCalendar[]> {
  const response = await client.get<BookingCalendar[]>('/bookings/calendar/', {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
}
