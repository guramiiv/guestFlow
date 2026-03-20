import client from './client';
import type { Property } from '../types';

export async function getProperty(): Promise<Property> {
  const response = await client.get<Property>('/property/');
  return response.data;
}

export async function updateProperty(data: Partial<Property>): Promise<Property> {
  const response = await client.patch<Property>('/property/', data);
  return response.data;
}
