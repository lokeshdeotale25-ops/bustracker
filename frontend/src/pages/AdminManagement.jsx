import { useEffect, useState } from 'react';
import { API_BASE } from '../App.jsx';

export default function AdminManagement() {
  const [students, setStudents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [token] = useState(localStorage.getItem('collegeBusToken'));

  const fetchAll = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [studentsRes, driversRes, busesRes, routesRes, stopsRes] = await Promise.all([
      fetch(`${API_BASE}/students`, { headers }),
      fetch(`${API_BASE}/drivers`, { headers }),
      fetch(`${API_BASE}/buses`, { headers }),
      fetch(`${API_BASE}/routes`, { headers }),
      fetch(`${API_BASE}/stops`, { headers }),
    ]);

    const studentsData = await studentsRes.json();
    const driversData = await driversRes.json();
    const busesData = await busesRes.json();
    const routesData = await routesRes.json();
    const stopsData = await stopsRes.json();

    setStudents(studentsData.students || []);
    setDrivers(driversData.drivers || []);
    setBuses(busesData.buses || []);
    setRoutes(routesData.routes || []);
    setStops(stopsData.stops || []);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div className="grid grid-2">
        <div className="card">
          <h3>Students</h3>
          {students.length === 0 ? <p className="empty">No students registered.</p> : students.map((s) => (
            <div key={s.id} className="notification">
              <strong>{s.name}</strong>
              <div>{s.email}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Drivers</h3>
          {drivers.length === 0 ? <p className="empty">No drivers assigned.</p> : drivers.map((d) => (
            <div key={d.id} className="notification">
              <strong>{d.name}</strong>
              <div>{d.email} • {d.bus_number || 'No bus assigned'}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Buses</h3>
          {buses.length === 0 ? <p className="empty">No buses added.</p> : buses.map((b) => (
            <div key={b.id} className="notification">
              <strong>{b.bus_number}</strong>
              <div>{b.name} • {b.status}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Routes</h3>
          {routes.length === 0 ? <p className="empty">No routes defined.</p> : routes.map((r) => (
            <div key={r.id} className="notification">
              <strong>{r.name}</strong>
              <div>{r.description}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>Stops</h3>
          {stops.length === 0 ? <p className="empty">No stops available.</p> : stops.map((s) => (
            <div key={s.id} className="notification">
              <strong>{s.name}</strong>
              <div>{s.latitude}, {s.longitude}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
