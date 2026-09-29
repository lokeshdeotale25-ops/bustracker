import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, getStoredUser } from '../App.jsx';
import AdminManagement from './AdminManagement.jsx';
import ProfileSection from './ProfileSection.jsx';

export default function AdminDashboard({ onLogout }) {
  const session = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState({ buses: [], routes: [], notifications: [], trips: [], college: null });
  const [form, setForm] = useState({ audience: 'ALL_STUDENTS', type: 'Important', title: '', message: '' });

  const fetchData = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      setDashboard({ buses: data.buses || [], routes: data.routes || [], notifications: data.notifications || [], trips: data.trips || [], college: data.college || null });
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

  const navItems = [
    { label: 'Home', page: 'home' },
    { label: 'Students', page: 'students' },
    { label: 'Buses', page: 'buses' },
    { label: 'Trips', page: 'trips' },
    { label: 'Profile', page: 'profile' },
  ];

  const currentScreen = location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'home';
  const activeTab = navItems.some((item) => item.page === currentScreen) ? currentScreen : 'home';

  const goToScreen = (page) => {
    if (page === 'home') navigate('/admin');
    else navigate(`/admin/${page}`);
  };

  const renderHomeScreen = () => (
    <>
      <div className="stats-grid">
        <div className="stat-box"><span>STUDENTS</span><strong>{dashboard.buses.length || 0}</strong></div>
        <div className="stat-box"><span>DRIVERS</span><strong>{dashboard.routes.length || 0}</strong></div>
        <div className="stat-box"><span>BUSES</span><strong>{dashboard.buses.length || 0}</strong></div>
        <div className="stat-box"><span>TRIPS</span><strong>{dashboard.trips.length || 0}</strong></div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>College bus overview</span>
        </div>
        {dashboard.buses.length === 0 ? <p className="empty">No buses added.</p> : dashboard.buses.map((bus) => (
          <div key={bus.id} className="notif-item">
            <strong>{bus.bus_number} • {bus.name}</strong>
            <div className="muted">Status: {bus.status} | Route: {bus.route_id || 'Unassigned'}</div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Send a notification</span>
        </div>
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
          <button className="primary-btn" type="submit">Send Notification</button>
        </form>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Live bus tracking</span>
        </div>
        {dashboard.buses.length === 0 ? <p className="empty">No recent bus locations.</p> : dashboard.buses.map((bus) => (
          <div key={bus.id} className="notif-item">
            <strong>{bus.bus_number}</strong>
            <div>{bus.name} • {bus.status}</div>
            <div className="muted">Latitude: {bus.current_latitude || 'N/A'} • Longitude: {bus.current_longitude || 'N/A'}</div>
          </div>
        ))}
      </div>
    </>
  );

  const renderStudentsScreen = () => (
    <div style={{ marginTop: '16px' }}>
      <AdminManagement />
    </div>
  );

  const renderBusesScreen = () => (
    <div className="section-card">
      <div className="section-title"><span>Buses</span></div>
      {dashboard.buses.length === 0 ? <p className="empty">No buses added.</p> : dashboard.buses.map((bus) => (
        <div key={bus.id} className="notif-item">
          <strong>{bus.bus_number}</strong>
          <div>{bus.name}</div>
          <small>{bus.status} • {bus.route_id ? `Route ${bus.route_id}` : 'No route assigned'}</small>
        </div>
      ))}
    </div>
  );

  const renderTripsScreen = () => (
    <div className="section-card">
      <div className="section-title"><span>Trips</span></div>
      {dashboard.trips.length === 0 ? <p className="empty">No trips recorded.</p> : dashboard.trips.map((trip) => (
        <div key={trip.id} className="notif-item">
          <strong>{trip.status || 'Trip'}</strong>
          <div>Bus ID: {trip.bus_id}</div>
          <small>{trip.started_at ? new Date(trip.started_at).toLocaleString() : 'No start time'}</small>
        </div>
      ))}
    </div>
  );

  const renderProfileScreen = () => (
    <ProfileSection role="ADMIN" user={session?.user} transport={dashboard} onLogout={onLogout} />
  );

  const renderScreen = () => {
    switch (activeTab) {
      case 'students': return renderStudentsScreen();
      case 'buses': return renderBusesScreen();
      case 'trips': return renderTripsScreen();
      case 'profile': return renderProfileScreen();
      case 'home':
      default: return renderHomeScreen();
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>{session?.user?.name}</h1>
          </div>
          <button className="icon-button" aria-label="Notifications" type="button">🔔</button>
        </div>
      </header>

      <div className="container">
        <div className="welcome-panel">
          <div>
            <small>Good morning</small>
            <strong>{session?.user?.name}</strong>
          </div>
          <button className="ghost-btn" onClick={onLogout} type="button">Logout</button>
        </div>

        {renderScreen()}
      </div>

      <nav className="bottom-nav" aria-label="Bottom navigation">
        {navItems.map((item) => (
          <button
            key={item.page}
            className={`nav-item ${activeTab === item.page ? 'active' : ''}`}
            type="button"
            onClick={() => goToScreen(item.page)}
            aria-label={item.label}
          >
            <span>{item.page === 'home' ? '🏠' : item.page === 'students' ? '👥' : item.page === 'buses' ? '🚌' : item.page === 'trips' ? '🗺️' : '👤'}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
