import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { RecorderPanel } from '../components/recorder/RecorderPanel';
import { BuildingPanel } from '../components/building/BuildingPanel';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { auditService } from '../services/auditService';
import type { Audit } from '../types/audit';

export const AuditWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        if (!id) {
          console.error("[AuditWorkspace] No audit ID provided in URL");
          setAudit(null);
        } else {
          const foundAudit = auditService.getAudit(id);
          setAudit(foundAudit);
        }
      } catch (error) {
        console.error("[AuditWorkspace] Error fetching audit:", error);
        setAudit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>;
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Audit introuvable</h1>
          <p className="text-gray-500 mb-6">Désolé, nous n'avons pas trouvé l'audit correspondant à cet identifiant.</p>
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

  const handleTranscriptUpdate = (newTranscript: string) => {
    if (!audit) return;

    setAudit(prev => prev ? { ...prev, transcript: newTranscript } : null);
    auditService.updateAudit(audit.id, { transcript: newTranscript });
  };

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
            title={`Audit — ${audit.address}`}
            subtitle={`Saisie des observations et extraction des données du bâtiment. (${audit.diagnosticType})`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Observations
              </h2>
              <div className="flex flex-col gap-6">
                <RecorderPanel
                  initialTranscript={audit.transcript}
                  onTranscriptUpdate={handleTranscriptUpdate}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Données du bâtiment</h2>
              <BuildingPanel data={{
                propertyType: audit.propertyType,
                surfaceM2: audit.surfaceM2,
                constructionYear: audit.constructionYear,
                walls: [],
                windows: [],
                heating: null,
              }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
