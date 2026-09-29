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
  const [showPassword, setShowPassword] = useState(false);
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
        credentials: 'include',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLogin(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to connect to the server. Please check the backend and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-wrap">
          <div className="logo-mark">B</div>
          <div>
            <div className="eyebrow" style={{ color: '#6e7d96', margin: 0 }}>College</div>
            <strong>Bus Tracking</strong>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-subtitle">College Bus Tracking System</p>

        <div className="role-switcher">
          {['STUDENT', 'DRIVER', 'ADMIN'].map((role) => (
            <button
              key={role}
              type="button"
              className={selectedRole === role ? 'active' : ''}
              onClick={() => handleRoleChange(role)}
            >
              {role === 'STUDENT' ? 'Student' : role === 'DRIVER' ? 'Driver' : 'Admin'}
            </button>
          ))}
        </div>

        {error && <div className="notification" style={{ background: '#ffe7e7', borderColor: '#ffc2c2', padding: '12px 14px', borderRadius: '12px', marginBottom: '10px' }}>{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email / Mobile</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@college.edu" required />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="inline-row">
            <label className="checkbox-inline">
              <input type="checkbox" checked={showPassword} onChange={() => setShowPassword((value) => !value)} />
              Show password
            </label>
            <a href="#">Forgot Password?</a>
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Demo: {demoCredentials[selectedRole].email} / {demoCredentials[selectedRole].password}
          </div>
        </form>

        <div className="auth-links">
          Need an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
