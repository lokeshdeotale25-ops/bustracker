import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../App.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'STUDENT',
    collegeId: '',
    year: '',
    department: '',
    licenseNumber: '',
    designation: 'Principal',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const loadColleges = async () => {
      try {
        const response = await fetch(`${API_BASE}/colleges`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to fetch colleges');
        }

        setColleges(data.colleges || []);
      } catch (err) {
        console.error('College load failed:', err);
        setColleges([]);
      }
    };

    loadColleges();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.collegeId) {
      setError('Please select a college before registering.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          collegeId: Number(form.collegeId),
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          year: form.year.trim(),
          department: form.department.trim(),
          licenseNumber: form.licenseNumber.trim(),
          designation: form.designation.trim(),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('collegeBusToken', data.token);
      localStorage.setItem('collegeBusUser', JSON.stringify(data.user));
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Unable to connect to the server. Please try again.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-wrap">
          <div className="logo-mark">B</div>
          <div>
            <div className="eyebrow" style={{ color: '#6e7d96', margin: 0 }}>Create</div>
            <strong>Account</strong>
          </div>
        </div>

        <h2>Register</h2>
        <p className="auth-subtitle">Select your college and role</p>

        {error && <div className="notification" style={{ background: '#ffe7e7', borderColor: '#ffc2c2', padding: '12px 14px', borderRadius: '12px', marginBottom: '10px' }}>{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="field">
            <label>College</label>
            <select value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })} required>
              <option value="">Select college</option>
              {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="STUDENT">Student</option>
              <option value="DRIVER">Driver</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {form.role === 'STUDENT' && (
            <>
              <div className="field">
                <label>Year</label>
                <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="3rd Year" />
              </div>
              <div className="field">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="CSE" />
              </div>
            </>
          )}

          {form.role === 'DRIVER' && (
            <div className="field">
              <label>License Number</label>
              <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-XXXX" />
            </div>
          )}

          {form.role === 'ADMIN' && (
            <div className="field">
              <label>Designation</label>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Principal" />
            </div>
          )}

          <button className="primary-btn" type="submit">Register</button>

          <div className="auth-links">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
