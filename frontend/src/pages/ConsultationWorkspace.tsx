import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { RecorderPanel } from '../components/recorder/RecorderPanel';
import { PatientPanel } from '../components/consultation/PatientPanel';
import { ArrowLeft, Activity } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { consultationService } from '../services/consultationService';
import type { Consultation } from '../types/consultation';

export const ConsultationWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        if (!id) {
          console.error("[ConsultationWorkspace] No consultation ID provided in URL");
          setConsultation(null);
        } else {
          const foundConsultation = consultationService.getConsultation(id);
          setConsultation(foundConsultation);
        }
      } catch (error) {
        console.error("[ConsultationWorkspace] Error fetching consultation:", error);
        setConsultation(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultation();
  }, [id]);

  const handleTranscriptUpdate = useCallback((newTranscript: string) => {
    if (!id) return;

    setConsultation(prev => prev ? { ...prev, transcript: newTranscript } : null);
    consultationService.updateConsultation(id, { transcript: newTranscript });
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>;
  }

  if (!consultation) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Consultation introuvable</h1>
          <p className="text-gray-500 mb-6">Désolé, nous n'avons pas trouvé la consultation correspondant à cet identifiant.</p>
          <Link
            to="/"
            className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors"
          >
            Retour au dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Retour au dashboard
          </Link>
          <PageHeader
            title={`Consultation — ${consultation.patientName}`}
            subtitle={`Saisie des observations et rédaction du compte rendu. (${consultation.consultationType})`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Observations vocales
              </h2>
              <div className="flex flex-col gap-6">
                <RecorderPanel
                  initialTranscript={consultation.transcript}
                  onTranscriptUpdate={handleTranscriptUpdate}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Informations Patient</h2>
              <PatientPanel consultation={consultation} />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm border-dashed border-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Compte Rendu Médical</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="p-3 bg-gray-50 rounded-full text-gray-400">
                  <Activity size={32} />
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Le compte rendu sera généré ici.</p>
                  <p className="text-sm text-gray-400 mt-1">Utilisez la dictée vocale pour collecter les observations.</p>
                </div>
                <button
                  disabled
                  className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-md cursor-not-allowed"
                >
                  Générer le compte rendu
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
