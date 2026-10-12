import { useRef, useState, type FormEvent } from 'react';
import { CreateConsultationInputSchema, type CreateConsultationInput } from '@stelia/contracts';
import { ConsultationInformation, type ConsultationFormValues } from './ConsultationInformation';
import { errorMessage } from '../../services/http';

interface ConsultationFormProps { onSubmit: (values: CreateConsultationInput) => Promise<void>; }
const today = () => new Date().toLocaleDateString('sv-SE');

export function ConsultationForm({ onSubmit }: ConsultationFormProps) {
  const [values, setValues] = useState<ConsultationFormValues>({ nom: '', prenom: '', date_naissance: '', consultationDate: today(), consultationType: '', notes: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ConsultationFormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const change = (name: keyof ConsultationFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const result = CreateConsultationInputSchema.safeParse({
      patient: { nom: values.nom, prenom: values.prenom.trim() || null, date_naissance: values.date_naissance || null },
      consultationDate: values.consultationDate,
      consultationType: values.consultationType,
      notes: values.notes,
    });
    if (!result.success) {
      const next: Partial<Record<keyof ConsultationFormValues, string>> = {};
      for (const issue of result.error.issues) {
        const path = String(issue.path[0] === 'patient' ? issue.path[1] : issue.path[0]);
        if (path in values) next[path as keyof ConsultationFormValues] = issue.message;
      }
      setErrors(next);
      return;
    }
    submitting.current = true;
    setPending(true);
    setSubmitError(null);
    try { await onSubmit(result.data); }
    catch (cause) { setSubmitError(errorMessage(cause)); }
    finally { submitting.current = false; setPending(false); }
  };
  return (
    <form onSubmit={(event) => { void submit(event); }} className="flex flex-col gap-8">
      <ConsultationInformation values={values} errors={errors} onChange={change} disabled={pending} />
      {submitError && <p role="alert" className="text-red-600">{submitError}</p>}
      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button type="submit" disabled={pending} className="px-6 py-2.5 bg-brand-blue text-white font-medium rounded-md hover:bg-brand-blue-dark disabled:opacity-50">{pending ? 'Création…' : 'Créer la consultation'}</button>
      </div>
    </form>
  );
}
