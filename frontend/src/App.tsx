import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { AuditWorkspace } from './pages/AuditWorkspace';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit/demo" element={<AuditWorkspace />} />
        {/* Fallback for other audits to demo for now */}
        <Route path="/audit/:id" element={<AuditWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
