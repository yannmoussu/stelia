export type AuditStatus = "draft" | "in_progress" | "completed";

export interface Audit {
  id: string;
  address: string;
  propertyType: string;
  surfaceM2: number;
  date: string;
  status: AuditStatus;
  progress: number; // 0 to 100
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
