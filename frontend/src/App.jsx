import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const API_BASE = 'http://localhost:5000/api';

const getStoredUser = () => {
  try {
    const user = localStorage.getItem('collegeBusUser');
    const token = localStorage.getItem('collegeBusToken');
    return user && token ? { user: JSON.parse(user), token } : null;
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const session = getStoredUser();
  const role = session?.user?.role;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(() => getStoredUser());

  useEffect(() => {
    const onStorage = () => setSessionUser(getStoredUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = (response) => {
    localStorage.setItem('collegeBusToken', response.token);
    localStorage.setItem('collegeBusUser', JSON.stringify(response.user));
    setSessionUser({ user: response.user, token: response.token });
    const role = response.user.role;

    if (role === 'STUDENT') navigate('/student');
    else if (role === 'DRIVER') navigate('/driver');
    else if (role === 'ADMIN') navigate('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('collegeBusToken');
    localStorage.removeItem('collegeBusUser');
    setSessionUser(null);
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={sessionUser ? (sessionUser.user.role === 'STUDENT' ? '/student' : sessionUser.user.role === 'DRIVER' ? '/driver' : '/admin') : '/login'} replace />} />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverDashboard onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export { API_BASE, getStoredUser };
