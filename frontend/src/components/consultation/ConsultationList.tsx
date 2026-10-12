import type { ConsultationSummary } from '@stelia/contracts';
import { ConsultationCard } from './ConsultationCard';
export function ConsultationList({ consultations }: { consultations: ConsultationSummary[] }) {
  return <div className="grid grid-cols-1 gap-3">{consultations.map((consultation) => <ConsultationCard key={consultation.id} consultation={consultation} />)}</div>;
}
