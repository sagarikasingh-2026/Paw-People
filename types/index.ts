export type PatientType = 'IPD' | 'Resident' | 'Visit' | 'House Visit'
export type DogStatus = 'Active' | 'Discharged'
export type TreatmentType = 'General' | 'Vaccination' | 'Deworming'
export type FollowUpType = 'Treatment' | 'Vaccination' | 'Deworming' | 'Vet Consult'
export type FollowUpStatus = 'Pending' | 'Done'

export interface Dog {
  id: string
  patient_id: string
  patient_type: PatientType
  name: string
  guardian_name: string | null
  guardian_contact: string | null
  current_treatment: string | null
  status: DogStatus
  created_at: string
  updated_at: string
}

export interface Medicine {
  id: string
  name: string
  composition: string | null
  power_mg: string | null
  quantity_in_stock: number
  cost_per_unit: number | null
  low_stock_threshold: number
  issued_by: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentLog {
  id: string
  dog_id: string
  medicine_id: string | null
  date: string
  treatment_type: TreatmentType
  mg: string | null
  quantity_used: number | null
  cost: number | null
  notes: string | null
  logged_by: string | null
  created_at: string
  dog?: Dog
  medicine?: Medicine
}

export interface FollowUp {
  id: string
  dog_id: string
  follow_up_type: FollowUpType
  due_date: string
  status: FollowUpStatus
  notes: string | null
  created_at: string
  updated_at: string
  dog?: Dog
}

export interface Diagnostic {
  id: string
  dog_id: string
  diagnostic_type: string
  date: string
  notes: string | null
  created_at: string
}
