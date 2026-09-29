import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE } from '../App.jsx';

const roleNames = { STUDENT: 'Student', DRIVER: 'Driver', ADMIN: 'Admin / Principal' };
const settingDefaults = {
  pushNotifications: true,
  tripAlerts: true,
  emailUpdates: false,
  locationAccess: true,
  biometricLock: false,
};

const Icon = ({ name }) => {
  const paths = {
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.2.9-1.2 2.1-1.4-.6a8 8 0 0 1-1.5.9l-.2 1.5h-2.5l-.3-1.5a8 8 0 0 1-1.5-.9l-1.4.6-1.2-2.1 1.2-.9a7 7 0 0 1 0-1.8l-1.2-.9 1.2-2.1 1.4.6a8 8 0 0 1 1.5-.9l.3-1.5h2.5l.2 1.5a8 8 0 0 1 1.5.9l1.4-.6 1.2 2.1-1.2.9a7 7 0 0 1 0 1.8Z" /></>,
    shield: <><path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1-1.8 1.3-1.8 2.7m0 3h.01" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6m-6 4h6" /></>,
    school: <><path d="m2 9 10-6 10 6-10 6L2 9Z" /><path d="M6 12v5c4 3 8 3 12 0v-5m4-3v7" /></>,
    students: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.3-3.2 2.2-5 6-5s5.7 1.8 6 5m1-12a3 3 0 0 1 0 6m2 2c2.1.6 3.2 1.9 3.5 4" /></>,
    bus: <><path d="M5 17V6c0-2 2-3 7-3s7 1 7 3v11M5 10h14M7 17v3m10-3v3M5 17h14" /><circle cx="8" cy="14" r="1" /><circle cx="16" cy="14" r="1" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h4a4 4 0 0 0 4-4V10a4 4 0 0 1 4-4" /></>,
    message: <><path d="M4 5h16v12H9l-5 4z" /><path d="M8 9h8m-8 4h5" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };

  return <svg className="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
};

const readSettings = (userId) => {
  try {
    return { ...settingDefaults, ...JSON.parse(localStorage.getItem(`collegeBusProfileSettings-${userId}`) || '{}') };
  } catch {
    return settingDefaults;
  }
};

export default function ProfileSection({ role, user, transport = {}, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(user || {});
  const [college, setCollege] = useState(null);
  const [studentRecord, setStudentRecord] = useState(null);
  const [studentStops, setStudentStops] = useState([]);
  const [driverRecord, setDriverRecord] = useState(null);
  const [adminData, setAdminData] = useState({ students: [], drivers: [], stops: [] });
  const [managedNotifications, setManagedNotifications] = useState([]);
  const [avatar, setAvatar] = useState(() => localStorage.getItem(`collegeBusAvatar-${user?.id}`) || '');
  const [settings, setSettings] = useState(() => readSettings(user?.id));
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationForm, setNotificationForm] = useState({ audience: 'ALL_STUDENTS', type: 'Important', title: '', message: '' });
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const routeParts = location.pathname.split('/').filter(Boolean);
  const screen = routeParts[2] || 'overview';
  const go = (target) => navigate(`/${role.toLowerCase()}/${target}`);
  const goToProfileScreen = (target) => navigate(`/${role.toLowerCase()}/profile/${target}`);
  const currentRole = profile.role || role;

  useEffect(() => {
    const token = localStorage.getItem('collegeBusToken');
    const headers = { Authorization: `Bearer ${token}` };
    const loadProfileData = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, { headers });
        const data = await response.json();
        if (response.ok) {
          setProfile(data.user);
          setProfileForm({ name: data.user.name || '', email: data.user.email || '', phone: data.user.phone || '' });
          setCollege(data.college);
        }
      } catch {
        setNotice('Profile details are temporarily unavailable.');
      }

      if (role === 'STUDENT') {
        const record = (transport.students || []).find((item) => Number(item.user_id) === Number(user?.id));
        setStudentRecord(record || null);
      }

      if (role === 'DRIVER') {
        try {
          const response = await fetch(`${API_BASE}/drivers`, { headers });
          const data = await response.json();
          if (response.ok) setDriverRecord((data.drivers || [])[0] || null);
        } catch {
          setDriverRecord(null);
        }
      }

      if (role === 'ADMIN') {
        try {
          const [studentsRes, driversRes, stopsRes] = await Promise.all([
            fetch(`${API_BASE}/students`, { headers }),
            fetch(`${API_BASE}/drivers`, { headers }),
            fetch(`${API_BASE}/stops`, { headers }),
          ]);
          const [studentsData, driversData, stopsData] = await Promise.all([studentsRes.json(), driversRes.json(), stopsRes.json()]);
          setAdminData({ students: studentsData.students || [], drivers: driversData.drivers || [], stops: stopsData.stops || [] });
        } catch {
          setNotice('Some college management data could not be loaded.');
        }
      }
    };
    loadProfileData();
  }, [role, transport.students, user?.id]);

  useEffect(() => {
    if (role !== 'STUDENT' || !transport.bus?.route_id) return;
    const token = localStorage.getItem('collegeBusToken');
    fetch(`${API_BASE}/stops?routeId=${transport.bus.route_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setStudentStops(data.stops || []))
      .catch(() => setStudentStops([]));
  }, [role, transport.bus?.route_id]);

  const updateSettings = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(`collegeBusProfileSettings-${profile.id}`, JSON.stringify(next));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('collegeBusToken')}` },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update profile.');
      setProfile(data.user);
      localStorage.setItem('collegeBusUser', JSON.stringify(data.user));
      setNotice(data.message);
    } catch (error) {
      setNotice(error.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('collegeBusToken')}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to change password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(data.message);
    } catch (error) {
      setNotice(error.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  const updateAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1_500_000) {
      setNotice('Choose an image smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result || '');
      setAvatar(image);
      localStorage.setItem(`collegeBusAvatar-${profile.id}`, image);
    };
    reader.readAsDataURL(file);
  };

  const profileItems = [
    { label: 'Personal Information', description: 'Your contact and account details', icon: 'user', screen: 'personal-information' },
    { label: 'Change Password', description: 'Update your sign-in credentials', icon: 'key', screen: 'change-password' },
    { label: 'Notification Settings', description: 'Choose which updates you receive', icon: 'bell', screen: 'notification-settings' },
    { label: 'App Settings', description: 'Manage preferences for this device', icon: 'settings', screen: 'app-settings' },
    { label: 'Privacy & Security', description: 'Account protection and privacy', icon: 'shield', screen: 'privacy-security' },
    { label: 'Help & Support', description: 'Get help with your account', icon: 'help', screen: 'help-support' },
    { label: 'About Application', description: 'Version and application details', icon: 'info', screen: 'about-application' },
    { label: 'Terms & Conditions', description: 'Review the terms of service', icon: 'file', screen: 'terms-conditions' },
    { label: 'Privacy Policy', description: 'How account data is handled', icon: 'shield', screen: 'privacy-policy' },
  ];
  const adminItems = [
    { label: 'College Management', description: 'College overview and operations', icon: 'school', screen: 'college-management' },
    { label: 'Manage Students', description: `${adminData.students.length} registered students`, icon: 'students', screen: 'manage-students' },
    { label: 'Manage Drivers', description: `${adminData.drivers.length} assigned drivers`, icon: 'user', screen: 'manage-drivers' },
    { label: 'Manage Buses', description: `${transport.buses?.length || 0} college buses`, icon: 'bus', screen: 'manage-buses' },
    { label: 'Manage Routes & Stops', description: 'View college routes and pickup stops', icon: 'route', screen: 'manage-routes-stops' },
    { label: 'Notifications Management', description: 'Send and review college updates', icon: 'message', screen: 'notifications-management' },
  ];

  const profileRow = (item) => (
    <button className="profile-list-item" key={item.screen} type="button" onClick={() => goToProfileScreen(item.screen)}>
      <span className="profile-list-icon"><Icon name={item.icon} /></span>
      <span className="profile-list-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
      <span className="profile-chevron" aria-hidden="true">›</span>
    </button>
  );

  const pageHeading = {
    'personal-information': 'Personal Information',
    'edit-profile': 'Edit Profile',
    'change-password': 'Change Password',
    'notification-settings': 'Notification Settings',
    'app-settings': 'App Settings',
    'privacy-security': 'Privacy & Security',
    'help-support': 'Help & Support',
    'about-application': 'About Application',
    'terms-conditions': 'Terms & Conditions',
    'privacy-policy': 'Privacy Policy',
    'college-management': 'College Management',
    'manage-students': 'Manage Students',
    'manage-drivers': 'Manage Drivers',
    'manage-buses': 'Manage Buses',
    'manage-routes-stops': 'Manage Routes & Stops',
    'notifications-management': 'Notifications Management',
  }[screen];

  const detail = (label, value) => <div className="profile-detail" key={label}><small>{label}</small><strong>{value || 'Not provided'}</strong></div>;
  const settingsToggle = (key, title, description) => (
    <label className="profile-setting" key={key}>
      <span><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => updateSettings(key, event.target.checked)} />
    </label>
  );

  const renderTransportSummary = () => {
    if (role === 'STUDENT') {
      const selectedBus = transport.bus;
      return <div className="profile-summary-grid">
        {detail('College', college?.name)}
        {detail('Student ID', studentRecord?.id ? `STU-${studentRecord.id}` : `STU-${profile.id || '—'}`)}
        {detail('Year / Department', [studentRecord?.year, studentRecord?.department].filter(Boolean).join(' • '))}
        {detail('Selected bus', selectedBus ? `${selectedBus.bus_number} · ${selectedBus.name || ''}` : 'No bus selected')}
        {detail('Route', transport.route?.name || selectedBus?.route_name)}
        {detail('Stops', studentStops.map((stop) => stop.name).join(' · ') || transport.arrival?.nearestStop || 'Not available')}
      </div>;
    }
    if (role === 'DRIVER') {
      return <div className="profile-summary-grid">
        {detail('College', college?.name)}
        {detail('Driver ID', driverRecord?.id ? `DRV-${driverRecord.id}` : `DRV-${profile.id || '—'}`)}
        {detail('Assigned bus', transport.bus ? `${transport.bus.bus_number} · ${transport.bus.name || ''}` : 'No bus assigned')}
        {detail('Bus status', transport.bus?.status)}
        {detail('Route', transport.route?.name)}
        {detail('Route details', transport.route?.description)}
        {detail('Stops', (transport.stops || []).map((stop) => stop.name).join(' · '))}
      </div>;
    }
    return <div className="profile-summary-grid">
      {detail('College', college?.name)}
      {detail('Admin ID', `ADM-${profile.id || '—'}`)}
      {detail('Position', 'Admin / Principal')}
      {detail('College ID', profile.collegeId)}
    </div>;
  };

  const renderAdminScreen = () => {
    if (screen === 'college-management') return <>
      <div className="profile-stats"><div><strong>{adminData.students.length}</strong><small>Students</small></div><div><strong>{adminData.drivers.length}</strong><small>Drivers</small></div><div><strong>{transport.buses?.length || 0}</strong><small>Buses</small></div><div><strong>{transport.routes?.length || 0}</strong><small>Routes</small></div></div>
      <div className="profile-panel"><h3>{college?.name || 'College details'}</h3><p>{college?.address || 'College address is not available.'}</p><p className="profile-muted">College code: {college?.code || 'Not available'} · Account: {profile.email}</p></div>
    </>;
    if (screen === 'manage-students') return <div className="profile-data-list">{adminData.students.length ? adminData.students.map((item) => <div className="profile-data-row" key={item.id}><span className="profile-data-avatar"><Icon name="students" /></span><span><strong>{item.name}</strong><small>{item.email} · {item.year || 'Year not set'} · {item.department || 'Department not set'}</small></span><b>#{item.id}</b></div>) : <p className="profile-muted">No students are registered yet.</p>}</div>;
    if (screen === 'manage-drivers') return <div className="profile-data-list">{adminData.drivers.length ? adminData.drivers.map((item) => <div className="profile-data-row" key={item.id}><span className="profile-data-avatar"><Icon name="user" /></span><span><strong>{item.name}</strong><small>{item.email} · {item.bus_number || 'No bus assigned'}</small></span><b>#{item.id}</b></div>) : <p className="profile-muted">No drivers are assigned yet.</p>}</div>;
    if (screen === 'manage-buses') return <div className="profile-data-list">{transport.buses?.length ? transport.buses.map((item) => <div className="profile-data-row" key={item.id}><span className="profile-data-avatar"><Icon name="bus" /></span><span><strong>{item.bus_number} · {item.name}</strong><small>{item.route_name || 'No route assigned'}</small></span><b className="profile-status">{item.status}</b></div>) : <p className="profile-muted">No buses have been added.</p>}</div>;
    if (screen === 'manage-routes-stops') return <div className="profile-data-list">{transport.routes?.map((item) => <section className="profile-route" key={item.id}><strong>{item.name}</strong><p>{item.description || 'No route description'}</p>{adminData.stops.filter((stop) => Number(stop.route_id) === Number(item.id)).map((stop) => <small key={stop.id}>{stop.stop_order}. {stop.name} · {stop.latitude}, {stop.longitude}</small>)}</section>)}{!transport.routes?.length && <p className="profile-muted">No routes are configured.</p>}</div>;
    if (screen === 'notifications-management') return <>
      <form className="form profile-form" onSubmit={async (event) => {
        event.preventDefault();
        try {
          const response = await fetch(`${API_BASE}/notifications`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('collegeBusToken')}` }, body: JSON.stringify(notificationForm) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Unable to send notification.');
          setManagedNotifications((current) => [data.notification, ...current]);
          setNotice(data.message || 'Notification sent.');
          setNotificationForm({ ...notificationForm, title: '', message: '' });
        } catch (error) { setNotice(error.message || 'Unable to send notification.'); }
      }}>
        <div className="field"><label>Audience</label><select value={notificationForm.audience} onChange={(event) => setNotificationForm({ ...notificationForm, audience: event.target.value })}><option value="ALL_STUDENTS">All students</option><option value="DRIVERS">Drivers</option><option value="COLLEGE">This college</option><option value="ALL_USERS">All users</option></select></div>
        <div className="field"><label>Type</label><select value={notificationForm.type} onChange={(event) => setNotificationForm({ ...notificationForm, type: event.target.value })}><option>Important</option><option>Holiday</option><option>Bus delayed</option><option>Bus cancelled</option><option>Bus started</option></select></div>
        <div className="field"><label>Title</label><input value={notificationForm.title} onChange={(event) => setNotificationForm({ ...notificationForm, title: event.target.value })} required /></div>
        <div className="field"><label>Message</label><textarea value={notificationForm.message} onChange={(event) => setNotificationForm({ ...notificationForm, message: event.target.value })} rows="3" required /></div>
        <button className="primary-btn" type="submit">Send Notification</button>
      </form>
      <div className="profile-data-list">{[...managedNotifications, ...(transport.notifications || [])].map((item, index) => <div className="profile-notification" key={item?.id || `new-${index}`}><strong>{item.title}</strong><p>{item.message}</p><small>{item.type} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}</small></div>)}</div>
    </>;
    return null;
  };

  const renderDetailScreen = () => {
    if (['manage-students', 'manage-drivers', 'manage-buses', 'manage-routes-stops', 'college-management', 'notifications-management'].includes(screen)) return renderAdminScreen();
    if (screen === 'personal-information') return <div className="profile-panel"><div className="profile-summary-grid">{detail('Full name', profile.name)}{detail('Email address', profile.email)}{detail('Mobile number', profile.phone)}{detail('User ID', profile.id)}{detail('Role', roleNames[currentRole])}{detail('College', college?.name)}</div></div>;
    if (screen === 'edit-profile') return <form className="form profile-form" onSubmit={saveProfile}><div className="field"><label>Full name</label><input autoComplete="name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required /></div><div className="field"><label>Email address</label><input type="email" autoComplete="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} required /></div><div className="field"><label>Mobile number</label><input type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></div><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></form>;
    if (screen === 'change-password') return <form className="form profile-form" onSubmit={savePassword}><div className="field"><label>Current password</label><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></div><div className="field"><label>New password</label><input type="password" autoComplete="new-password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></div><div className="field"><label>Confirm new password</label><input type="password" autoComplete="new-password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></div><button className="primary-btn" disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</button></form>;
    if (screen === 'notification-settings') return <div className="profile-settings-list">{settingsToggle('pushNotifications', 'Push notifications', 'Receive important account updates')}{settingsToggle('tripAlerts', 'Trip and bus alerts', 'Service changes and trip updates')}{settingsToggle('emailUpdates', 'Email updates', 'Receive selected updates by email')}</div>;
    if (screen === 'app-settings') return <div className="profile-settings-list">{settingsToggle('locationAccess', 'Location access', 'Allow location features while using bus tracking')}{settingsToggle('biometricLock', 'Biometric lock', 'Require device biometrics when supported')}<div className="profile-panel"><strong>Display</strong><p className="profile-muted">Blue and white · Automatic device text sizing</p></div></div>;
    if (screen === 'privacy-security') return <div className="profile-data-list"><div className="profile-panel"><h3>Account security</h3><p>Your account is protected by authenticated access. Your password is never shown in the application.</p><button className="secondary-btn" type="button" onClick={() => goToProfileScreen('change-password')}>Change Password</button></div><div className="profile-panel"><h3>Data access</h3><p>College transport information is available according to your assigned role and college.</p></div></div>;
    if (screen === 'help-support') return <div className="profile-panel"><span className="profile-help-icon"><Icon name="help" /></span><h3>How can we help?</h3><p>For account, route or bus service support, contact your college transport office.</p><a className="primary-btn profile-link-button" href={`mailto:${college?.support_email || 'support@collegebus.app'}?subject=College%20Bus%20Tracking%20Support`}>Contact Support</a><p className="profile-muted">Include your user ID ({profile.id}) when contacting support.</p></div>;
    if (screen === 'about-application') return <div className="profile-panel"><span className="profile-app-mark">B</span><h3>College Bus Tracking System</h3><p>College transport, trip updates and bus tracking in one place.</p><div className="profile-detail"><small>Application version</small><strong>1.0.0</strong></div><div className="profile-detail"><small>Signed in as</small><strong>{roleNames[currentRole]}</strong></div></div>;
    if (screen === 'terms-conditions') return <div className="profile-panel profile-legal"><h3>Terms & Conditions</h3><p>Use this application for college transport services associated with your account. Keep your sign-in credentials private and ensure that account information remains accurate.</p><p>Bus locations and arrival estimates are provided for convenience and may change with traffic, GPS availability or service conditions. Follow instructions from your college transport team and driver.</p><p>Access to management tools is limited by your account role. Misuse or unauthorized access may result in account restrictions under college policy.</p></div>;
    if (screen === 'privacy-policy') return <div className="profile-panel profile-legal"><h3>Privacy Policy</h3><p>The application uses your account details and college association to provide role-appropriate transport features.</p><p>Bus location and trip data are used to provide tracking and service updates. Location access is used only for relevant tracking features and follows your device permissions.</p><p>Account and transport records are handled by your college system. Contact your college administrator for data questions or requests.</p></div>;
    return null;
  };

  if (screen !== 'overview') return <div className="profile-page">
    <button className="profile-back" type="button" onClick={() => go('profile')}><span aria-hidden="true">‹</span> Profile</button>
    <header className="profile-subheader"><span className="profile-role-label">{roleNames[currentRole]}</span><h2>{pageHeading || 'Profile'}</h2></header>
    {notice && <p className="profile-notice" role="status">{notice}</p>}
    {renderDetailScreen()}
  </div>;

  return <div className="profile-page">
    <section className="profile-hero">
      <div className="profile-hero-top"><span className="profile-role-label">{roleNames[currentRole]}</span><span className="profile-member-id">ID · {profile.id || '—'}</span></div>
      <div className="profile-identity">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{avatar ? <img src={avatar} alt="Profile" /> : <span>{(profile.name || 'U').trim().charAt(0).toUpperCase()}</span>}</div>
          <label className="profile-avatar-edit" title="Change profile photo"><Icon name="user" /><input type="file" accept="image/*" onChange={updateAvatar} aria-label="Change profile photo" /></label>
        </div>
        <div className="profile-identity-copy"><h2>{profile.name || 'Your profile'}</h2><p>{profile.email || 'Email not provided'}</p><span>{profile.phone || 'Add a mobile number'}</span></div>
      </div>
      <button className="profile-edit-button" type="button" onClick={() => goToProfileScreen('edit-profile')}>Edit Profile <span aria-hidden="true">↗</span></button>
    </section>

    {notice && <p className="profile-notice" role="status">{notice}</p>}

    <section className="profile-role-card">
      <div className="profile-section-heading"><div><span className="profile-kicker">ACCOUNT OVERVIEW</span><h3>{role === 'ADMIN' ? 'College account' : 'Transport details'}</h3></div><span className="profile-heading-icon"><Icon name={role === 'ADMIN' ? 'school' : role === 'DRIVER' ? 'bus' : 'route'} /></span></div>
      {renderTransportSummary()}
      {role === 'ADMIN' && <button className="profile-inline-link" type="button" onClick={() => goToProfileScreen('college-management')}>Open College Management <span>›</span></button>}
    </section>

    {role === 'ADMIN' && <section className="profile-menu-section"><div className="profile-section-heading"><div><span className="profile-kicker">ADMINISTRATION</span><h3>College Management</h3></div></div><div className="profile-list">{adminItems.map(profileRow)}</div></section>}

    <section className="profile-menu-section"><div className="profile-section-heading"><div><span className="profile-kicker">YOUR ACCOUNT</span><h3>Profile & Preferences</h3></div></div><div className="profile-list">{profileItems.map(profileRow)}</div></section>

    <button className="profile-logout" type="button" onClick={onLogout}><Icon name="logout" />Log out</button>
    <p className="profile-version">College Bus Tracking · Version 1.0.0</p>
  </div>;
}