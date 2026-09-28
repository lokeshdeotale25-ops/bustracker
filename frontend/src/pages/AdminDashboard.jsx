import { useEffect, useState } from 'react';
import { API_BASE, getStoredUser } from '../App.jsx';
import AdminManagement from './AdminManagement.jsx';

export default function AdminDashboard({ onLogout }) {
  const session = getStoredUser();
  const [dashboard, setDashboard] = useState({ buses: [], routes: [], notifications: [], trips: [] });
  const [form, setForm] = useState({ audience: 'ALL_STUDENTS', type: 'Important', title: '', message: '' });

  const fetchData = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      setDashboard({ buses: data.buses || [], routes: data.routes || [], notifications: data.notifications || [], trips: data.trips || [] });
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sendNotification = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setForm({ audience: 'ALL_STUDENTS', type: 'Important', title: '', message: '' });
      fetchData();
    }
  };

  return (
    <div>
      <header className="topbar">
        <h1>Admin Dashboard</h1>
        <div className="actions">
          <span>{session?.user?.name}</span>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <div className="stats" style={{ marginTop: '20px' }}>
          <div className="stat-box"><span className="muted">Buses</span><strong>{dashboard.buses.length}</strong></div>
          <div className="stat-box"><span className="muted">Routes</span><strong>{dashboard.routes.length}</strong></div>
          <div className="stat-box"><span className="muted">Trips</span><strong>{dashboard.trips.length}</strong></div>
          <div className="stat-box"><span className="muted">Notifications</span><strong>{dashboard.notifications.length}</strong></div>
        </div>

        <div className="grid grid-2" style={{ marginTop: '22px' }}>
          <div className="card">
            <h3>College bus overview</h3>
            {dashboard.buses.length === 0 ? <p className="empty">No buses added.</p> : dashboard.buses.map((bus) => (
              <div key={bus.id} className="notification">
                <strong>{bus.bus_number}</strong> - {bus.name}
                <div className="muted">Status: {bus.status} | Route: {bus.route_id || 'Unassigned'}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Send a notification</h3>
            <form className="form" onSubmit={sendNotification}>
              <div className="field">
                <label>Audience</label>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  <option value="ALL_STUDENTS">All students</option>
                  <option value="DRIVERS">Drivers</option>
                  <option value="COLLEGE">Students of this college</option>
                  <option value="ALL_USERS">All users</option>
                </select>
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="Holiday">Holiday</option>
                  <option value="Festival">Festival</option>
                  <option value="Bus started">Bus started</option>
                  <option value="Bus delayed">Bus delayed</option>
                  <option value="Bus cancelled">Bus cancelled</option>
                  <option value="Important">Important</option>
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="3" required />
              </div>
              <button className="btn btn-primary" type="submit">Send Notification</button>
            </form>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Live bus tracking</h3>
          {dashboard.buses.length === 0 ? <p className="empty">No recent bus locations.</p> : dashboard.buses.map((bus) => (
            <div key={bus.id} className="notification">
              <strong>{bus.bus_number}</strong>
              <div>{bus.name} • {bus.status}</div>
              <div className="muted">Latitude: {bus.current_latitude || 'N/A'} • Longitude: {bus.current_longitude || 'N/A'}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '28px' }}>
          <AdminManagement />
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Recent notifications</h3>
          {dashboard.notifications.length === 0 ? <p className="empty">No notifications sent.</p> : dashboard.notifications.map((note) => (
            <div key={note.id} className="notification">
              <strong>{note.title}</strong>
              <div>{note.message}</div>
              <small className="muted">{note.type} • {new Date(note.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
