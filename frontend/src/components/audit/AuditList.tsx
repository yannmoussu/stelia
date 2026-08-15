import React from 'react';
import type { Audit } from '../../types/audit';
import { AuditCard } from './AuditCard';

interface AuditListProps {
  audits: Audit[];
}

export const AuditList: React.FC<AuditListProps> = ({ audits }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {audits.map((audit) => (
        <AuditCard key={audit.id} audit={audit} />
      ))}
    </div>
  );
};
