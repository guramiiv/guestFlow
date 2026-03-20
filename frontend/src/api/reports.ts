import client from './client';
import type { DashboardData, RevenueDataPoint, OccupancyDataPoint } from '../types';

export async function getDashboard(): Promise<DashboardData> {
  const response = await client.get<DashboardData>('/reports/dashboard/');
  return response.data;
}

export async function getRevenue(
  period?: string,
  startDate?: string,
): Promise<RevenueDataPoint[]> {
  const response = await client.get<RevenueDataPoint[]>('/reports/revenue/', {
    params: { period, start: startDate },
  });
  return response.data;
}

export async function getOccupancy(
  startDate: string,
  endDate: string,
): Promise<OccupancyDataPoint[]> {
  const response = await client.get<OccupancyDataPoint[]>('/reports/occupancy/', {
    params: { start: startDate, end: endDate },
  });
  return response.data;
}
