import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, getStoredUser } from '../App.jsx';
import ProfileSection from './ProfileSection.jsx';

export default function DriverDashboard({ onLogout }) {
  const session = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [bus, setBus] = useState(null);
  const [route, setRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState('');

  const fetchDriverData = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const busesRes = await fetch(`${API_BASE}/buses`, { headers: { Authorization: `Bearer ${token}` } });
    const busesData = await busesRes.json();
    const assigned = (busesData.buses || []).find((b) => b.driver_user_id === session?.user?.id) || (busesData.buses || [])[0];
    setBus(assigned || null);

    if (assigned?.route_id) {
      const routesRes = await fetch(`${API_BASE}/routes`, { headers: { Authorization: `Bearer ${token}` } });
      const routesData = await routesRes.json();
      setRoute((routesData.routes || []).find((r) => r.id === assigned.route_id));

      const stopsRes = await fetch(`${API_BASE}/stops?routeId=${assigned.route_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const stopsData = await stopsRes.json();
      setStops(stopsData.stops || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDriverData(); }, []);

  const startTrip = async () => {
    const token = localStorage.getItem('collegeBusToken');
    if (!navigator.geolocation) {
      setMessages('GPS unavailable on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const payload = {
        busId: bus.id,
        routeId: bus.route_id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const response = await fetch(`${API_BASE}/trips/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setMessages(response.ok ? 'Trip started successfully.' : data.message || 'Unable to start trip');
      if (response.ok) {
        await fetchDriverData();
      }
    }, () => setMessages('Location permission denied. Please allow GPS access.'));
  };

  const stopTrip = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/trips/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ busId: bus.id }),
    });
    const data = await response.json();
    setMessages(response.ok ? 'Trip stopped successfully.' : data.message || 'Unable to stop trip');
    if (response.ok) fetchDriverData();
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setMessages('GPS unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const token = localStorage.getItem('collegeBusToken');
      const response = await fetch(`${API_BASE}/bus-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ busId: bus.id, latitude: position.coords.latitude, longitude: position.coords.longitude }),
      });
      const data = await response.json();
      setMessages(response.ok ? 'Live location updated.' : data.message || 'Failed to send location');
      if (response.ok) fetchDriverData();
    }, () => setMessages('Location permission denied.'));
  };

  const sendDriverNotification = async () => {
    const token = localStorage.getItem('collegeBusToken');
    const response = await fetch(`${API_BASE}/notifications/driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: `${bus?.bus_number || 'Bus'} status update`,
        message: `${bus?.bus_number || 'Bus'} is currently ${bus?.status || 'running'} along the assigned route.`,
        type: 'Bus started',
      }),
    });
    const data = await response.json();
    setMessages(response.ok ? 'Driver notification sent.' : data.message || 'Unable to send notification');
  };

  const navItems = [
    { label: 'Home', page: 'home' },
    { label: 'Students', page: 'students' },
    { label: 'Buses', page: 'buses' },
    { label: 'Trips', page: 'trips' },
    { label: 'Profile', page: 'profile' },
  ];

  const currentScreen = location.pathname.replace(/^\/driver\/?/, '').split('/')[0] || 'home';
  const activeTab = navItems.some((item) => item.page === currentScreen) ? currentScreen : 'home';

  const goToScreen = (page) => {
    if (page === 'home') navigate('/driver');
    else navigate(`/driver/${page}`);
  };

  const renderHomeScreen = () => (
    <>
      <div className="stats-grid">
        <div className="stat-box"><span>BUS</span><strong>{bus?.bus_number || 'N/A'}</strong></div>
        <div className="stat-box"><span>STATUS</span><strong>{bus?.status || 'Stopped'}</strong></div>
        <div className="stat-box"><span>ROUTE</span><strong>{route?.name || 'N/A'}</strong></div>
        <div className="stat-box"><span>LOCATION</span><strong>{bus?.current_latitude ? 'Live' : 'Waiting'}</strong></div>
      </div>

      {messages && <div className="notification" style={{ marginTop: '18px' }}>{messages}</div>}

      <div className="section-card">
        <div className="section-title">
          <span>Trip controls</span>
        </div>
        <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className="primary-btn" onClick={startTrip}>Start Trip</button>
          <button className="danger-btn" onClick={stopTrip}>Stop Trip</button>
        </div>
        <div className="row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '12px' }}>
          <button className="success-btn" onClick={updateLocation}>Send Location</button>
          <button className="secondary-btn" onClick={sendDriverNotification}>Notify Students</button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Assigned bus</span>
        </div>
        {bus ? (
          <div className="status-card">
            <div className="status-row">
              <strong>{bus.name}</strong>
              <span className={`badge ${bus.status?.toLowerCase() || 'stopped'}`}>{bus.status || 'Stopped'}</span>
            </div>
            <div className="muted" style={{ marginTop: '10px' }}>Route: {route?.name || 'Not assigned'}</div>
            <div className="muted">GPS: {bus.current_latitude ? `${bus.current_latitude}, ${bus.current_longitude}` : 'No GPS signal'}</div>
          </div>
        ) : <p className="empty">No assigned bus yet.</p>}
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Stops</span>
        </div>
        {route ? (
          <div className="timeline">
            {stops.length === 0 ? <p className="empty">No stops available for this route.</p> : stops.map((stop) => (
              <div key={stop.id} className="timeline-item">
                <strong>{stop.name}</strong>
                <div className="muted">{stop.latitude}, {stop.longitude}</div>
              </div>
            ))}
          </div>
        ) : <p className="empty">No route assigned.</p>}
      </div>
    </>
  );

  const renderStudentsScreen = () => (
    <div className="section-card">
      <div className="section-title"><span>Students</span></div>
      <p className="empty">Student list is available from the college dashboard.</p>
    </div>
  );

  const renderBusesScreen = () => (
    <div className="section-card">
      <div className="section-title"><span>Buses</span></div>
      {bus ? (
        <div className="notif-item">
          <strong>{bus.bus_number}</strong>
          <div>{bus.name}</div>
          <small>{bus.status} • {route?.name || 'No route assigned'}</small>
        </div>
      ) : <p className="empty">No bus assigned.</p>}
    </div>
  );

  const renderTripsScreen = () => (
    <div className="section-card">
      <div className="section-title"><span>Trips</span></div>
      <p className="empty">Trip history is shown on the home screen and live trip controls.</p>
    </div>
  );

  const renderProfileScreen = () => (
    <ProfileSection role="DRIVER" user={session?.user} transport={{ bus, route, stops }} onLogout={onLogout} />
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

  if (loading) return <div className="container"><p>Loading driver details...</p></div>;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <p className="eyebrow">Driver Portal</p>
            <h1>{session?.user?.name}</h1>
          </div>
          <button className="icon-button" aria-label="Notifications" type="button">🔔</button>
        </div>
      </header>

      <div className="container">
        <div className="welcome-panel">
          <div>
            <small>Assigned bus</small>
            <strong>{bus?.bus_number || 'Not assigned'}</strong>
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
