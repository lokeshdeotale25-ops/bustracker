import { useEffect, useState } from 'react';
import { getStoredUser, API_BASE } from '../App.jsx';

export default function StudentDashboard({ onLogout }) {
  const session = getStoredUser();
  const [dashboard, setDashboard] = useState({ buses: [], routes: [], notifications: [] });
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
  const routeStops = route ? dashboard.routes.filter((item) => item.id === route.id) : [];

  return (
    <div>
      <header className="topbar">
        <h1>Student Dashboard</h1>
        <div className="actions">
          <span>{session?.user?.name}</span>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        {loading ? <p>Loading...</p> : (
          <>
            <div className="stats" style={{ marginTop: '20px' }}>
              <div className="stat-box"><span className="muted">Available buses</span><strong>{dashboard.buses.length}</strong></div>
              <div className="stat-box"><span className="muted">Routes</span><strong>{dashboard.routes.length}</strong></div>
              <div className="stat-box"><span className="muted">Notifications</span><strong>{dashboard.notifications.length}</strong></div>
            </div>

            <div className="grid grid-2" style={{ marginTop: '22px' }}>
              <div className="card">
                <h3>Your college buses</h3>
                {dashboard.buses.length === 0 ? <p className="empty">No buses available.</p> : (
                  <div className="grid">
                    {dashboard.buses.map((item) => (
                      <button key={item.id} className="btn btn-secondary" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => setSelectedBusId(item.id)}>
                        <span>{item.bus_number} - {item.name}</span>
                        <span className={`badge ${item.status?.toLowerCase() || 'stopped'}`}>{item.status || 'Stopped'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Selected bus</h3>
                {bus ? (
                  <div>
                    <h4>{bus.bus_number} - {bus.name}</h4>
                    <p>Route: {route?.name || 'Not assigned'}</p>
                    <p>Driver: {bus.driver_name || 'Unassigned'}</p>
                    <p>Status: <span className={`badge ${bus.status?.toLowerCase() || 'stopped'}`}>{bus.status || 'Stopped'}</span></p>
                    <p>Location: {bus.current_latitude ? `${bus.current_latitude}, ${bus.current_longitude}` : 'Not available yet'}</p>
                  </div>
                ) : <p className="empty">No bus selected.</p>}
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3>Live map</h3>
              {bus ? (
                <div className="map-box">
                  <iframe
                    title="Bus location map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${bus.current_latitude || 18.5204},${bus.current_longitude || 73.8567}&z=14&output=embed`}
                  ></iframe>
                </div>
              ) : <p className="empty">Bus map unavailable.</p>}
            </div>

            <div className="grid grid-2" style={{ marginTop: '20px' }}>
              <div className="card">
                <h3>Routes & stops</h3>
                {dashboard.routes.length === 0 ? <p className="empty">No routes available.</p> : dashboard.routes.map((item) => (
                  <div key={item.id} className="notification">
                    <strong>{item.name}</strong>
                    <div>{item.description || 'Route details unavailable'}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3>Expected arrival</h3>
                {arrival ? (
                  <div>
                    <p><strong>Route:</strong> {arrival.routeName || 'Not assigned'}</p>
                    <p><strong>Nearest stop:</strong> {arrival.nearestStop || 'Not available'}</p>
                    <p><strong>ETA:</strong> {arrival.etaMinutes ? `${arrival.etaMinutes} minutes` : 'N/A'}</p>
                    <p><strong>Status:</strong> {arrival.status}</p>
                  </div>
                ) : <p className="empty">Arrival data unavailable.</p>}
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3>Notifications</h3>
              {dashboard.notifications.length === 0 ? <p className="empty">No notifications yet.</p> : dashboard.notifications.map((note) => (
                <div key={note.id} className="notification">
                  <strong>{note.title}</strong>
                  <div>{note.message}</div>
                  <small className="muted">{note.type} • {new Date(note.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
