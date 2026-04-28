export type UserRole = "admin" | "care_manager" | "patient";

// ============= API Response Types (match exact API schemas from Excel) =============

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  email_verified_at: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  role?: { id: number; name: string; description: string | null };
}

export interface Patient {
  id: number;
  user_id: string;
  patient_photo: string | null;
  aadhaar_no: string;
  aadhaar_photo: string | null;
  pan_no: string;
  pan_photo: string | null;
  full_name: string;
  dob: string;
  age: string;
  gender: string;
  blood_group: string;
  address: string;
  landmark: string;
  primary_language: string;
  primary_diagnosis: string;
  secondary_diagnosis: string;
  allergies: string;
  current_medications: string;
  treating_doctor_name: string;
  preferred_hospital: string;
  past_surgeries: string;
  mobility_status: string;
  fall_risk_level: string;
  mental_health_status: string;
  baseline_bp: string;
  baseline_sugar: string;
  baseline_spo2: string;
  weight: string;
  height: string;
  risk_category: string;
  insurance_policy_name: string;
  insurance_policy_number: string;
  insurance_policy_photo: string | null;
  risk_score: string;
  last_visit_date: string;
  care_manager_id: string;
  created_at: string;
  updated_at: string;
  user?: ApiUser;
}

export interface CareManager {
  id: number;
  user_id: string;
  name: string;
  care_manager_photo: string | null;
  aadhaar_no: string;
  aadhaar_photo: string | null;
  pan_no: string;
  pan_photo: string | null;
  qualification: string;
  registration_number: string;
  years_of_experience: string;
  languages_known: string;
  cpr_certified: string;
  assigned_zone: string;
  availability_type: string;
  police_verification_status: string;
  background_verification_status: string;
  supervisor_id: string;
  region: string;
  created_at: string;
  updated_at: string;
  user?: ApiUser;
}

export interface Relative {
  id: number;
  user_id: string;
  patient_id: string;
  relative_name: string;
  relative_photo: string | null;
  aadhaar_no: string;
  aadhaar_photo: string | null;
  pan_no: string;
  pan_photo: string | null;
  relationship: string;
  location_type: string;
  country: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  preferred_update_mode: string;
  secondary_escalation_contact: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  user?: ApiUser;
}

export interface CareVisit {
  id: number;
  patient_id: string;
  care_manager_id: string;
  visit_type: string;
  notes: string;
  visit_time: string;
  visit_photo: string | null;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  patient_id: string;
  care_manager_id: string;
  due_date: string;
  priority: string;
  status: string;
  remark: string;
  category?: string;
  relative_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VitalRecord {
  id: number;
  patient_id: string;
  recorded_by: string;
  care_visits_id: string;
  bp: string;
  heart_rate: string;
  sugar_level: string;
  temperature: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyAlert {
  id: number;
  patient_id: string;
  triggered_by: string;
  latitude: string;
  longitude: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyAction {
  id: number;
  emergency_id: string;
  care_manager_id: string;
  action_taken: string;
  action_time: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: number;
  name: string;
  relation: string;
  phone: string;
  email: string;
  address: string;
  patient_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  vendor_name: string;
  mobile: string;
  email: string;
  address: string;
  latitude?: string;
  longitude?: string;
  company_name: string;
  vendor_photo: string | null;
  adhar_no: string;
  adhar_photo: string | null;
  pan_no: string;
  pan_photo: string | null;
  type: string;
  coverage_area: string;
  avg_response_time: string;
  availability_24_7: string;
  oxygen_support: string;
  ventilator_available: string;
  rate_card: string;
  agreement_status: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: number;
  patient_id: string;
  service_id: string;
  requested_by: string;
  assigned_to: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CarePlan {
  id: number;
  patient_id: string;
  plan_type: string;
  notes: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface SeniorAssignment {
  id: number;
  patient_id: string;
  care_manager_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: number;
  patient_id: string;
  record_type: string;
  file_path: string;
  notes: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationReminder {
  id: number;
  patient_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  patient_id: string;
  amount: string;
  status: string;
  invoice_date: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReport {
  id: number;
  patient_id: string;
  care_manager_id: string;
  summary: string;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  event_name: string;
  event_date: string;
  event_time: string;
  location: string;
  description: string;
  banner_image: string | null;
  organizer_name: string;
  organizer_phone: string;
  status: string;
  meet_link: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  quote: string;
  type: string;
  said_by: string;
  created_at: string;
  updated_at: string;
}
