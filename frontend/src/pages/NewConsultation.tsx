import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { ConsultationForm } from '../components/consultation/ConsultationForm';
import { consultationService } from '../services/consultationService';
import { ApiError } from '../services/http';
import { SessionRecovery } from '../auth/SessionRecovery';
import { useAuth } from '../auth/context';
import type { CreateConsultationInput } from '@stelia/contracts';

export function NewConsultation() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [initialUsername] = useState(() => session!.user.username);
  const [needsLogin, setNeedsLogin] = useState(false);
  const create = async (data: CreateConsultationInput) => {
    try {
      const consultation = await consultationService.createConsultation(data);
      navigate(`/consultation/${consultation.id}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setNeedsLogin(true);
      throw cause;
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-gray-50"><Navbar /><main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <Link to="/" className="inline-flex text-sm text-gray-500 hover:text-brand-blue mb-4">Retour aux consultations</Link>
      <PageHeader title="Nouvelle consultation" subtitle="Renseignez les informations du patient pour débuter la séance." />
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"><ConsultationForm onSubmit={create} /></div>
      {needsLogin && <SessionRecovery username={initialUsername} onSuccess={() => setNeedsLogin(false)} />}
    </main></div>
  );
}
