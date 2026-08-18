export type ConsultationStatus = "draft" | "in_progress" | "completed";

export interface Consultation {
  id: string;
  patientName: string;
  consultationDate: string;
  consultationType: string;
  status: ConsultationStatus;
  progress: number; // 0 to 100
  notes?: string;
  transcript?: string;
  report?: string;
}

export interface PatientData {
  patientName: string;
  consultationDate: string;
  consultationType: string;
}
