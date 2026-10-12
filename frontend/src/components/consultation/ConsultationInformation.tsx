import { CONSULTATION_TYPE_LABELS } from '@stelia/contracts';

export interface ConsultationFormValues {
  nom: string;
  prenom: string;
  date_naissance: string;
  consultationDate: string;
  consultationType: string;
  notes: string;
}
interface ConsultationInformationProps {
  values: ConsultationFormValues;
  errors: Partial<Record<keyof ConsultationFormValues, string>>;
  onChange: (name: keyof ConsultationFormValues, value: string) => void;
  disabled: boolean;
}
export function ConsultationInformation({ values, errors, onChange, disabled }: ConsultationInformationProps) {
  const field = (key: keyof ConsultationFormValues, label: string, type = 'text', required = false) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`create-${key}`} className="text-sm font-medium text-gray-700">{label}{required ? ' *' : ''}</label>
      <input id={`create-${key}`} type={type} required={required} value={values[key]} onChange={(event) => onChange(key, event.target.value)} disabled={disabled} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} className="px-3 py-2 border border-gray-300 rounded-md focus:border-brand-blue outline-none" />
      {errors[key] && <p id={`error-${key}`} className="text-xs text-red-600">{errors[key]}</p>}
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Informations sur la consultation</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('nom', 'Nom du patient', 'text', true)}
        {field('prenom', 'Prénom du patient')}
        {field('date_naissance', 'Date de naissance', 'date')}
        {field('consultationDate', 'Date de consultation', 'date', true)}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="create-consultationType" className="text-sm font-medium text-gray-700">Type de consultation *</label>
          <select id="create-consultationType" required value={values.consultationType} onChange={(event) => onChange('consultationType', event.target.value)} disabled={disabled} aria-invalid={Boolean(errors.consultationType)} aria-describedby={errors.consultationType ? 'error-consultationType' : undefined} className="px-3 py-2 border border-gray-300 rounded-md focus:border-brand-blue outline-none">
            <option value="">Sélectionnez…</option>
            {Object.entries(CONSULTATION_TYPE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          {errors.consultationType && <p id="error-consultationType" className="text-xs text-red-600">{errors.consultationType}</p>}
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="create-notes" className="text-sm font-medium text-gray-700">Notes initiales</label>
          <textarea id="create-notes" value={values.notes} onChange={(event) => onChange('notes', event.target.value)} disabled={disabled} className="px-3 py-2 border border-gray-300 rounded-md focus:border-brand-blue outline-none h-24" />
        </div>
      </div>
    </div>
  );
}
