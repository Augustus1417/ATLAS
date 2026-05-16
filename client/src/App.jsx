import { BrowserRouter as Router, Link, Routes, Route, useLocation } from 'react-router-dom';
import BuilderPage from './features/builder/BuilderPage';
import Home from './pages/Home';
import AIWizard from './pages/AIWizard';
import PartsDatabase from './pages/PartsDatabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CoreModule from './pages/CoreModule';
import ModelPreview from './pages/ModelPreview';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
        <Route path="/auth" element={<AuthPage mode={authMode} />} />
        <Route path="/wizard" element={<AIWizard />} />
        <Route path="/parts" element={<PartsDatabase />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/builder" 
          element={<ProtectedRoute><BuilderPage /></ProtectedRoute>} 
        />
        <Route 
          path="/core" 
          element={<ProtectedRoute><CoreModule /></ProtectedRoute>} 
        />
        <Route 
          path="/model-preview" 
          element={<ProtectedRoute><ModelPreview /></ProtectedRoute>} 
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
