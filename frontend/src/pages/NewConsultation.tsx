import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { ConsultationForm } from '../components/consultation/ConsultationForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { consultationService } from '../services/consultationService';

export const NewConsultation: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateConsultation = async (formData: any) => {
    try {
      const newConsultation = await consultationService.createConsultation(formData);
      navigate(`/consultation/${newConsultation.id}`);
    } catch (error) {
      console.error("Error creating consultation:", error);
      alert("Une erreur est survenue lors de la création de la consultation.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Retour aux consultations
          </Link>
          <PageHeader
            title="Nouvelle consultation"
            subtitle="Renseignez les informations du patient pour débuter la séance."
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <ConsultationForm onSubmit={handleCreateConsultation} />
        </div>
      </main>
    </div>
  );
};
