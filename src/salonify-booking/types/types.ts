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
}

export interface TimeSlot {
  time: string;
  selected: boolean;
  staffId?: string;
  startTime?: string;
  endTime?: string;
  availableStart?: string;
  availableEnd?: string;
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
  image_url: string | null;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
};

export type ApiStaffMember = {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: ApiTimeSlot[];
};

export type ApiDayAvailability = {
  dayName: string;
  staff: {
    [staffId: string]: ApiStaffMember;
  };
};

export type Availabilities = {
  dates: {
    [key: string]: ApiDayAvailability;
  };
};

export interface PriceOption {
  id: string;
  name: string;
  price: number;
  max_price?: number | null;
  duration_in_minutes: number;
  image_path?: string | null;
  order?: number;
}

export interface Treatment {
  id: string;
  name: string;
  description: string;
  price_option: PriceOption[];
}

export interface SelectedTreatment {
  treatment: Treatment;
  option: PriceOption;
}

export interface BookingData {
  date: Date;
  timeSlot: string;
  staffName: string;
  treatments: SelectedTreatment[];
  totalPrice: number;
  referralApplied?: boolean;
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

