import React, { useState, useMemo } from 'react';
import { PropertyInformation } from './PropertyInformation';
import { AuditInformation } from './AuditInformation';
import { ClientInformation } from './ClientInformation';

interface AuditFormProps {
  onSubmit: (values: any) => void;
}

export const AuditForm: React.FC<AuditFormProps> = ({ onSubmit }) => {
  const [values, setValues] = useState({
    address: '',
    addressComplement: '',
    postalCode: '',
    city: '',
    propertyType: '',
    surfaceM2: '',
    constructionYear: '',
    diagnosticType: '',
    notes: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (vals: typeof values) => {
    const newErrors: Record<string, string> = {};
    if (!vals.address) newErrors.address = 'L\'adresse est obligatoire';
    if (!vals.postalCode) newErrors.postalCode = 'Le code postal est obligatoire';
    if (!vals.city) newErrors.city = 'La ville est obligatoire';
    if (!vals.propertyType) newErrors.propertyType = 'Le type de bien est obligatoire';
    if (!vals.surfaceM2 || Number(vals.surfaceM2) <= 0) newErrors.surfaceM2 = 'Une surface valide est obligatoire';
    if (!vals.diagnosticType) newErrors.diagnosticType = 'Le type de diagnostic est obligatoire';
    if (!vals.clientName) newErrors.clientName = 'Le nom du client est obligatoire';
    return newErrors;
  };

  const isValid = useMemo(() => {
    const errs = validate(values);
    return Object.keys(errs).length === 0;
  }, [values]);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <PropertyInformation
        values={values}
        errors={errors}
        onChange={handleChange}
      />
      <AuditInformation
        values={values}
        errors={errors}
        onChange={handleChange}
      />
      <ClientInformation
        values={values}
        errors={errors}
        onChange={handleChange}
      />

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={!isValid}
          className="px-6 py-2.5 bg-brand-blue text-white font-medium rounded-md hover:bg-brand-blue-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Créer l'audit
        </button>
      </div>
    </form>
  );
};
