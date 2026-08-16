import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { AuditForm } from '../components/audit/AuditForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auditService } from '../services/auditService';

export const NewAudit: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateAudit = (formData: any) => {
    const newAudit = auditService.createAudit(formData);
    navigate(`/audit/${newAudit.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Retour aux audits
          </Link>
          <PageHeader
            title="Nouvel audit"
            subtitle="Renseignez les informations du bien avant de commencer l'inspection."
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <AuditForm onSubmit={handleCreateAudit} />
        </div>
      </main>
    </div>
  );
};
