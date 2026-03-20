import client from './client';
import type { Guest, GuestDetail, PaginatedResponse } from '../types';

export async function getGuests(
  params?: { search?: string },
): Promise<PaginatedResponse<Guest>> {
  const response = await client.get<PaginatedResponse<Guest>>('/guests/', { params });
  return response.data;
}

export async function getGuest(id: number): Promise<GuestDetail> {
  const response = await client.get<GuestDetail>(`/guests/${id}/`);
  return response.data;
}

export async function updateGuest(id: number, data: Partial<Guest>): Promise<Guest> {
  const response = await client.patch<Guest>(`/guests/${id}/`, data);
  return response.data;
}
