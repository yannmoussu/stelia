import React from 'react';

interface PropertyInformationProps {
  values: {
    address: string;
    addressComplement?: string;
    postalCode: string;
    city: string;
    propertyType: string;
    surfaceM2: string; // kept as string for input
    constructionYear?: string;
  };
  errors: {
    address?: string;
    postalCode?: string;
    city?: string;
    propertyType?: string;
    surfaceM2?: string;
  };
  onChange: (name: string, value: string) => void;
}

export const PropertyInformation: React.FC<PropertyInformationProps> = ({ values, errors, onChange }) => {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-md font-semibold text-gray-900 border-b border-gray-100 pb-2">Informations du bien</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Adresse *</label>
          <input
            type="text"
            value={values.address}
            onChange={(e) => onChange('address', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.address ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="ex: 12 rue des Lilas"
          />
          {errors.address && <span className="text-xs text-red-500">{errors.address}</span>}
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Complément d'adresse</label>
          <input
            type="text"
            value={values.addressComplement || ''}
            onChange={(e) => onChange('addressComplement', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors"
            placeholder="Appartement 4, 2ème étage"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Code postal *</label>
          <input
            type="text"
            value={values.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.postalCode ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="75000"
          />
          {errors.postalCode && <span className="text-xs text-red-500">{errors.postalCode}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Ville *</label>
          <input
            type="text"
            value={values.city}
            onChange={(e) => onChange('city', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.city ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="Paris"
          />
          {errors.city && <span className="text-xs text-red-500">{errors.city}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Type de bien *</label>
          <select
            value={values.propertyType}
            onChange={(e) => onChange('propertyType', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.propertyType ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
          >
            <option value="">Sélectionnez...</option>
            <option value="Appartement">Appartement</option>
            <option value="Maison">Maison</option>
            <option value="Autre">Autre</option>
          </select>
          {errors.propertyType && <span className="text-xs text-red-500">{errors.propertyType}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Surface habitable (m²) *</label>
          <input
            type="number"
            value={values.surfaceM2}
            onChange={(e) => onChange('surfaceM2', e.target.value)}
            className={`px-3 py-2 border rounded-md outline-none transition-colors ${errors.surfaceM2 ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-brand-blue'}`}
            placeholder="0"
          />
          {errors.surfaceM2 && <span className="text-xs text-red-500">{errors.surfaceM2}</span>}
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Année de construction</label>
          <input
            type="number"
            value={values.constructionYear || ''}
            onChange={(e) => onChange('constructionYear', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-brand-blue transition-colors"
            placeholder="1980"
          />
        </div>
      </div>
    </div>
  );
};
