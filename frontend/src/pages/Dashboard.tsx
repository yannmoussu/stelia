import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { AuditList } from '../components/audit/AuditList';
import { MOCK_AUDITS } from '../data/mockAudits';
import { Plus } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <PageHeader
          title="Mes audits"
          subtitle="Centralisez vos observations et accélérez vos diagnostics."
        >
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors">
            <Plus size={18} />
            Nouvel audit
          </button>
        </PageHeader>

        <AuditList audits={MOCK_AUDITS} />
      </main>
    </div>
  );
};
