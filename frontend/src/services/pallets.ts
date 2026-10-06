import api from './api';
import { Pallet, PalletStatus, LoadType, Location } from '../types';

export interface PalletCreate {
  pallet_id: string;
  load_number?: string;
  product_id?: number;
  batch_number?: string;
  quantity?: number;
  load_type: LoadType;
  production_datetime?: string;
}

export interface PalletScan {
  pallet_id: string;
}

export interface PalletPutaway {
  pallet_id: string;
  scanned_location_qr: string;
}

export interface PalletRelease {
  pallet_id: string;
  hold_reason?: string;
  hold_reason_details?: string;
}

export const palletService = {
  async getPallets(params?: { status?: PalletStatus; load_type?: LoadType; skip?: number; limit?: number }): Promise<Pallet[]> {
    const response = await api.get<Pallet[]>('/pallets/', { params });
    return response.data;
  },

  async exportPalletsCsv(): Promise<Blob> {
    const response = await api.get('/pallets/export/csv', { responseType: 'blob' });
    return response.data;
  },

  async getPallet(id: number): Promise<Pallet> {
    const response = await api.get<Pallet>(`/pallets/${id}`);
    return response.data;
  },

  async createPallet(pallet: PalletCreate): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/', pallet);
    return response.data;
  },

  async scanPallet(palletId: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/scan', { pallet_id: palletId });
    return response.data;
  },

  async wrapPallet(palletId: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/wrap', { pallet_id: palletId });
    return response.data;
  },

  async markReadyForPutaway(palletId: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/ready-putaway', { pallet_id: palletId });
    return response.data;
  },

  async getReadyForPutawayQueue(): Promise<Pallet[]> {
    const response = await api.get<Pallet[]>('/pallets/ready-putaway/queue');
    return response.data;
  },

  async resolveLocationQr(qrValue: string): Promise<Location> {
    const response = await api.get<Location>('/locations/resolve-qr', { params: { qr_value: qrValue } });
    return response.data;
  },

  async putawayPallet(data: PalletPutaway): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/putaway', data);
    return response.data;
  },

  async releasePallet(data: PalletRelease): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/release', data);
    return response.data;
  },

  async dispatchPallet(palletId: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/dispatch', { pallet_id: palletId });
    return response.data;
  },

  async getOverduePallets(): Promise<Pallet[]> {
    const response = await api.get<Pallet[]>('/pallets/overdue/list');
    return response.data;
  },

  async qcApprovePallet(palletId: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/qc-approve', { pallet_id: palletId });
    return response.data;
  },

  async qcRejectPallet(palletId: string, reason: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/qc-reject', { pallet_id: palletId, reason });
    return response.data;
  },

  async qcHoldPallet(palletId: string, reason: string): Promise<Pallet> {
    const response = await api.post<Pallet>('/pallets/qc-hold', { pallet_id: palletId, reason });
    return response.data;
  },
};
