export type AuditStatus = "draft" | "in_progress" | "completed";

export interface Audit {
  id: string;
  address: string;
  addressComplement?: string;
  postalCode: string;
  city: string;
  propertyType: string;
  surfaceM2: number;
  constructionYear?: number;
  date: string;
  status: AuditStatus;
  progress: number; // 0 to 100
  diagnosticType: 'DPE' | 'Audit Énergétique';
  notes?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  transcript?: string;
}

export interface Wall {
  id: string;
  orientation: string;
  material: string;
  thicknessCm?: number;
  insulation?: string;
}

export interface Window {
  id: string;
  room: string;
  material: string;
  glazing: string;
  widthCm?: number;
  heightCm?: number;
}

export interface HeatingSystem {
  id: string;
  type: string;
  energy: string;
  powerKw?: number;
  year?: number;
}

export interface BuildingData {
  propertyType: string;
  surfaceM2: number;
  constructionYear?: number;
  walls: Wall[];
  windows: Window[];
  heating: HeatingSystem | null;
}
