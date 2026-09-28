# College Bus Tracking System

A full-stack college mini project for managing student bus routes, live bus tracking, notifications, and role-based dashboards for students, drivers, and administrators.

## Features

- Multi-college support with data isolation
- Student, driver, and admin roles with secure login
- College-specific bus management, routes, and stops
- Live bus location updates from driver mobile GPS
- Student bus tracking map and expected arrival view
- Notifications for delays, cancellations, holidays, and announcements
- SQLite database with seed data for demo colleges
- Modern responsive frontend interface

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite
- Authentication: JWT + bcrypt
- Map display: Google Maps embed using live coordinates

## Project Structure

- frontend/
- backend/
- database/
- README.md

## Installation

1. Open a terminal in the project root.
2. Install all dependencies:
   npm install
   npm --prefix backend install
   npm --prefix frontend install

## Environment Variables

Copy the sample file:

- backend/.env.example -> backend/.env

Then set values:

- PORT=5000
- JWT_SECRET=your_secret_key
- FRONTEND_URL=http://localhost:5173
- GOOGLE_MAPS_API_KEY=your_key_here

## Database Setup

The database is created automatically when the backend starts. The schema is defined in:

- database/schema.sql

On first run, the app seeds demo data for two colleges, admin accounts, sample buses, routes, drivers, and students.

## Run the Application

Backend:

- cd backend
- npm run dev

Frontend:

- cd frontend
- npm run dev

Then open:

- http://localhost:5173

## Test Login Credentials

Admin - City Tech College
- Email: principal@ctc.edu
- Password: admin123

Student - City Tech College
- Email: asha@ctc.edu
- Password: student123

Driver - City Tech College
- Email: driver1@ctc.edu
- Password: driver123

## How Live Tracking Works

1. The driver logs in and opens the driver dashboard.
2. The driver clicks Start Trip and allows location access.
3. The device GPS sends latitude/longitude to the backend at intervals.
4. The backend stores the latest location in bus_locations and updates the current bus status.
5. Students view the latest coordinates in the map page.

## How Notifications Work

Admins can create notifications for a target audience such as all students, drivers, or the college. Notifications are stored per college and displayed in the relevant dashboard.

## Google Maps

The application uses live coordinates in an embedded Google Maps URL for map display. You may replace the embed with a full Google Maps JavaScript API integration if you want a more advanced map UI.

## Notes

- Each college has isolated data.
- Students and drivers can only see their own college data.
- Admin actions are restricted to the assigned college.
