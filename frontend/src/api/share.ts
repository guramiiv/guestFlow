import client from './client';
import type { ShareInfo } from '../types/share';

export async function getShareInfo(): Promise<ShareInfo> {
  const response = await client.get<ShareInfo>('/property/share/');
  return response.data;
}

export function trackShare(platform: string): void {
  client.post('/property/share/track/', { platform }).catch(() => {});
}

export function getQrCodeUrl(slug?: string): string {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  if (slug) {
    return `${baseURL}/public/${slug}/qr/`;
  }
  return `${baseURL}/property/share/qr/`;
}

export async function fetchQrCodeBlob(): Promise<string> {
  const response = await client.get('/property/share/qr/', { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}
