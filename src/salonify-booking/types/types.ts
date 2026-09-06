export interface SalonTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  text: string;
  background: string;
  buttonText: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SalonBookingProps {
  companyId: string;
  supabaseConfig: SupabaseConfig;
  theme?: SalonTheme;
  maxDate?: Date;
  shouldShowStaff?: boolean;
  initialStaffIds?: string[];
  initialStaffSlugs?: string[];
  /** Pinned location UUID. Wins over locationSlug. */
  locationId?: string;
  /** Pinned location slug, resolved against public.location for this company. */
  locationSlug?: string;
}

export interface LocationOption {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
  is_primary?: boolean;
}

export interface TimeSlot {
  time: string;
  selected: boolean;
  staffId?: string;
  startTime?: string;
  endTime?: string;
  availableStart?: string;
  availableEnd?: string;
  segments?: SlotSegment[];
}

export interface SlotSegment {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  startsAt?: string;
  endsAt?: string;
}

export interface DayAvailability {
  date: Date;
  slots: number;
  available: boolean;
}

export type ApiTimeSlot = {
  staff_id: string;
  first_name: string;
  last_name: string;
  image_url?: string | null;
  image_path?: string | null;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
  segments?: Array<{
    service_id: string;
    service_variant_id: string;
    staff_id: string;
    starts_at?: string;
    ends_at?: string;
  }>;
};

export type ApiStaffMember = {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: ApiTimeSlot[];
};

export type ApiDayAvailability = {
  dayName: string;
  staff?: {
    [staffId: string]: ApiStaffMember;
  };
  /** Appointment-level slots when staff is already chosen per service. */
  slots?: ApiTimeSlot[];
};

export type Availabilities = {
  dates: {
    [key: string]: ApiDayAvailability;
  };
};

export type PhaseType = "busy" | "free" | "buffer";

export interface ServiceVariantPhase {
  sequence: number;
  phase_type: PhaseType;
  duration_minutes: number;
  label?: string | null;
}

export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  max_price?: number | null;
  client_duration_minutes: number;
  staff_duration_minutes?: number | null;
  image_path?: string | null;
  display_order?: number;
  phases?: ServiceVariantPhase[];
  /** Variant-level staff eligibility override (from staff_service_variant). */
  staff_ids?: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  display_order?: number | null;
  service_variant: ServiceVariant[];
  /** Service-level staff eligibility (from staff_service). */
  staff_ids?: string[];
}

export interface SelectedService {
  service: Service;
  variant: ServiceVariant;
  staffId: string | null;
}

export interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  image_path: string | null;
  slug: string | null;
}

export interface BookingData {
  date: Date;
  timeSlot: string;
  staffName: string;
  services: SelectedService[];
  totalPrice: number;
  referralApplied?: boolean;
  locationName?: string;
  locationAddress?: string;
}

export const defaultTheme: SalonTheme = {
  primary: "#FF6B9D",
  primaryHover: "#E91E63",
  primaryLight: "#FFB3D1",
  secondary: "#FFF0F5",
  text: "#1F2937",
  background: "#FEFEFE",
  buttonText: "red",
};
