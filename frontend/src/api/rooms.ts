import client from './client';
import type { Room, PaginatedResponse } from '../types';

export async function getRooms(): Promise<PaginatedResponse<Room>> {
  const response = await client.get<PaginatedResponse<Room>>('/property/rooms/');
  return response.data;
}

export async function getRoom(id: number): Promise<Room> {
  const response = await client.get<Room>(`/property/rooms/${id}/`);
  return response.data;
}

export async function createRoom(data: Partial<Room>): Promise<Room> {
  const response = await client.post<Room>('/property/rooms/', data);
  return response.data;
}

export async function updateRoom(id: number, data: Partial<Room>): Promise<Room> {
  const response = await client.patch<Room>(`/property/rooms/${id}/`, data);
  return response.data;
}

export async function deleteRoom(id: number): Promise<void> {
  await client.delete(`/property/rooms/${id}/`);
}

export async function uploadPhotos(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await client.post<{ urls: string[] }>('/property/upload-photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.urls;
}

export async function checkAvailability(
  roomId: number,
  startDate: string,
  endDate: string,
): Promise<{ available: boolean; occupied_dates?: string[] }> {
  const response = await client.get(`/property/rooms/${roomId}/availability/`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
}
