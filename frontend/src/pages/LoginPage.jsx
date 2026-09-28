import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../App.jsx';

const demoCredentials = {
  STUDENT: { email: 'asha@ctc.edu', password: 'student123' },
  DRIVER: { email: 'driver1@ctc.edu', password: 'driver123' },
  ADMIN: { email: 'principal@ctc.edu', password: 'admin123' },
};

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [form, setForm] = useState({ email: demoCredentials.STUDENT.email, password: demoCredentials.STUDENT.password });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setForm({
      email: demoCredentials[role].email,
      password: demoCredentials[role].password,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      onLogin(data);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>College Bus Tracking</h2>
        <p className="muted">Choose your login type</p>

        <div className="row" style={{ marginBottom: '18px' }}>
          {['STUDENT', 'DRIVER', 'ADMIN'].map((role) => (
            <button
              key={role}
              type="button"
              className={`btn ${selectedRole === role ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleRoleChange(role)}
              style={{ flex: 1, minWidth: '110px' }}
            >
              {role === 'STUDENT' ? 'Student Login' : role === 'DRIVER' ? 'Driver Login' : 'Admin Login'}
            </button>
          ))}
        </div>

        {error && <div className="notification" style={{ background: '#ffe7e7', borderColor: '#ffc2c2' }}>{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@college.edu" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Logging in...' : `${selectedRole === 'STUDENT' ? 'Student' : selectedRole === 'DRIVER' ? 'Driver' : 'Admin'} Login`}</button>
          <div className="muted">Demo credentials: {demoCredentials[selectedRole].email} / {demoCredentials[selectedRole].password}</div>
          <div className="muted">Need an account? <Link to="/register">Register here</Link></div>
        </form>
      </div>
    </div>
  );
}
