import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { AuditWorkspace } from './pages/AuditWorkspace';
import { NewAudit } from './pages/NewAudit';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit/new" element={<NewAudit />} />
        {/* The :id parameter handles both real IDs and the 'demo' ID */}
        <Route path="/audit/:id" element={<AuditWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
