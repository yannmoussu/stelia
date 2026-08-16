import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, User, Plus } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-brand-blue tracking-tight">DiagFlow</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-brand-blue transition-colors flex items-center gap-2">
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/audit/new" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors">
          <Plus size={16} />
          Nouvel audit
        </Link>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-300 transition-colors">
          <User size={18} />
        </div>
      </div>
    </nav>
  );
};
