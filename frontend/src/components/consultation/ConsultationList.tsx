import React from 'react';
import type { Consultation } from '../../types/consultation';
import { ConsultationCard } from './ConsultationCard';

interface ConsultationListProps {
  consultations: Consultation[];
}

export const ConsultationList: React.FC<ConsultationListProps> = ({ consultations }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {consultations.map((consultation) => (
        <ConsultationCard key={consultation.id} consultation={consultation} />
      ))}
    </div>
  );
};
