import api from './api';
import { Location } from '../types';

export interface LocationCreate {
  location_code: string;
  zone?: string;
  rack?: string;
  level?: string;
  position?: string;
  location_type: string;
}

export const locationService = {
  async getLocations(skip?: number, limit?: number): Promise<Location[]> {
    const response = await api.get<Location[]>('/locations/', { params: { skip, limit } });
    return response.data;
  },

  async getLocation(id: number): Promise<Location> {
    const response = await api.get<Location>(`/locations/${id}`);
    return response.data;
  },

  async getAvailableLocations(locationType?: string): Promise<Location[]> {
    const response = await api.get<Location[]>('/locations/available', {
      params: locationType ? { location_type: locationType } : undefined,
    });
    return response.data;
  },

  async createLocation(location: LocationCreate): Promise<Location> {
    const response = await api.post<Location>('/locations/', location);
    return response.data;
  },

  async updateLocation(id: number, data: Partial<Location>): Promise<Location> {
    const response = await api.put<Location>(`/locations/${id}`, data);
    return response.data;
  },
};
