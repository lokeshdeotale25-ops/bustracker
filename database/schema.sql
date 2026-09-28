CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('STUDENT','DRIVER','ADMIN')),
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(college_id) REFERENCES colleges(id)
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  college_id INTEGER NOT NULL,
  year TEXT,
  department TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(college_id) REFERENCES colleges(id)
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  college_id INTEGER NOT NULL,
  license_number TEXT,
  bus_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(college_id) REFERENCES colleges(id),
  FOREIGN KEY(bus_id) REFERENCES buses(id)
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  college_id INTEGER NOT NULL,
  designation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(college_id) REFERENCES colleges(id)
);

CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(college_id) REFERENCES colleges(id)
);

CREATE TABLE IF NOT EXISTS stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(route_id) REFERENCES routes(id)
);

CREATE TABLE IF NOT EXISTS buses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  bus_number TEXT NOT NULL,
  name TEXT,
  route_id INTEGER,
  driver_id INTEGER,
  status TEXT NOT NULL DEFAULT 'Stopped',
  capacity INTEGER DEFAULT 40,
  current_latitude REAL,
  current_longitude REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(college_id) REFERENCES colleges(id),
  FOREIGN KEY(route_id) REFERENCES routes(id),
  FOREIGN KEY(driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  bus_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  route_id INTEGER,
  status TEXT NOT NULL DEFAULT 'Running',
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  current_latitude REAL,
  current_longitude REAL,
  FOREIGN KEY(college_id) REFERENCES colleges(id),
  FOREIGN KEY(bus_id) REFERENCES buses(id),
  FOREIGN KEY(driver_id) REFERENCES drivers(id),
  FOREIGN KEY(route_id) REFERENCES routes(id)
);

CREATE TABLE IF NOT EXISTS bus_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  bus_id INTEGER NOT NULL,
  trip_id INTEGER,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(college_id) REFERENCES colleges(id),
  FOREIGN KEY(bus_id) REFERENCES buses(id),
  FOREIGN KEY(trip_id) REFERENCES trips(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id INTEGER NOT NULL,
  user_id INTEGER,
  audience TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(college_id) REFERENCES colleges(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_college_role ON users(college_id, role);
CREATE INDEX IF NOT EXISTS idx_buses_college ON buses(college_id);
CREATE INDEX IF NOT EXISTS idx_routes_college ON routes(college_id);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id);
CREATE INDEX IF NOT EXISTS idx_notifications_college ON notifications(college_id);
