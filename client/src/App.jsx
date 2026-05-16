import { BrowserRouter as Router, Link, Routes, Route, useLocation } from 'react-router-dom';
import BuilderPage from './features/builder/BuilderPage';
import Home from './pages/Home';
import AIWizard from './pages/AIWizard';
import PartsDatabase from './pages/PartsDatabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CoreModule from './pages/CoreModule';
import ModelPreview from './pages/ModelPreview';
import './styles/home.css';
import './styles/wizard.css';
import './styles/parts-db.css';
import './styles/auth.css';

function AppRoutes() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const authMode = queryParams.get('mode') || 'login';
  return (
    <>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/core" element={<CoreModule />} />
        <Route path="/wizard" element={<AIWizard />} />
        <Route path="/parts" element={<PartsDatabase />} />
        <Route path="/auth" element={<AuthPage mode={authMode} />} />
        <Route path="/model-preview" element={<ModelPreview />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
