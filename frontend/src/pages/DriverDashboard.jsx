import { useEffect, useState } from 'react';
import { API_BASE, getStoredUser } from '../App.jsx';

export default function DriverDashboard({ onLogout }) {
  const session = getStoredUser();
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

  if (loading) return <div className="container"><p>Loading driver details...</p></div>;

  return (
    <div>
      <header className="topbar">
        <h1>Driver Dashboard</h1>
        <div className="actions">
          <span>{session?.user?.name}</span>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <div className="stats" style={{ marginTop: '20px' }}>
          <div className="stat-box"><span className="muted">Assigned bus</span><strong>{bus?.bus_number || 'N/A'}</strong></div>
          <div className="stat-box"><span className="muted">Status</span><strong>{bus?.status || 'Stopped'}</strong></div>
          <div className="stat-box"><span className="muted">Route</span><strong>{route?.name || 'Not assigned'}</strong></div>
        </div>

        {messages && <div className="notification" style={{ marginTop: '18px' }}>{messages}</div>}

        <div className="grid grid-2" style={{ marginTop: '20px' }}>
          <div className="card">
            <h3>Trip controls</h3>
            <div className="row">
              <button className="btn btn-primary" onClick={startTrip}>Start Trip</button>
              <button className="btn btn-danger" onClick={stopTrip}>Stop Trip</button>
              <button className="btn btn-success" onClick={updateLocation}>Send Live Location</button>
              <button className="btn btn-secondary" onClick={sendDriverNotification}>Notify Students</button>
            </div>
            <p className="muted">Use your phone GPS to share live location while the trip is active.</p>
          </div>

          <div className="card">
            <h3>Assigned bus info</h3>
            {bus ? (
              <div>
                <p><strong>Bus:</strong> {bus.name} ({bus.bus_number})</p>
                <p><strong>Status:</strong> <span className={`badge ${bus.status?.toLowerCase() || 'stopped'}`}>{bus.status || 'Stopped'}</span></p>
                <p><strong>Current location:</strong> {bus.current_latitude ? `${bus.current_latitude}, ${bus.current_longitude}` : 'No GPS signal'}</p>
              </div>
            ) : <p className="empty">No assigned bus yet.</p>}
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Assigned route and stops</h3>
          {route ? (
            <div>
              <p><strong>Route:</strong> {route.name}</p>
              {stops.length === 0 ? <p className="empty">No stops available for this route.</p> : stops.map((stop) => (
                <div key={stop.id} className="notification">
                  <strong>{stop.name}</strong>
                  <div>{stop.latitude}, {stop.longitude}</div>
                </div>
              ))}
            </div>
          ) : <p className="empty">No route assigned.</p>}
        </div>
      </div>
    </div>
  );
}
