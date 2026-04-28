export type DriverStatus = 'available' | 'busy' | 'offline' | 'breakdown'
export type MotorcycleStatus = 'active' | 'maintenance' | 'inactive' | 'breakdown'
export type ServiceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type BreakdownStatus = 'reported' | 'in_repair' | 'resolved'

export interface Zone {
  id: string
  name: string
  description: string | null
  base_fare: number
  created_at: string
}

export interface MotorcycleType {
  id: number
  name: string
  description: string | null
}

export interface Motorcycle {
  id: string
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  motorcycle_type_id: number | null
  status: MotorcycleStatus
  created_at: string
  motorcycle_types?: MotorcycleType
}

export interface Driver {
  id: string
  name: string
  phone: string
  email: string | null
  zone_id: string | null
  password: string | null
  status: DriverStatus
  current_lat: number | null
  current_lng: number | null
  last_location_update: string | null
  created_at: string
  zones?: Zone
}

export interface ServiceRequest {
  id: string
  customer_name: string
  customer_phone: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_address: string | null
  requested_type_id: number | null
  zone_id: string | null
  status: ServiceStatus
  driver_id: string | null
  fare: number | null
  requested_at: string
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  motorcycle_types?: MotorcycleType
  drivers?: Driver
}

export interface RecurringService {
  id: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string | null
  zone_id: string | null
  requested_type_id: number | null
  fare: number | null
  scheduled_time: string
  schedule: Record<string, string> | null
  days_of_week: number[]
  driver_id: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  zones?: Zone
  motorcycle_types?: MotorcycleType
  drivers?: Driver
}

export interface DriverNotification {
  id: string
  driver_id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export interface RecurringServiceException {
  id: string
  recurring_service_id: string
  exception_date: string
  reason: string | null
  created_at: string
}

export interface BreakdownReport {
  id: string
  driver_id: string
  motorcycle_id: string
  service_request_id: string | null
  description: string | null
  location_lat: number | null
  location_lng: number | null
  status: BreakdownStatus
  reported_at: string
  resolved_at: string | null
  drivers?: Driver
  motorcycles?: Motorcycle
}
