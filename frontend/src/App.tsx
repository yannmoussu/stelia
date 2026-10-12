import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/context';
import { Dashboard } from './pages/Dashboard';
import { ConsultationWorkspace } from './pages/ConsultationWorkspace';
import { NewConsultation } from './pages/NewConsultation';
import { Login } from './pages/Login';
import { Logout } from './pages/Logout';

function SessionLayout() { return <AuthProvider><SessionBoundary /></AuthProvider>; }
function SessionBoundary() {
  const { loading, error, retry } = useAuth();
  if (loading) return <main className="p-8" role="status">Vérification de la session…</main>;
  if (error) return <main className="p-8"><p role="alert">{error}</p><button type="button" onClick={retry} className="mt-4 text-brand-blue">Réessayer</button></main>;
  return <Outlet />;
}
function Protected() {
  const { session } = useAuth();
  const location = useLocation();
  return session ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
const appRoutes = [{
  element: <SessionLayout />,
  children: [
    { path: '/login', element: <Login /> },
    { path: '/logout', element: <Logout /> },
    { element: <Protected />, children: [
      { path: '/', element: <Dashboard /> },
      { path: '/consultation/new', element: <NewConsultation /> },
      { path: '/consultation/:id', element: <ConsultationWorkspace /> },
    ] },
    { path: '*', element: <main className="p-8"><h1>Page introuvable</h1><a href="/">Retour aux consultations</a></main> },
  ],
}];
const router = createBrowserRouter(appRoutes);
function App() { return <RouterProvider router={router} />; }
export default App;
