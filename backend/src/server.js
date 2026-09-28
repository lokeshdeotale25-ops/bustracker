import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDatabase, all, get, run } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'college-bus-secret';

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

const authRequired = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  collegeId: user.college_id,
  phone: user.phone,
  createdAt: user.created_at,
});

const createToken = (user) => jwt.sign(
  { id: user.id, collegeId: user.college_id, role: user.role, email: user.email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const isCollegeMatch = (req, resourceCollegeId) => Number(req.user.collegeId) === Number(resourceCollegeId);

const getUserByEmail = async (email) => get('SELECT * FROM users WHERE email = ?', [email]);

const seedDemoData = async () => {
  const existingColleges = await all('SELECT * FROM colleges ORDER BY id');

  let college1 = existingColleges[0] || await get('SELECT * FROM colleges WHERE code = ?', ['CTC']);
  let college2 = existingColleges[1] || await get('SELECT * FROM colleges WHERE code = ?', ['GVC']);

  if (!college1) {
    const result = await run('INSERT INTO colleges (name, code, address) VALUES (?, ?, ?)', ['City Tech College', 'CTC', 'Apt Road, Pune']);
    college1 = await get('SELECT * FROM colleges WHERE id = ?', [result.id]);
  }

  if (!college2) {
    const result = await run('INSERT INTO colleges (name, code, address) VALUES (?, ?, ?)', ['Green Valley College', 'GVC', 'Riverside Lane, Nashik']);
    college2 = await get('SELECT * FROM colleges WHERE id = ?', [result.id]);
  }

  const ensureUser = async ({ collegeId, name, email, password, role, phone, year, department, licenseNumber, designation }) => {
    let user = await getUserByEmail(email);
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await run('INSERT INTO users (college_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)', [collegeId, name, email, passwordHash, role, phone || '']);
      user = await get('SELECT * FROM users WHERE id = ?', [result.id]);
    }

    if (role === 'STUDENT') {
      const existing = await get('SELECT * FROM students WHERE user_id = ?', [user.id]);
      if (!existing) {
        await run('INSERT INTO students (user_id, college_id, year, department) VALUES (?, ?, ?, ?)', [user.id, collegeId, year || '', department || '']);
      }
    }

    if (role === 'DRIVER') {
      const existing = await get('SELECT * FROM drivers WHERE user_id = ?', [user.id]);
      if (!existing) {
        await run('INSERT INTO drivers (user_id, college_id, license_number, bus_id) VALUES (?, ?, ?, ?)', [user.id, collegeId, licenseNumber || '', null]);
      }
    }

    if (role === 'ADMIN') {
      const existing = await get('SELECT * FROM admins WHERE user_id = ?', [user.id]);
      if (!existing) {
        await run('INSERT INTO admins (user_id, college_id, designation) VALUES (?, ?, ?)', [user.id, collegeId, designation || 'Principal']);
      }
    }

    return user;
  };

  const adminUser1 = await ensureUser({ collegeId: college1.id, name: 'Principal Sharma', email: 'principal@ctc.edu', password: 'admin123', role: 'ADMIN', phone: '9000000001', designation: 'Principal' });
  const adminUser2 = await ensureUser({ collegeId: college2.id, name: 'Principal Mehta', email: 'principal@gvc.edu', password: 'admin123', role: 'ADMIN', phone: '9000000002', designation: 'Principal' });

  const studentUser1 = await ensureUser({ collegeId: college1.id, name: 'Asha Patil', email: 'asha@ctc.edu', password: 'student123', role: 'STUDENT', phone: '9100000001', year: '3rd Year', department: 'CSE' });
  const studentUser2 = await ensureUser({ collegeId: college2.id, name: 'Rohit Kumar', email: 'rohit@gvc.edu', password: 'student123', role: 'STUDENT', phone: '9100000002', year: '2nd Year', department: 'ECE' });

  const driverUser1 = await ensureUser({ collegeId: college1.id, name: 'Sanjay Patil', email: 'driver1@ctc.edu', password: 'driver123', role: 'DRIVER', phone: '9200000001', licenseNumber: 'DL-CTC-101' });
  const driverUser2 = await ensureUser({ collegeId: college2.id, name: 'Rahul Sawant', email: 'driver2@gvc.edu', password: 'driver123', role: 'DRIVER', phone: '9200000002', licenseNumber: 'DL-GVC-202' });

  const route1 = await get('SELECT * FROM routes WHERE college_id = ? AND name = ?', [college1.id, 'College to City Center']);
  const route2 = await get('SELECT * FROM routes WHERE college_id = ? AND name = ?', [college2.id, 'Campus to Railway Station']);

  const ensureRoute = async (collegeId, name, description) => {
    let route = await get('SELECT * FROM routes WHERE college_id = ? AND name = ?', [collegeId, name]);
    if (!route) {
      const result = await run('INSERT INTO routes (college_id, name, description) VALUES (?, ?, ?)', [collegeId, name, description]);
      route = await get('SELECT * FROM routes WHERE id = ?', [result.id]);
    }
    return route;
  };

  const finalRoute1 = route1 || await ensureRoute(college1.id, 'College to City Center', 'Main pickup route');
  const finalRoute2 = route2 || await ensureRoute(college2.id, 'Campus to Railway Station', 'Evening pickup route');

  const ensureStop = async (routeId, name, latitude, longitude, stopOrder) => {
    const existing = await get('SELECT * FROM stops WHERE route_id = ? AND name = ?', [routeId, name]);
    if (!existing) {
      await run('INSERT INTO stops (route_id, name, latitude, longitude, stop_order) VALUES (?, ?, ?, ?, ?)', [routeId, name, latitude, longitude, stopOrder]);
    }
  };

  await ensureStop(finalRoute1.id, 'College Gate', 18.5204, 73.8567, 1);
  await ensureStop(finalRoute1.id, 'Main Road', 18.5182, 73.8631, 2);
  await ensureStop(finalRoute1.id, 'Bus Stand', 18.5156, 73.8725, 3);
  await ensureStop(finalRoute2.id, 'Campus Gate', 19.9975, 73.7898, 1);
  await ensureStop(finalRoute2.id, 'Rly Station', 19.9952, 73.8012, 2);

  const ensureBus = async (collegeId, busNumber, name, routeId, status, capacity, latitude, longitude) => {
    let bus = await get('SELECT * FROM buses WHERE college_id = ? AND bus_number = ?', [collegeId, busNumber]);
    if (!bus) {
      const result = await run('INSERT INTO buses (college_id, bus_number, name, route_id, status, capacity, current_latitude, current_longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [collegeId, busNumber, name, routeId, status, capacity, latitude, longitude]);
      bus = await get('SELECT * FROM buses WHERE id = ?', [result.id]);
    }
    return bus;
  };

  const bus1 = await ensureBus(college1.id, 'CTC-101', 'Campus Express', finalRoute1.id, 'Running', 40, 18.5204, 73.8567);
  const bus2 = await ensureBus(college2.id, 'GVC-204', 'City Link', finalRoute2.id, 'Stopped', 35, 19.9975, 73.7898);

  const ensureDriverAssignment = async (driverUserId, busId) => {
    const driver = await get('SELECT * FROM drivers WHERE user_id = ?', [driverUserId]);
    if (driver) {
      await run('UPDATE drivers SET bus_id = ? WHERE id = ?', [busId, driver.id]);
      await run('UPDATE buses SET driver_id = ? WHERE id = ?', [driver.id, busId]);
    }
  };

  await ensureDriverAssignment(driverUser1.id, bus1.id);
  await ensureDriverAssignment(driverUser2.id, bus2.id);

  const ensureTrip = async (collegeId, busId, driverId, routeId) => {
    const active = await get('SELECT * FROM trips WHERE college_id = ? AND bus_id = ? AND status = ?', [collegeId, busId, 'Running']);
    if (!active) {
      const trip = await run('INSERT INTO trips (college_id, bus_id, driver_id, route_id, status, started_at, current_latitude, current_longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [collegeId, busId, driverId, routeId, 'Running', new Date().toISOString(), 18.5204, 73.8567]);
      await run('INSERT INTO bus_locations (college_id, bus_id, trip_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [collegeId, busId, trip.id, 18.5204, 73.8567]);
    }
  };

  const driverRecord1 = await get('SELECT * FROM drivers WHERE user_id = ?', [driverUser1.id]);
  const driverRecord2 = await get('SELECT * FROM drivers WHERE user_id = ?', [driverUser2.id]);
  await ensureTrip(college1.id, bus1.id, driverRecord1.id, finalRoute1.id);
  await ensureTrip(college2.id, bus2.id, driverRecord2.id, finalRoute2.id);

  const ensureNotification = async (collegeId, type, title, message) => {
    const existing = await get('SELECT * FROM notifications WHERE college_id = ? AND title = ?', [collegeId, title]);
    if (!existing) {
      await run('INSERT INTO notifications (college_id, audience, type, title, message) VALUES (?, ?, ?, ?, ?)', [collegeId, 'ALL_STUDENTS', type, title, message]);
    }
  };

  await ensureNotification(college1.id, 'Bus started', 'Morning Bus Started', 'Bus CTC-101 has started its route from the college gate.');
  await ensureNotification(college2.id, 'Holiday', 'Holiday Schedule', 'College will remain closed this Saturday.');
};

const buildCollegeInfo = async (collegeId) => {
  const college = await get('SELECT * FROM colleges WHERE id = ?', [collegeId]);
  const buses = await all('SELECT * FROM buses WHERE college_id = ?', [collegeId]);
  const routes = await all('SELECT * FROM routes WHERE college_id = ?', [collegeId]);
  const drivers = await all('SELECT * FROM drivers WHERE college_id = ?', [collegeId]);
  const students = await all('SELECT * FROM students WHERE college_id = ?', [collegeId]);
  const notifications = await all('SELECT * FROM notifications WHERE college_id = ? ORDER BY created_at DESC', [collegeId]);

  return { college, buses, routes, drivers, students, notifications };
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getExpectedArrivalData = async (busId, collegeId) => {
  const bus = await get(`
    SELECT b.*, r.name AS route_name
    FROM buses b
    LEFT JOIN routes r ON r.id = b.route_id
    WHERE b.id = ? AND b.college_id = ?
  `, [busId, collegeId]);

  if (!bus) return null;
  if (!bus.route_id) return { busId: bus.id, routeName: null, nearestStop: null, etaMinutes: null, status: 'No route assigned' };

  const stops = await all('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order', [bus.route_id]);

  if (!stops.length) {
    return { busId: bus.id, routeName: bus.route_name, nearestStop: null, etaMinutes: null, status: 'No stops available for this route' };
  }

  if (!bus.current_latitude || !bus.current_longitude) {
    return { busId: bus.id, routeName: bus.route_name, nearestStop: null, etaMinutes: null, status: 'Bus location unavailable' };
  }

  let nearestStop = null;
  let nearestDistance = Number.MAX_SAFE_INTEGER;

  for (const stop of stops) {
    const distance = calculateDistanceKm(bus.current_latitude, bus.current_longitude, stop.latitude, stop.longitude);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStop = { ...stop, distanceKm: Number(distance.toFixed(2)) };
    }
  }

  if (!nearestStop) {
    return { busId: bus.id, routeName: bus.route_name, nearestStop: null, etaMinutes: null, status: 'Unable to calculate arrival' };
  }

  const averageBusSpeedKmh = 25;
  const etaMinutes = Math.max(1, Math.round((nearestStop.distanceKm / averageBusSpeedKmh) * 60));

  return {
    busId: bus.id,
    routeName: bus.route_name,
    nearestStop: nearestStop.name,
    etaMinutes,
    stopLatitude: nearestStop.latitude,
    stopLongitude: nearestStop.longitude,
    distanceKm: nearestStop.distanceKm,
    status: 'Estimated arrival available',
  };
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'College Bus Tracking System is live.' });
});

app.get('/api/colleges', async (_req, res) => {
  try {
    const colleges = await all('SELECT * FROM colleges ORDER BY id');
    res.json({ colleges });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch colleges', error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, collegeId, phone, year, department, licenseNumber, designation } = req.body;

    if (!name || !email || !password || !role || !collegeId) {
      return res.status(400).json({ message: 'Please provide all required registration details.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await run('INSERT INTO users (college_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)', [collegeId, name, email, passwordHash, role, phone || '']);

    if (role === 'STUDENT') {
      await run('INSERT INTO students (user_id, college_id, year, department) VALUES (?, ?, ?, ?)', [user.id, collegeId, year || '', department || '']);
    }

    if (role === 'DRIVER') {
      await run('INSERT INTO drivers (user_id, college_id, license_number) VALUES (?, ?, ?)', [user.id, collegeId, licenseNumber || '']);
    }

    if (role === 'ADMIN') {
      await run('INSERT INTO admins (user_id, college_id, designation) VALUES (?, ?, ?)', [user.id, collegeId, designation || 'Principal']);
    }

    const dbUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    res.status(201).json({
      message: 'Registration successful',
      token: createToken(dbUser),
      user: sanitizeUser(dbUser),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to register user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid login details' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid login details' });
    }

    const token = createToken(user);
    res.json({ message: 'Login successful', token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const college = await get('SELECT * FROM colleges WHERE id = ?', [user.college_id]);
    res.json({ user: sanitizeUser(user), college });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch user profile', error: error.message });
  }
});

app.get('/api/students', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const students = await all('SELECT s.*, u.name, u.email, u.phone FROM students s JOIN users u ON u.id = s.user_id WHERE s.college_id = ? ORDER BY u.name', [req.user.collegeId]);
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch students', error: error.message });
  }
});

app.get('/api/drivers', authRequired, async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const drivers = await all('SELECT d.*, u.name, u.email, u.phone, b.bus_number FROM drivers d JOIN users u ON u.id = d.user_id LEFT JOIN buses b ON b.id = d.bus_id WHERE d.college_id = ? ORDER BY u.name', [req.user.collegeId]);
      return res.json({ drivers });
    }

    const drivers = await all('SELECT d.*, u.name, u.email, u.phone, b.bus_number FROM drivers d JOIN users u ON u.id = d.user_id LEFT JOIN buses b ON b.id = d.bus_id WHERE d.user_id = ? AND d.college_id = ?', [req.user.id, req.user.collegeId]);
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch drivers', error: error.message });
  }
});

app.post('/api/drivers', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, phone, licenseNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Driver name, email and password are required.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'A driver with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await run('INSERT INTO users (college_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)', [req.user.collegeId, name, email, passwordHash, 'DRIVER', phone || '']);
    const driver = await run('INSERT INTO drivers (user_id, college_id, license_number) VALUES (?, ?, ?)', [user.id, req.user.collegeId, licenseNumber || '']);
    res.status(201).json({ message: 'Driver added successfully', driverId: driver.id, userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Unable to add driver', error: error.message });
  }
});

app.put('/api/drivers/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, phone, licenseNumber } = req.body;
    const driver = await get('SELECT * FROM drivers WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!driver) return res.status(404).json({ message: 'Driver not found in your college.' });

    const user = await get('SELECT * FROM users WHERE id = ?', [driver.user_id]);
    await run('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [name || user.name, email || user.email, phone || user.phone, user.id]);
    await run('UPDATE drivers SET license_number = ? WHERE id = ?', [licenseNumber || driver.license_number, driver.id]);
    res.json({ message: 'Driver updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update driver', error: error.message });
  }
});

app.delete('/api/drivers/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const driver = await get('SELECT * FROM drivers WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!driver) return res.status(404).json({ message: 'Driver not found in your college.' });
    await run('DELETE FROM users WHERE id = ?', [driver.user_id]);
    await run('DELETE FROM drivers WHERE id = ?', [driver.id]);
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete driver', error: error.message });
  }
});

app.get('/api/buses', authRequired, async (req, res) => {
  try {
    const buses = await all(`
      SELECT b.*, r.name AS route_name, d.user_id AS driver_user_id, u.name AS driver_name
      FROM buses b
      LEFT JOIN routes r ON r.id = b.route_id
      LEFT JOIN drivers d ON d.id = b.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      WHERE b.college_id = ?
      ORDER BY b.id
    `, [req.user.collegeId]);
    res.json({ buses });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch buses', error: error.message });
  }
});

app.post('/api/buses', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { busNumber, name, routeId, status, capacity } = req.body;
    const result = await run('INSERT INTO buses (college_id, bus_number, name, route_id, status, capacity) VALUES (?, ?, ?, ?, ?, ?)', [req.user.collegeId, busNumber, name, routeId || null, status || 'Stopped', capacity || 40]);
    const bus = await get('SELECT * FROM buses WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Bus added successfully', bus });
  } catch (error) {
    res.status(500).json({ message: 'Unable to add bus', error: error.message });
  }
});

app.put('/api/buses/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { busNumber, name, routeId, status, capacity, driverId } = req.body;
    const existing = await get('SELECT * FROM buses WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!existing) return res.status(404).json({ message: 'Bus not found in your college.' });

    await run('UPDATE buses SET bus_number = ?, name = ?, route_id = ?, status = ?, capacity = ?, driver_id = ? WHERE id = ?', [busNumber || existing.bus_number, name || existing.name, routeId ?? existing.route_id, status || existing.status, capacity || existing.capacity, driverId ?? existing.driver_id, req.params.id]);
    await run('UPDATE drivers SET bus_id = ? WHERE id = ?', [req.params.id, driverId || existing.driver_id]);

    const bus = await get('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bus updated successfully', bus });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update bus', error: error.message });
  }
});

app.delete('/api/buses/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const bus = await get('SELECT * FROM buses WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!bus) return res.status(404).json({ message: 'Bus not found in your college.' });
    await run('DELETE FROM buses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete bus', error: error.message });
  }
});

app.get('/api/routes', authRequired, async (req, res) => {
  try {
    const routes = await all('SELECT * FROM routes WHERE college_id = ? ORDER BY id', [req.user.collegeId]);
    res.json({ routes });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch routes', error: error.message });
  }
});

app.post('/api/routes', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const route = await run('INSERT INTO routes (college_id, name, description) VALUES (?, ?, ?)', [req.user.collegeId, name, description || '']);
    const created = await get('SELECT * FROM routes WHERE id = ?', [route.id]);
    res.status(201).json({ message: 'Route created successfully', route: created });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create route', error: error.message });
  }
});

app.put('/api/routes/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const route = await get('SELECT * FROM routes WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!route) return res.status(404).json({ message: 'Route not found in your college.' });
    await run('UPDATE routes SET name = ?, description = ? WHERE id = ?', [name || route.name, description || route.description, route.id]);
    const updated = await get('SELECT * FROM routes WHERE id = ?', [route.id]);
    res.json({ message: 'Route updated successfully', route: updated });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update route', error: error.message });
  }
});

app.delete('/api/routes/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const route = await get('SELECT * FROM routes WHERE id = ? AND college_id = ?', [req.params.id, req.user.collegeId]);
    if (!route) return res.status(404).json({ message: 'Route not found in your college.' });
    await run('DELETE FROM routes WHERE id = ?', [route.id]);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete route', error: error.message });
  }
});

app.get('/api/stops', authRequired, async (req, res) => {
  try {
    const { routeId } = req.query;
    const sql = routeId ? 'SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order' : 'SELECT s.*, r.college_id FROM stops s JOIN routes r ON r.id = s.route_id WHERE r.college_id = ? ORDER BY s.route_id, s.stop_order';
    const params = routeId ? [routeId] : [req.user.collegeId];
    const stops = await all(sql, params);
    res.json({ stops });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch stops', error: error.message });
  }
});

app.post('/api/stops', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { routeId, name, latitude, longitude, stopOrder } = req.body;
    const route = await get('SELECT * FROM routes WHERE id = ? AND college_id = ?', [routeId, req.user.collegeId]);
    if (!route) return res.status(404).json({ message: 'Route not found for your college.' });

    const result = await run('INSERT INTO stops (route_id, name, latitude, longitude, stop_order) VALUES (?, ?, ?, ?, ?)', [routeId, name, latitude, longitude, stopOrder || 1]);
    const stop = await get('SELECT * FROM stops WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Stop created successfully', stop });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create stop', error: error.message });
  }
});

app.put('/api/stops/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, latitude, longitude, stopOrder } = req.body;
    const stop = await get('SELECT s.* FROM stops s JOIN routes r ON r.id = s.route_id WHERE s.id = ? AND r.college_id = ?', [req.params.id, req.user.collegeId]);
    if (!stop) return res.status(404).json({ message: 'Stop not found in your college.' });
    await run('UPDATE stops SET name = ?, latitude = ?, longitude = ?, stop_order = ? WHERE id = ?', [name || stop.name, latitude || stop.latitude, longitude || stop.longitude, stopOrder || stop.stop_order, stop.id]);
    const updated = await get('SELECT * FROM stops WHERE id = ?', [stop.id]);
    res.json({ message: 'Stop updated successfully', stop: updated });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update stop', error: error.message });
  }
});

app.delete('/api/stops/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const stop = await get('SELECT s.* FROM stops s JOIN routes r ON r.id = s.route_id WHERE s.id = ? AND r.college_id = ?', [req.params.id, req.user.collegeId]);
    if (!stop) return res.status(404).json({ message: 'Stop not found in your college.' });
    await run('DELETE FROM stops WHERE id = ?', [stop.id]);
    res.json({ message: 'Stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete stop', error: error.message });
  }
});

app.get('/api/trips', authRequired, async (req, res) => {
  try {
    const trips = await all('SELECT * FROM trips WHERE college_id = ? ORDER BY started_at DESC', [req.user.collegeId]);
    res.json({ trips });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch trips', error: error.message });
  }
});

app.post('/api/trips/start', authRequired, requireRole('DRIVER'), async (req, res) => {
  try {
    const { busId, routeId, latitude, longitude } = req.body;
    const bus = await get('SELECT * FROM buses WHERE id = ? AND college_id = ?', [busId, req.user.collegeId]);
    if (!bus) return res.status(404).json({ message: 'Bus not found in your college.' });

    const driver = await get('SELECT * FROM drivers WHERE user_id = ? AND college_id = ?', [req.user.id, req.user.collegeId]);
    const trip = await run('INSERT INTO trips (college_id, bus_id, driver_id, route_id, status, started_at, current_latitude, current_longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.user.collegeId, bus.id, driver.id, routeId || bus.route_id, 'Running', new Date().toISOString(), latitude || bus.current_latitude, longitude || bus.current_longitude]);

    await run('UPDATE buses SET status = ?, current_latitude = ?, current_longitude = ? WHERE id = ?', ['Running', latitude || bus.current_latitude, longitude || bus.current_longitude, bus.id]);
    await run('INSERT INTO bus_locations (college_id, bus_id, trip_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [req.user.collegeId, bus.id, trip.id, latitude || bus.current_latitude, longitude || bus.current_longitude]);

    res.status(201).json({ message: 'Trip started successfully', trip: { ...trip, id: trip.id } });
  } catch (error) {
    res.status(500).json({ message: 'Unable to start trip', error: error.message });
  }
});

app.post('/api/trips/stop', authRequired, requireRole('DRIVER'), async (req, res) => {
  try {
    const { busId } = req.body;
    const trip = await get('SELECT * FROM trips WHERE bus_id = ? AND college_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1', [busId, req.user.collegeId, 'Running']);
    if (!trip) return res.status(404).json({ message: 'No active trip found.' });

    await run('UPDATE trips SET status = ?, ended_at = ? WHERE id = ?', ['Stopped', new Date().toISOString(), trip.id]);
    await run('UPDATE buses SET status = ? WHERE id = ?', ['Stopped', busId]);

    res.json({ message: 'Trip stopped successfully', tripId: trip.id });
  } catch (error) {
    res.status(500).json({ message: 'Unable to stop trip', error: error.message });
  }
});

app.post('/api/bus-location', authRequired, async (req, res) => {
  try {
    const { busId, latitude, longitude } = req.body;
    if (!busId || !latitude || !longitude) {
      return res.status(400).json({ message: 'Bus location details are required.' });
    }

    const bus = await get('SELECT * FROM buses WHERE id = ? AND college_id = ?', [busId, req.user.collegeId]);
    if (!bus) return res.status(404).json({ message: 'Bus not found in your college.' });

    const trip = await get('SELECT * FROM trips WHERE bus_id = ? AND college_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1', [busId, req.user.collegeId, 'Running']);
    const result = await run('INSERT INTO bus_locations (college_id, bus_id, trip_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [req.user.collegeId, busId, trip ? trip.id : null, latitude, longitude]);
    await run('UPDATE buses SET current_latitude = ?, current_longitude = ?, status = ? WHERE id = ?', [latitude, longitude, 'Running', busId]);
    if (trip) {
      await run('UPDATE trips SET current_latitude = ?, current_longitude = ? WHERE id = ?', [latitude, longitude, trip.id]);
    }

    res.status(201).json({ message: 'Location updated successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save bus location', error: error.message });
  }
});

app.get('/api/bus-location/:busId', authRequired, async (req, res) => {
  try {
    const bus = await get('SELECT * FROM buses WHERE id = ? AND college_id = ?', [req.params.busId, req.user.collegeId]);
    if (!bus) return res.status(404).json({ message: 'Bus not found in your college.' });

    const lastLocation = await get('SELECT * FROM bus_locations WHERE bus_id = ? ORDER BY recorded_at DESC LIMIT 1', [req.params.busId]);
    res.json({ bus, lastLocation });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch bus location', error: error.message });
  }
});

app.get('/api/notifications', authRequired, async (req, res) => {
  try {
    const notifications = await all('SELECT * FROM notifications WHERE college_id = ? ORDER BY created_at DESC', [req.user.collegeId]);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch notifications', error: error.message });
  }
});

app.post('/api/notifications', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { audience, type, title, message } = req.body;
    const notification = await run('INSERT INTO notifications (college_id, audience, type, title, message) VALUES (?, ?, ?, ?, ?)', [req.user.collegeId, audience || 'ALL_STUDENTS', type || 'Important', title || 'Notification', message || '']);
    const created = await get('SELECT * FROM notifications WHERE id = ?', [notification.id]);
    res.status(201).json({ message: 'Notification sent successfully', notification: created });
  } catch (error) {
    res.status(500).json({ message: 'Unable to send notification', error: error.message });
  }
});

app.get('/api/dashboard', authRequired, async (req, res) => {
  try {
    const college = await get('SELECT * FROM colleges WHERE id = ?', [req.user.collegeId]);
    const buses = await all(`
      SELECT b.*, r.name AS route_name, u.name AS driver_name
      FROM buses b
      LEFT JOIN routes r ON r.id = b.route_id
      LEFT JOIN drivers d ON d.id = b.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      WHERE b.college_id = ?
      ORDER BY b.id
    `, [req.user.collegeId]);
    const routes = await all('SELECT * FROM routes WHERE college_id = ? ORDER BY id', [req.user.collegeId]);
    const notifications = await all('SELECT * FROM notifications WHERE college_id = ? ORDER BY created_at DESC', [req.user.collegeId]);
    const trips = await all('SELECT * FROM trips WHERE college_id = ? ORDER BY started_at DESC', [req.user.collegeId]);
    const students = await all('SELECT * FROM students WHERE college_id = ?', [req.user.collegeId]);

    res.json({ college, buses, routes, notifications, trips, students });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch dashboard data', error: error.message });
  }
});

app.get('/api/expected-arrival/:busId', authRequired, async (req, res) => {
  try {
    const arrival = await getExpectedArrivalData(Number(req.params.busId), req.user.collegeId);
    if (!arrival) {
      return res.status(404).json({ message: 'Bus not found in your college.' });
    }
    res.json({ arrival });
  } catch (error) {
    res.status(500).json({ message: 'Unable to calculate expected arrival', error: error.message });
  }
});

app.post('/api/notifications/driver', authRequired, requireRole('DRIVER'), async (req, res) => {
  try {
    const { title, message, type = 'Bus started' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    const notification = await run('INSERT INTO notifications (college_id, audience, type, title, message) VALUES (?, ?, ?, ?, ?)', [req.user.collegeId, 'ALL_STUDENTS', type, title, message]);
    const created = await get('SELECT * FROM notifications WHERE id = ?', [notification.id]);
    res.status(201).json({ message: 'Driver notification sent', notification: created });
  } catch (error) {
    res.status(500).json({ message: 'Unable to send driver notification', error: error.message });
  }
});

const startServer = async () => {
  await initDatabase();
  await seedDemoData();
  app.listen(PORT, () => console.log(`College Bus Tracking backend running on http://localhost:${PORT}`));
};

startServer();
