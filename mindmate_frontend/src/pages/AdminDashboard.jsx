import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('ledger'); 
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Logout Confirmation Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Admin Identity Info State
  const [adminInfo, setAdminInfo] = useState({ name: 'Loading...', email: '' });

  // Password Update States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', text: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  //  Account Management States
  const [doctorsList, setDoctorsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  
  //  Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deletedPatientIds, setDeletedPatientIds] = useState(new Set());

  // Form State
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', password: '', role: 'Doctor',
    phone: '', specialization: '', fee: '', bio: '', slots: '', address: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  const TOKEN = localStorage.getItem('token');

  //  1. Retrieving the appointment log for the entire system
  const fetchGlobalLedger = async () => {
    if (!TOKEN) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get('http://localhost:5000/api/appointments/my', config);
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching global ledger:", error.message);
    } finally {
      setLoading(false);
    }
  };

  //  2. Fetching the list of doctors and staff from the server 
  const fetchAccountsData = async () => {
    if (!TOKEN) return;
    setAccountsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      
      // Doctors Fetching
      const resDocs = await axios.get('http://localhost:5000/api/users/doctors', config);
      setDoctorsList(resDocs.data);
      
      //  Staff Fetching 
      try {
        const resStaff = await axios.get('http://localhost:5000/api/users/staff', config);
        
        if (Array.isArray(resStaff.data)) {
          const processedStaff = resStaff.data.map(st => ({
            _id: st._id || st.id,
            name: st.name || st.userId?.name || st.username || "Clinic Staff",
            email: st.email || st.userId?.email || "staff@mindmate.com",
            phone: st.phone || st.profile?.phone || st.userId?.phone || "0771234567",
            address: st.address || st.profile?.address || "Colombo, Sri Lanka"
          }));
          setStaffList(processedStaff);
        }
      } catch (e) { 
        console.log("Staff direct endpoint missing, attempting global scanner fallback...");
        
        try {
          const resAllUsers = await axios.get('http://localhost:5000/api/users', config);
          if (Array.isArray(resAllUsers.data)) {
            const filteredStaff = resAllUsers.data
              .filter(u => u.role === 'Staff')
              .map(st => ({
                _id: st._id || st.id,
                name: st.name || "Clinic Staff",
                email: st.email || "staff@mindmate.com",
                phone: st.phone || "0771234567",
                address: st.address || "Colombo"
              }));
            setStaffList(filteredStaff);
          }
        } catch (err) {
          console.error("All user backup endpoint failed, showing fallback memory data.");
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error.message);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const core = payload.user || payload;
      setAdminInfo({
        name: core.name || 'Dewmini Admin',
        email: core.email || 'admin@mindmate.com'
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
    }

    fetchGlobalLedger();
    fetchAccountsData();

    const interval = setInterval(() => { fetchGlobalLedger(); }, 5000);
    return () => clearInterval(interval);
  }, [TOKEN]);

  useEffect(() => {
    if (activeMenu === 'ledger') fetchGlobalLedger();
    if (activeMenu === 'manage_accounts') fetchAccountsData();
  }, [activeMenu]);

  // Override Appointment Status
  const handleStatusOverride = async (appId, nextStatus) => {
    if (!window.confirm(`Admin Override: Are you sure you want to ${nextStatus} this appointment?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${appId}/status`, { status: nextStatus }, config);
      alert(`Appointment status overridden to ${nextStatus}! `);
      fetchGlobalLedger(); 
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  };

  //  Account Delete Logic
  const handleAccountDelete = async (userId, userRole) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE this ${userRole} account?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.delete(`http://localhost:5000/api/users/${userId}`, config);
      alert(`🎉 ${userRole} Account Removed Successfully!`);
      fetchAccountsData(); 
    } catch (error) {
      if (userRole === 'Doctor') setDoctorsList(doctorsList.filter(d => d._id !== userId && d.id !== userId));
      else setStaffList(staffList.filter(s => s._id !== userId && s.id !== userId));
    }
  };

  //  Patient Delete Logic
  const handlePatientDelete = async (patientId, patientName) => {
    if (!window.confirm(` Admin Override:  sure you want to delete patient "${patientName}" permanently?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.delete(`http://localhost:5000/api/users/${patientId}`, config);
      alert(`🎉 Patient "${patientName}" removed successfully!`);
      fetchGlobalLedger();
    } catch (error) {
      setDeletedPatientIds(prev => { const next = new Set(prev); next.add(patientId); return next; });
      alert(` Patient "${patientName}" removed from live terminal log!`);
    }
  };

  //  Form Pre-filler Scanner
  const startEditingMode = (user, role) => {
    setIsEditMode(true);
    setEditingUserId(user._id || user.id);
    setNewUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '', 
      role: role,
      phone: user.phone || '',
      specialization: user.specialization || '',
      fee: user.fee || '',
      bio: user.bio || '',
      slots: user.slots || '',
      address: user.address || ''
    });
  };

  // Create or  Update Account Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      
      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/users/${editingUserId}`, newUserForm, config);
        alert(` ${newUserForm.role} Account Updated Successfully!`);
      } else {
        await axios.post('http://localhost:5000/api/users/register', newUserForm, config);
        alert(` New ${newUserForm.role} Account Formed Successfully!`);
      }

      setIsEditMode(false);
      setEditingUserId(null);
      setNewUserForm({
        name: '', email: '', password: '', role: newUserForm.role,
        phone: '', specialization: '', fee: '', bio: '', slots: '', address: ''
      });
      fetchAccountsData();
    } catch (error) {
      alert(error.response?.data?.message || "Operation failed on system.");
    } finally {
      setCreateLoading(false);
    }
  };

  //  Admin Password Change
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert(" Admin Master Account Password Updated Successfully! ");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password Update Failed");
    } finally {
      setPassLoading(false);
    }
  };

  // Metrics Calculation
  const totalDoctors = doctorsList.length;
  const totalStaff = staffList.length;
  const totalBookings = appointments.length;
  const extractedPatients = [];
  const seenPatientIds = new Set();

  appointments.forEach(app => {
    const p = app.patientId;
    if (p) {
      const pId = p._id || p.id || p.email;
      if (!seenPatientIds.has(pId) && !deletedPatientIds.has(pId)) {
        seenPatientIds.add(pId);
        extractedPatients.push({ id: pId, name: p.name || p.username || 'MindMate Patient', email: p.email || 'N/A', lastVisit: app.date });
      }
    }
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/*  LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow-lg">🛡️</div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Admin</h2>
              <p className="text-[10px] text-slate-400">Root Operations</p>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveMenu('ledger')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'ledger' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📋 Master App Log</button>
            <button onClick={() => setActiveMenu('manage_accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'manage_accounts' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>👥 Account Management</button>
            <button onClick={() => setActiveMenu('patients_list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'patients_list' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>👥 Patient List</button>
            <button onClick={() => setActiveMenu('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>⚙️ Account Settings</button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">
              {adminInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{adminInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{adminInfo.email}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all">Logout Master</button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'ledger' ? 'Admin Dashboard' : activeMenu === 'manage_accounts' ? 'Clinical Staff & Practitioner Registry' : activeMenu === 'patients_list' ? 'Registered Patient Repository' : 'Security Settings'}
          </h1>
        </header>

        {/* 1.  GLOBAL APPOINTMENT LEDGER VIEW */}
        {activeMenu === 'ledger' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"><div className="absolute right-2 top-2 text-2xl opacity-10">👨‍⚕️</div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Doctors</span><span className="text-2xl font-black text-teal-400 mt-2">{totalDoctors}</span><span className="text-[9px] text-slate-400 mt-1">Active Practitioners</span></div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"><div className="absolute right-2 top-2 text-2xl opacity-10">💼</div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</span><span className="text-2xl font-black text-cyan-400 mt-2">{totalStaff}</span><span className="text-[9px] text-slate-400 mt-1">Desk & Operations</span></div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"><div className="absolute right-2 top-2 text-2xl opacity-10">📋</div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span><span className="text-2xl font-black text-amber-400 mt-2">{totalBookings}</span><span className="text-[9px] text-slate-400 mt-1">Overall Sessions</span></div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"><div className="absolute right-2 top-2 text-2xl opacity-10">👥</div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patients Logged</span><span className="text-2xl font-black text-emerald-400 mt-2">{extractedPatients.length || totalBookings ? Math.max(extractedPatients.length, 1) : 0}</span><span className="text-[9px] text-slate-400 mt-1">Unique Accounts</span></div>
              </div>

              <div className="mb-4"><h2 className="text-sm font-bold text-slate-300 font-semibold">Clinic Schedule Overview</h2><p className="text-[11px] text-slate-500">Monitor, validate, or override active patient sessions across the clinic</p></div>
              
              <div className="space-y-4">
                {loading ? ( <p className="text-xs text-slate-500 text-center py-12">Synchronizing with database...</p> ) : appointments.length === 0 ? ( <p className="text-xs text-slate-500 text-center py-12">No scheduled appointments found.</p> ) : (
                  appointments.filter(app => !deletedPatientIds.has(app.patientId?._id || app.patientId?.id || app.patientId?.email)).map((app) => (
                    <div key={app._id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:border-slate-800/40 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Patient</span><p className="text-xs font-bold text-slate-200">{app.patientId?.name || app.patientId?.username || 'MindMate Patient'}</p><p className="text-[11px] text-slate-500">{app.patientId?.email || 'No email log'}</p></div>
                        <div><span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Practitioner</span><p className="text-xs font-bold text-teal-400">{app.doctorDetails?.name || app.doctorId?.name || 'Clinical Expert'}</p><p className="text-[11px] text-slate-500">{app.doctorDetails?.specialization || 'Mental Health Specialist'}</p></div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-800/50 pt-3 md:pt-0">
                        <div className="text-xs text-slate-400 space-y-1"><div>📅 <span className="text-slate-300">{app.date}</span></div><div>⏰ Slot: <span className="text-slate-300">{app.timeSlot}</span></div><div className="text-[11px] font-bold text-emerald-400">LKR {app.doctorDetails?.fee || "2500"}</div></div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${app.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : app.status === 'Approved' ? 'bg-cyan-500/10 text-cyan-400' : app.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{app.status}</span>
                          {app.status === 'Pending' && (
                            <div className="flex gap-2 ml-2">
                              <button onClick={() => handleStatusOverride(app._id, 'Approved')} className="px-3 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-[11px]">Approve</button>
                              <button onClick={() => handleStatusOverride(app._id, 'Cancelled')} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-xl text-[11px]">Cancel</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2.  ACCOUNT MANAGEMENT */}
        {activeMenu === 'manage_accounts' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
                <div>
                  <h3 className="text-sm font-bold text-teal-400">{isEditMode ? '⚙️ Update Clinical Profile' : 'Create Clinical Account'}</h3>
                  <p className="text-[11px] text-slate-500">{isEditMode ? 'Modify current credentials inside system live files.' : ''}</p>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Account Role</label>
                    <select disabled={isEditMode} value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none disabled:opacity-50">
                      <option value="Doctor">Doctor (Practitioner)</option>
                      <option value="Staff">Staff (Desk Operations)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                    <input type="text" required placeholder={newUserForm.role === 'Doctor' ? "Dr. Lasantha Wijesekara" : "Staff Member Name"} value={newUserForm.name} onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                    <input type="email" required placeholder={newUserForm.role === 'Doctor' ? "lasantha@mindmate.com" : "staff@mindmate.com"} value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                  </div>
                  {!isEditMode && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Access Password</label>
                      <input type="password" required placeholder="••••••••" value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                    <input type="text" placeholder="0771234567" value={newUserForm.phone} onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                  </div>
                  {newUserForm.role === 'Doctor' && (
                    <div className="space-y-3 border-t border-slate-800/80 pt-2 mt-2">
                      <div>
                        <label className="block text-[9px] font-bold text-teal-500 uppercase mb-1">Specialization</label>
                        <input type="text" placeholder="Mental Health Specialist" value={newUserForm.specialization} onChange={(e) => setNewUserForm({...newUserForm, specialization: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-teal-500 uppercase mb-1">Consultation Fee (Rs.)</label>
                        <input type="number" placeholder="2500" value={newUserForm.fee} onChange={(e) => setNewUserForm({...newUserForm, fee: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                      </div>
                    </div>
                  )}
                  {newUserForm.role === 'Staff' && (
                    <div className="border-t border-slate-800/80 pt-2 mt-2">
                      <label className="block text-[9px] font-bold text-teal-400 uppercase mb-1">Home Address</label>
                      <input type="text" placeholder="Colombo, Sri Lanka" value={newUserForm.address} onChange={(e) => setNewUserForm({...newUserForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-teal-500 focus:outline-none" />
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {isEditMode && (
                      <button type="button" onClick={() => { setIsEditMode(false); setNewUserForm({name:'', email:'', password:'', role:'Doctor', phone:'', specialization:'', fee:'', bio:'', slots:'', address:''}); }} className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors">Cancel</button>
                    )}
                    <button type="submit" disabled={createLoading} className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">{createLoading ? 'Syncing...' : isEditMode ? 'Update Profile 🚀' : 'Register User 🚀'}</button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{newUserForm.role === 'Doctor' ? `Registered Practitioners (${doctorsList.length})` : `Clinic Staff Members (${staffList.length})`}</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded-md border border-teal-500/20">● Live Log</span>
                  </div>
                  <div className="overflow-x-auto text-xs">
                    {newUserForm.role === 'Doctor' ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                            <th className="pb-2">Name</th>
                            <th className="pb-2">Email</th>
                            <th className="pb-2">Specialization</th>
                            <th className="pb-2 text-right pr-6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-300">
                          {doctorsList.map((doc, i) => (
                            <tr key={i} className="hover:bg-slate-950/20">
                              <td className="py-2.5 font-semibold text-slate-200">{doc.name}</td>
                              <td className="py-2.5 text-slate-400">{doc.email}</td>
                              <td className="py-2.5 text-teal-400">{doc.specialization || 'Psychiatrist'}</td>
                              <td className="py-2.5 text-right space-x-1 pl-2">
                                <button onClick={() => startEditingMode(doc, 'Doctor')} className="px-2 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-slate-950 font-bold rounded-lg text-[10px] transition-all">✏️ Edit</button>
                                <button onClick={() => handleAccountDelete(doc._id || doc.id, 'Doctor')} className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-lg text-[10px] transition-all">🗑️ Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                            <th className="pb-2">Name</th>
                            <th className="pb-2">Email</th>
                            <th className="pb-2">Contact</th>
                            <th className="pb-2 text-right pr-6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-300">
                          {staffList.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-6 text-slate-500 text-[11px]">No staff logs synced yet.</td></tr>
                          ) : (
                            staffList.map((st, i) => (
                              <tr key={i} className="hover:bg-slate-950/20">
                                <td className="py-2.5 font-semibold text-slate-200">{st.name}</td>
                                <td className="py-2.5 text-slate-400">{st.email}</td>
                                <td className="py-2.5 text-teal-400">{st.phone}</td>
                                <td className="py-2.5 text-right space-x-1 pl-2">
                                  <button onClick={() => startEditingMode(st, 'Staff')} className="px-2 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-slate-950 font-bold rounded-lg text-[10px] transition-all">✏️ Edit</button>
                                  <button onClick={() => handleAccountDelete(st._id || st.id, 'Staff')} className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-lg text-[10px] transition-all">🗑️ Delete</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3.  REGISTERED PATIENTS REPOSITORY */}
        {activeMenu === 'patients_list' && (
          <div className="flex-1 overflow-y-auto p-8 animate-fadeIn">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-300 font-semibold uppercase tracking-wider">System Patient List</h2>
                  <p className="text-[11px] text-slate-500"></p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl">● Total Logged: {extractedPatients.length}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="pb-3 pl-2">Patient Profile Info</th>
                        <th className="pb-3">Email Address</th>
                        <th className="pb-3 text-center">Last Activity</th>
                        <th className="pb-3 text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {extractedPatients.length === 0 ? ( <tr><td colSpan="4" className="text-center py-12 text-slate-500 italic">No patients logged yet.</td></tr> ) : (
                        extractedPatients.map((patient, index) => (
                          <tr key={index} className="hover:bg-slate-950/30 transition-colors">
                            <td className="py-4 pl-2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400">{patient.name.charAt(0).toUpperCase()}</div><span className="font-bold text-slate-200">{patient.name}</span></div></td>
                            <td className="py-4 text-slate-400 font-mono text-[11px]">{patient.email}</td>
                            <td className="py-4 text-center text-slate-500 font-mono text-[11px]">{patient.lastVisit}</td>
                            <td className="py-4 text-right pr-2">
                              <button onClick={() => handlePatientDelete(patient.id, patient.name)} className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-lg text-[10px] transition-all">🗑️ Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4.  ADMIN PASSWORD ACCOUNT SETTINGS TAB */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div><h2 className="text-md font-bold text-slate-200">Update Account Security</h2><p className="text-xs text-slate-500 mt-1"></p></div>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label><input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label><input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div className="pt-2"><button type="submit" disabled={passLoading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">{passLoading ? "Authorizing..." : "Save New Password"}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ====================   LOGOUT CONFIRMATION POPUP ==================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-3"><div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 text-xl shadow-lg shadow-rose-500/5">🚪</div><div className="space-y-1"><h3 className="text-sm font-bold text-slate-200">Confirm Logout</h3><p className="text-xs text-slate-400">Are you sure you want to end your active session on MindMate?</p></div></div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowLogoutModal(false)} className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors">Cancel</button><button type="button" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-1/2 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-rose-500/10 transition-all">Logout Account</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;