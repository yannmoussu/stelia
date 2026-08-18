import React, { useState, useMemo } from 'react';
import { ConsultationInformation } from './ConsultationInformation';

interface ConsultationFormProps {
  onSubmit: (values: any) => void;
}

export const ConsultationForm: React.FC<ConsultationFormProps> = ({ onSubmit }) => {
  const [values, setValues] = useState({
    patientName: '',
    consultationType: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (vals: typeof values) => {
    const newErrors: Record<string, string> = {};
    if (!vals.patientName) newErrors.patientName = 'Le nom du patient est obligatoire';
    if (!vals.consultationType) newErrors.consultationType = 'Le type de consultation est obligatoire';
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
      <ConsultationInformation
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
          Créer la consultation
        </button>
      </div>
    </form>
  );
};
