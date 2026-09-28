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
    fetch(`${API_BASE}/colleges`)
      .then((res) => res.json())
      .then((data) => setColleges(data.colleges || []))
      .catch(() => setColleges([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('collegeBusToken', data.token);
      localStorage.setItem('collegeBusUser', JSON.stringify(data.user));
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="muted">Select your college and role</p>
        {error && <div className="notification" style={{ background: '#ffe7e7', borderColor: '#ffc2c2' }}>{error}</div>}
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
          <button className="btn btn-primary" type="submit">Register</button>
          <div className="muted">Already have an account? <Link to="/login">Login</Link></div>
        </form>
      </div>
    </div>
  );
}
