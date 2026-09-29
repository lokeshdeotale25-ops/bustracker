import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, API_BASE } from '../App.jsx';
import ProfileSection from './ProfileSection.jsx';

export default function StudentDashboard({ onLogout }) {
  const session = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState({ buses: [], routes: [], notifications: [], trips: [], students: [] });
  const [selectedBusId, setSelectedBusId] = useState('');
  const [arrival, setArrival] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      setDashboard({
        buses: data.buses || [],
        routes: data.routes || [],
        notifications: data.notifications || [],
        trips: data.trips || [],
        students: data.students || [],
      });
      if ((data.buses || [])[0]) setSelectedBusId((data.buses || [])[0].id);
    }
    setLoading(false);
  };

  const fetchArrival = async (busId) => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/expected-arrival/${busId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) setArrival(data.arrival);
    else setArrival(null);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedBusId) fetchArrival(selectedBusId);
  }, [selectedBusId]);

  const bus = dashboard.buses.find((item) => item.id === Number(selectedBusId)) || dashboard.buses[0];
  const route = dashboard.routes.find((item) => item.id === bus?.route_id);

  const navItems = [
    { label: 'Home', page: 'home' },
    { label: 'Students', page: 'students' },
    { label: 'Buses', page: 'buses' },
    { label: 'Trips', page: 'trips' },
    { label: 'Profile', page: 'profile' },
  ];

  const currentScreen = location.pathname.replace(/^\/student\/?/, '').split('/')[0] || 'home';
  const activeTab = navItems.some((item) => item.page === currentScreen) ? currentScreen : 'home';

  const goToScreen = (page) => {
    if (page === 'home') navigate('/student');
    else navigate(`/student/${page}`);
  };

  const renderHomeScreen = () => (
    <>
      <div className="stats-grid">
        <div className="stat-box">
          <span>MY BUS</span>
          <strong>{bus?.bus_number || 'N/A'}</strong>
        </div>
        <div className="stat-box">
          <span>LIVE TRACKING</span>
          <strong>{bus?.status || 'Stopped'}</strong>
        </div>
        <div className="stat-box">
          <span>NEXT STOP</span>
          <strong>{arrival?.nearestStop || 'Waiting'}</strong>
        </div>
        <div className="stat-box">
          <span>ETA</span>
          <strong>{arrival?.etaMinutes ? `${arrival.etaMinutes} min` : 'N/A'}</strong>
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>My Bus</span>
          <small>{bus?.status || 'Stopped'}</small>
        </div>

        {dashboard.buses.length === 0 ? (
          <p className="empty">No buses available.</p>
        ) : (
          <div className="bus-list">
            {dashboard.buses.map((item) => (
              <button key={item.id} className="bus-option" type="button" onClick={() => setSelectedBusId(item.id)}>
                <div className="bus-meta">
                  <strong>{item.bus_number}</strong>
                  <span className="muted">{item.name}</span>
                </div>
                <span className={`badge ${item.status?.toLowerCase() || 'stopped'}`}>{item.status || 'Stopped'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Live Tracking</span>
        </div>
        {bus ? (
          <div className="map-box">
            <iframe
              title="Bus location map"
              src={`https://www.google.com/maps?q=${bus.current_latitude || 18.5204},${bus.current_longitude || 73.8567}&z=14&output=embed`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        ) : <p className="empty">Bus map unavailable.</p>}

        <div className="trip-panel" style={{ marginTop: '16px' }}>
          <div className="trip-row">
            <span className="muted">Bus</span>
            <strong>{bus?.bus_number || 'N/A'}</strong>
          </div>
          <div className="trip-row">
            <span className="muted">Driver</span>
            <strong>{bus?.driver_name || 'Unassigned'}</strong>
          </div>
          <div className="trip-row">
            <span className="muted">Status</span>
            <span className={`badge ${bus?.status?.toLowerCase() || 'stopped'}`}>{bus?.status || 'Stopped'}</span>
          </div>
          <div className="trip-row">
            <span className="muted">Next stop</span>
            <strong>{arrival?.nearestStop || 'Waiting'}</strong>
          </div>
          <div className="trip-row">
            <span className="muted">ETA</span>
            <strong>{arrival?.etaMinutes ? `${arrival.etaMinutes} min` : 'N/A'}</strong>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Route</span>
        </div>
        <div className="timeline">
          {dashboard.routes.length === 0 ? (
            <p className="empty">No route details available.</p>
          ) : (
            (dashboard.routes || []).map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.name}</strong>
                <div className="muted">{item.description || 'Route details unavailable'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Notifications</span>
          <small>{dashboard.notifications.length} unread</small>
        </div>

        {dashboard.notifications.length === 0 ? (
          <p className="empty">No notifications available.</p>
        ) : (
          <div className="notification-list">
            {dashboard.notifications.map((note) => (
              <div key={note.id} className="notif-item">
                <strong>{note.title}</strong>
                <div>{note.message}</div>
                <small>{note.type} • {new Date(note.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderStudentsScreen = () => (
    <div className="section-card">
      <div className="section-title">
        <span>Students</span>
        <small>{dashboard.students.length || 0}</small>
      </div>
      {dashboard.students.length === 0 ? (
        <p className="empty">No students available for your college.</p>
      ) : (
        <div className="notification-list">
          {dashboard.students.map((student) => (
            <div key={student.id || student.user_id} className="notif-item">
              <strong>{student.name || student.user_name || 'Student'}</strong>
              <div>{student.email || 'No email recorded'}</div>
              <small>{student.year || 'Year not set'} • {student.department || 'Department not set'}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBusesScreen = () => (
    <div className="section-card">
      <div className="section-title">
        <span>Buses</span>
        <small>{dashboard.buses.length || 0}</small>
      </div>
      {dashboard.buses.length === 0 ? (
        <p className="empty">No buses available.</p>
      ) : (
        <div className="notification-list">
          {dashboard.buses.map((busItem) => (
            <div key={busItem.id} className="notif-item">
              <strong>{busItem.bus_number}</strong>
              <div>{busItem.name || 'Bus route'}</div>
              <small>{busItem.status || 'Stopped'} • {busItem.route_name || 'No route assigned'}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTripsScreen = () => (
    <div className="section-card">
      <div className="section-title">
        <span>Trips</span>
        <small>{dashboard.trips.length || 0}</small>
      </div>
      {dashboard.trips.length === 0 ? (
        <p className="empty">No trips available.</p>
      ) : (
        <div className="notification-list">
          {dashboard.trips.map((trip) => (
            <div key={trip.id} className="notif-item">
              <strong>{trip.status || 'Trip'}</strong>
              <div>Bus #{trip.bus_id} • Route #{trip.route_id || 'Unassigned'}</div>
              <small>{trip.started_at ? new Date(trip.started_at).toLocaleString() : 'No start time'}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfileScreen = () => (
    <ProfileSection role="STUDENT" user={session?.user} transport={{ ...dashboard, bus, route, arrival }} onLogout={onLogout} />
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
            <p className="eyebrow">College Bus Tracking System</p>
            <h1>{session?.user?.name}</h1>
          </div>
          <button className="icon-button" aria-label="Notifications" type="button">
            🔔
            <span className="badge-pill">{dashboard.notifications.length || 0}</span>
          </button>
        </div>
      </header>

      <div className="page-shell">
        <div className="welcome-panel">
          <div>
            <small>Good morning</small>
            <strong>{route?.name || 'Route not assigned'}</strong>
          </div>
          <button className="ghost-btn" type="button" onClick={onLogout}>Logout</button>
        </div>

        {loading ? (
          <div className="section-card"><p className="empty">Loading buses...</p></div>
        ) : renderScreen()}
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
