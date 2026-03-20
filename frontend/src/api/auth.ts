import client from './client';
import type { RegisterData, RegisterResponse, LoginResponse, User } from '../types';

export async function register(data: RegisterData): Promise<RegisterResponse> {
  const response = await client.post<RegisterResponse>('/auth/register/', data);
  localStorage.setItem('access', response.data.tokens.access);
  localStorage.setItem('refresh', response.data.tokens.refresh);
  return response.data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>('/auth/token/', { email, password });
  localStorage.setItem('access', response.data.access);
  localStorage.setItem('refresh', response.data.refresh);
  return response.data;
}

export async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem('refresh');
  const response = await client.post<{ access: string }>('/auth/token/refresh/', { refresh });
  localStorage.setItem('access', response.data.access);
  return response.data.access;
}

export async function getMe(): Promise<User> {
  const response = await client.get<User>('/auth/me/');
  return response.data;
}

export async function updateMe(data: Partial<User>): Promise<User> {
  const response = await client.patch<User>('/auth/me/', data);
  return response.data;
}

export function logout(): void {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}
