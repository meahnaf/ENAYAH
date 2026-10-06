export enum UserRole {
  ADMIN = "ADMIN",
  WAREHOUSE = "WAREHOUSE",
  FORKLIFT = "FORKLIFT",
  QC = "QC",
  SUPERVISOR = "SUPERVISOR"
}

export enum LoadType {
  STORAGE = "STORAGE",
  DIRECT_OUT = "DIRECT_OUT"
}

export enum PalletStatus {
  RECEIVED = "RECEIVED",
  SCANNED = "SCANNED",
  WRAPPED = "WRAPPED",
  READY_FOR_PUTAWAY = "READY_FOR_PUTAWAY",
  IN_RACK_HOLD = "IN_RACK_HOLD",
  RELEASE_ELIGIBLE = "RELEASE_ELIGIBLE",
  RELEASED = "RELEASED",
  DISPATCH_READY = "DISPATCH_READY",
  DISPATCHED = "DISPATCHED",
  QC_HOLD = "QC_HOLD",
  QUARANTINE = "QUARANTINE",
  CANCELLED = "CANCELLED"
}

export interface User {
  id: number;
  employee_id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  product_code: string;
  product_name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface Location {
  id: number;
  location_code: string;
  zone?: string;
  rack?: string;
  level?: string;
  position?: string;
  location_type: string;
  qr_code_value?: string;
  active: boolean;
  occupied: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Pallet {
  id: number;
  pallet_id: string;
  load_number?: string;
  product_id?: number;
  batch_number?: string;
  quantity?: number;
  load_type: LoadType;
  production_datetime?: string;
  received_datetime?: string;
  wrapped_datetime?: string;
  ready_for_putaway_datetime?: string;
  putaway_datetime?: string;
  expected_release_datetime?: string;
  actual_release_datetime?: string;
  dispatched_datetime?: string;
  status: PalletStatus;
  hold_reason?: string;
  hold_reason_details?: string;
  current_location_id?: number;
  assigned_location_id?: number;
  created_by?: number;
  released_by?: number;
  dispatched_by?: number;
  created_at: string;
  updated_at?: string;
  product?: Product;
  current_location?: Location;
  assigned_location?: Location;
}

export interface Transaction {
  id: number;
  pallet_id: number;
  user_id: number;
  action: string;
  timestamp: string;
  from_location_id?: number;
  to_location_id?: number;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  notes?: string;
  metadata?: any;
}

export interface DashboardData {
  today: {
    received: number;
    wrapped: number;
    ready_for_putaway: number;
    put_away: number;
    released: number;
    direct_out: number;
    qc_pending: number;
    over_48_hours: number;
  };
  backlog: {
    unscanned: number;
    waiting_for_wrapping: number;
    ready_for_putaway: number;
    qc_pending: number;
    overdue_hold: number;
    quarantine: number;
  };
}
