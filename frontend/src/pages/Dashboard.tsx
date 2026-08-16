import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { AuditList } from '../components/audit/AuditList';
import { auditService } from '../services/auditService';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [audits, setAudits] = useState<any[]>([]);

  useEffect(() => {
    setAudits(auditService.getAudits());
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <PageHeader
          title="Mes audits"
          subtitle="Centralisez vos observations et accélérez vos diagnostics."
        >
          <Link to="/audit/new" className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors">
            <Plus size={18} />
            Nouvel audit
          </Link>
        </PageHeader>

        <AuditList audits={audits} />
      </main>
    </div>
  );
};
