import React from 'react';
import { User, Calendar, Activity } from 'lucide-react';
import type { Consultation } from '../../types/consultation';

interface PatientPanelProps {
  consultation: Consultation;
}

export const PatientPanel: React.FC<PatientPanelProps> = ({ consultation }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-brand-blue/10 rounded-full text-brand-blue">
          <User size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{consultation.patientName}</h3>
          <p className="text-sm text-gray-500">Dossier Patient</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <Calendar size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Date de consultation</p>
            <p className="text-sm font-medium text-gray-900">{consultation.consultationDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <Activity size={18} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Type de séance</p>
            <p className="text-sm font-medium text-gray-900">{consultation.consultationType}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
