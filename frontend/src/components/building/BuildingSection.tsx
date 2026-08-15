import React from 'react';

interface BuildingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const BuildingSection: React.FC<BuildingSectionProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
};
