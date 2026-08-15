import React from 'react';
import { Link } from 'react-router-dom';
import type { Audit, AuditStatus } from '../../types/audit';
import { ChevronRight, FileText } from 'lucide-react';

interface AuditCardProps {
  audit: Audit;
}

const statusStyles: Record<AuditStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-50 text-blue-600 border-blue-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
};

export const AuditCard: React.FC<AuditCardProps> = ({ audit }) => {
  return (
    <Link
      to={`/audit/${audit.id === '2' ? 'demo' : audit.id}`}
      className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-brand-blue hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="p-2 bg-gray-50 rounded text-gray-400 group-hover:text-brand-blue transition-colors">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">
              {audit.address}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              <span>{audit.propertyType}</span>
              <span>•</span>
              <span>{audit.surfaceM2} m²</span>
              <span>•</span>
              <span>{new Date(audit.date).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${statusStyles[audit.status]}`}>
            {audit.status === 'draft' ? 'Brouillon' : audit.status === 'in_progress' ? 'En cours' : 'Terminé'}
          </span>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
        </div>
      </div>
    </Link>
  );
};
