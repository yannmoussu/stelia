import { MedicalReportSchema, type MedicalReport } from '@stelia/contracts';

const sectionLabels: Record<keyof MedicalReport, string> = {
  contexte: 'Contexte de la consultation', bilan_sensoriel: 'Bilan sensoriel', bilan_optomoteur: 'Bilan optomoteur', conclusion: 'Conclusion et suivi',
};
const labels: Record<string, string> = {
  motif_demande: 'Motif de la demande', suivi_ophtalmologique: 'Suivi ophtalmologique', correction_visuelle: 'Correction visuelle', signes_fonctionnels: 'Signes fonctionnels',
  'acuite_visuelle.vision_lointaine.od': 'Acuité visuelle de loin — œil droit', 'acuite_visuelle.vision_lointaine.og': 'Acuité visuelle de loin — œil gauche',
  'acuite_visuelle.vision_proche.od': 'Acuité visuelle de près — œil droit', 'acuite_visuelle.vision_proche.og': 'Acuité visuelle de près — œil gauche', 'acuite_visuelle.correction': 'Correction utilisée pour l’acuité',
  'capacites_fusionnelles.convergence': 'Convergence', 'capacites_fusionnelles.divergence': 'Divergence', 'capacites_fusionnelles.convergence_proche': 'Convergence de près', 'capacites_fusionnelles.divergence_proche': 'Divergence de près', 'capacites_fusionnelles.valeur_brute': 'Capacités fusionnelles — observation brute',
  acuite_stereoscopique: 'Acuité stéréoscopique', conclusion: 'Conclusion du bilan', 'parallellisme.pres': 'Parallélisme de près', 'parallellisme.loin': 'Parallélisme de loin',
  'mesure_angle_prismes.vision_proche': 'Angle aux prismes de près', 'mesure_angle_prismes.vision_lointaine': 'Angle aux prismes de loin', 'mesure_angle_prismes.valeur_brute': 'Angle aux prismes — observation brute',
  motilite: 'Motilité', 'motricite_conjuguee.fixation': 'Fixation', 'motricite_conjuguee.poursuite': 'Poursuite', 'motricite_conjuguee.saccades': 'Saccades', ppc: 'Punctum proximum de convergence',
  synthese_clinique: 'Synthèse clinique', prise_en_charge: 'Prise en charge', recommandations: 'Recommandations', suivi: 'Suivi proposé',
};
interface Field { path: string[]; value: string | null; }
function fields(value: unknown, path: string[] = []): Field[] {
  if (value === null || typeof value === 'string') return [{ path, value }];
  if (typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, nested]) => fields(nested, [...path, key]));
}
function setValue(value: unknown, path: string[], next: string | null): unknown {
  if (path.length === 0) return next;
  if (typeof value !== 'object' || value === null) return value;
  const record = value as Record<string, unknown>;
  return { ...record, [path[0]!]: setValue(record[path[0]!], path.slice(1), next) };
}
interface Props { data: MedicalReport; onChange?: (data: MedicalReport) => void; disabled?: boolean; idPrefix: string; }
export function MedicalReportEditor({ data, onChange, disabled, idPrefix }: Props) {
  return <div className="space-y-5">{Object.entries(sectionLabels).map(([section, label]) => {
    const key = section as keyof MedicalReport;
    return <details key={section} open={section === 'conclusion'} className="border border-gray-200 rounded-md p-3">
      <summary className="font-semibold cursor-pointer text-gray-800">{label}</summary>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">{fields(data[key]).map((field) => {
        const fullPath = [section, ...field.path];
        const id = `${idPrefix}-${fullPath.join('-')}`;
        const fieldLabel = labels[field.path.join('.')] || field.path.join(' ');
        return <div key={id} className="flex flex-col gap-1"><label htmlFor={id} className="text-xs font-medium text-gray-600">{fieldLabel}</label>
          {onChange ? <textarea id={id} value={field.value || ''} maxLength={4000} disabled={disabled} onChange={(event) => onChange(MedicalReportSchema.parse(setValue(data, fullPath, event.target.value || null)))} rows={2} placeholder="Non renseigné" className="border border-gray-300 rounded px-2 py-1 text-sm" /> : <p id={id} className="text-sm whitespace-pre-wrap">{field.value || 'Non renseigné'}</p>}
        </div>;
      })}</div>
    </details>;
  })}</div>;
}
