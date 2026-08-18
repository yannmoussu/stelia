import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { ConsultationList } from '../components/consultation/ConsultationList';
import { consultationService } from '../services/consultationService';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [consultations, setConsultations] = useState<any[]>([]);

  useEffect(() => {
    setConsultations(consultationService.getConsultations());
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <PageHeader
          title="Mes consultations"
          subtitle="Assistant de rédaction de comptes rendus pour orthoptistes."
        >
          <Link to="/consultation/new" className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors">
            <Plus size={18} />
            Nouvelle consultation
          </Link>
        </PageHeader>

        <ConsultationList consultations={consultations} />
      </main>
    </div>
  );
};
