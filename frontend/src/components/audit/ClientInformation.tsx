import React from 'react';

interface ClientInformationProps {
  values: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
  };
  errors: {
    clientName?: string;
  };
  onChange: (name: string, value: string) => void;
}

export const ClientInformation: React.FC<ClientInformationProps> = ({ values, errors, onChange }) => {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-md font-semibold text-gray-900 border-b border-gray-100 pb-2">Contact / Client</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Nom du client *</label>
          <input
            type="text"
            value={values.clientName}
            onChange={(e) => onChange('clientName', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.clientName ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="ex: M. Jean Dupont"
          />
          {errors.clientName && <span className="text-xs text-red-500">{errors.clientName}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={values.clientEmail}
            onChange={(e) => onChange('clientEmail', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors"
            placeholder="client@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Téléphone</label>
          <input
            type="tel"
            value={values.clientPhone}
            onChange={(e) => onChange('clientPhone', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors"
            placeholder="06 00 00 00 00"
          />
        </div>
      </div>
    </div>
  );
};
