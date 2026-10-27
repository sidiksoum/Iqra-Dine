import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './components/Home';
import Confidential from './components/Confidential';
import MentionsLegales from './components/MentionsLegales';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes Publiques avec Layout standard */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/confidential" element={<Confidential />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
          </Route>

          {/* Espace Administration */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;