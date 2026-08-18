import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ConsultationWorkspace } from './pages/ConsultationWorkspace';
import { NewConsultation } from './pages/NewConsultation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/consultation/new" element={<NewConsultation />} />
        {/* The :id parameter handles both real IDs and the 'demo' ID */}
        <Route path="/consultation/:id" element={<ConsultationWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
