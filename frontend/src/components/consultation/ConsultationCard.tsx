import { Link } from 'react-router-dom';
import { CONSULTATION_TYPE_LABELS, patientDisplayName, type ConsultationSummary, type ConsultationStatus } from '@stelia/contracts';
import { ChevronRight, FileText } from 'lucide-react';
const styles: Record<ConsultationStatus, string> = { draft: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-50 text-blue-600', completed: 'bg-green-50 text-green-600' };
const labels: Record<ConsultationStatus, string> = { draft: 'Brouillon', in_progress: 'En cours', completed: 'Validé' };
export function ConsultationCard({ consultation }: { consultation: ConsultationSummary }) {
  return (
    <Link to={`/consultation/${consultation.id}`} className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-brand-blue transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4"><FileText size={20} className="text-gray-400" aria-hidden="true" /><div>
          <h2 className="font-semibold text-gray-900 group-hover:text-brand-blue">{patientDisplayName(consultation.patient)}</h2>
          <p className="mt-1 text-sm text-gray-500">{CONSULTATION_TYPE_LABELS[consultation.consultationType]} · {new Date(`${consultation.consultationDate}T12:00:00`).toLocaleDateString('fr-FR')}</p>
        </div></div>
        <div className="flex items-center gap-3"><span className={`px-2 py-0.5 text-xs rounded-full ${styles[consultation.status]}`}>{labels[consultation.status]}</span><ChevronRight size={18} className="text-gray-300" aria-hidden="true" /></div>
      </div>
    </Link>
  );
}
