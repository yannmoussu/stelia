import { patientDisplayName, CONSULTATION_TYPE_LABELS, type Consultation } from '@stelia/contracts';
export function PatientPanel({ consultation }: { consultation: Consultation }) {
  return <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div><dt className="text-gray-500">Patient</dt><dd className="font-medium">{patientDisplayName(consultation.patient)}</dd></div>
    <div><dt className="text-gray-500">Date de naissance</dt><dd>{consultation.patient.date_naissance || 'Non renseignée'}</dd></div>
    <div><dt className="text-gray-500">Date de consultation</dt><dd>{consultation.consultationDate}</dd></div>
    <div><dt className="text-gray-500">Type de séance</dt><dd>{CONSULTATION_TYPE_LABELS[consultation.consultationType]}</dd></div>
    {consultation.notes && <div className="md:col-span-2"><dt className="text-gray-500">Notes initiales</dt><dd className="whitespace-pre-wrap">{consultation.notes}</dd></div>}
  </dl>;
}
