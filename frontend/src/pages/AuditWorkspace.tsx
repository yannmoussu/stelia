import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { RecorderPanel } from '../components/recorder/RecorderPanel';
import { TranscriptBox } from '../components/recorder/TranscriptBox';
import { BuildingPanel } from '../components/building/BuildingPanel';
import { MOCK_BUILDING_DATA } from '../data/mockAudits';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuditWorkspace: React.FC = () => {
  const demoTranscript = "Mur nord en brique creuse de 20 centimètres, isolation inconnue. Fenêtre PVC double vitrage dans le salon, environ 1 mètre 20 sur 1 mètre 35. Chaudière gaz à condensation installée en 2019.";

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
            title="Audit — 8 avenue de la République"
            subtitle="Saisie des observations et extraction des données du bâtiment."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Observations
              </h2>
              <div className="flex flex-col gap-6">
                <RecorderPanel />
                <TranscriptBox text={demoTranscript} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Données du bâtiment</h2>
              <BuildingPanel data={MOCK_BUILDING_DATA} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
