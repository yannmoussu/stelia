import React from 'react';

interface ConsultationInformationProps {
  values: {
    patientName: string;
    consultationType: string;
    notes: string;
  };
  errors: {
    patientName?: string;
    consultationType?: string;
  };
  onChange: (name: string, value: string) => void;
}

export const ConsultationInformation: React.FC<ConsultationInformationProps> = ({ values, errors, onChange }) => {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-md font-semibold text-gray-900 border-b border-gray-100 pb-2">Informations sur la consultation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du patient *</label>
          <input
            type="text"
            value={values.patientName}
            onChange={(e) => onChange('patientName', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.patientName ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="ex: Jean Dupont"
          />
          {errors.patientName && <span className="text-xs text-red-500">{errors.patientName}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Type de consultation *</label>
          <select
            value={values.consultationType}
            onChange={(e) => onChange('consultationType', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.consultationType ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
          >
            <option value="">Sélectionnez...</option>
            <option value="Bilan Orthoptique">Bilan Orthoptique</option>
            <option value="Consultation de suivi">Consultation de suivi</option>
            <option value="Urgence">Urgence</option>
          </select>
          {errors.consultationType && <span className="text-xs text-red-500">{errors.consultationType}</span>}
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Notes initiales</label>
          <textarea
            value={values.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors h-24 resize-none"
            placeholder="Observations préliminaires..."
          />
        </div>
      </div>
    </div>
  );
};
