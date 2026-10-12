import { Link } from 'react-router-dom';
import { LayoutDashboard, Plus } from 'lucide-react';
import { useAuth } from '../../auth/context';

export function Navbar() {
  const { session } = useAuth();
  return (
    <nav aria-label="Navigation principale" className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-50 gap-4">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-bold text-brand-blue tracking-tight">Stelia</Link>
        <Link to="/" className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-blue"><LayoutDashboard size={18} aria-hidden="true" />Consultations</Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/consultation/new" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white font-medium rounded-md"><Plus size={16} aria-hidden="true" />Nouvelle consultation</Link>
        <span className="hidden md:inline text-gray-500">{session?.user.username}</span>
        <Link to="/logout" className="text-gray-600 hover:text-brand-blue">Se déconnecter</Link>
      </div>
    </nav>
  );
}
