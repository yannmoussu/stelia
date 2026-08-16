import React from 'react';

interface AuditInformationProps {
  values: {
    diagnosticType: string;
    notes: string;
  };
  errors: {
    diagnosticType?: string;
  };
  onChange: (name: string, value: string) => void;
}

export const AuditInformation: React.FC<AuditInformationProps> = ({ values, errors, onChange }) => {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-md font-semibold text-gray-900 border-b border-gray-100 pb-2">Informations sur l'audit</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Type de diagnostic *</label>
          <select
            value={values.diagnosticType}
            onChange={(e) => onChange('diagnosticType', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.diagnosticType ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
          >
            <option value="">Sélectionnez...</option>
            <option value="DPE">DPE</option>
            <option value="Audit Énergétique">Audit Énergétique</option>
          </select>
          {errors.diagnosticType && <span className="text-xs text-red-500">{errors.diagnosticType}</span>}
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Commentaires ou notes initiales</label>
          <textarea
            value={values.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors h-24 resize-none"
            placeholder="Notes particulières sur le bien..."
          />
        </div>
      </div>
    </div>
  );
};
