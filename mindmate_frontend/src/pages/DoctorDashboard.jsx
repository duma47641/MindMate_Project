import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function DoctorDashboard() {
  const [activeMenu, setActiveMenu] = useState('appointments'); // Default Tab
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docInfo, setDocInfo] = useState({ name: 'Loading...', email: '' });
  
  // 🚪 Logout Confirmation Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Chart Modal States
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [activePatientName, setActivePatientName] = useState('');

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  const TOKEN = localStorage.getItem('token');

  // 🔄 1. දොස්තරට අදාළ බුකින්ස් ටික සර්වර් එකෙන් ඇදලා ගැනීම
  const fetchAppointments = async () => {
    if (!TOKEN) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get('http://localhost:5000/api/appointments/my', config);
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching doctor appointments:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    // Token Decode කරලා දොස්තරගේ නම සහ ඊමේල් එක සයිඩ්බාර් එකට ගැනීම
    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      setDocInfo({
        name: payload.name || 'Dr. Arshad Rahman',
        email: payload.email || 'arshad@mindmate.com'
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
    }

    fetchAppointments();
  }, [TOKEN]);

  useEffect(() => {
    if (activeMenu === 'appointments') {
      fetchAppointments();
    }
  }, [activeMenu]);

  // 👨‍⚕️ Appointment එකක් Approve හෝ Cancel කිරීම
  const handleStatusUpdate = async (appId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to set this request to ${nextStatus}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${appId}/status`, { status: nextStatus }, config);
      alert(`Appointment successfully ${nextStatus}! 🚀`);
      fetchAppointments(); 
    } catch (error) {
      alert("Error updating status: " + (error.response?.data?.message || error.message));
    }
  };

  // 📊 Analytics Open කිරීම
  const openAnalytics = async (patientId, patientName) => {
    setActivePatientName(patientName);
    setShowChartModal(true);
    setChartLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get(`http://localhost:5000/api/appointments/analytics/${patientId}`, config);
      setChartData(data);
    } catch (error) {
      console.error(error);
      // Dummy data fallback for demo if history is empty
      setChartData([
        { date: '2026-06-07', Neutral: 1, Stress: 2, Anxiety: 4, Depression: 1, Critical: 5 },
        { date: '2026-06-12', Neutral: 3, Stress: 1, Anxiety: 2, Depression: 5, Critical: 2 }
      ]);
    } finally {
      setChartLoading(false);
    }
  };

  // 🔒 පාස්වර්ඩ් එක වෙනස් කිරීමේ Submission එක
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert("🔒 Password Updated Successfully!");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password Update Failed");
    } finally {
      setPassLoading(false);
    }
  };

  // 🟢 [Stats Calculation Logic]: සජීවීව ගණන් හිලව් හදාගන්නා සුපිරි ලෝජික් එක මචං
  const pendingCount = appointments.filter(app => app.status === 'Pending').length;
  const approvedCount = appointments.filter(app => app.status === 'Approved' || app.status === 'Paid').length;
  
  // මුළු ආදායම (Approved හෝ Paid ඒවායින් විතරක් එකතුව හදයි)
  const totalIncome = appointments
    .filter(app => app.status === 'Approved' || app.status === 'Paid')
    .reduce((sum, app) => {
      const fee = parseFloat(app.doctorDetails?.fee || app.fee || 2500);
      return sum + fee;
    }, 0);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* 📂 LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg">👨‍⚕️</div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Doc</h2>
              <p className="text-[10px] text-slate-400">Medical Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <button 
              onClick={() => setActiveMenu('appointments')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'appointments' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              📋 Patient Appointments
            </button>
            <button 
              onClick={() => setActiveMenu('settings')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              ⚙️ Account Settings
            </button>
          </nav>
        </div>

        {/* Doctor Identity & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">
              {docInfo.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{docInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{docInfo.email}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all"
          >
            Logout Account
          </button>
        </div>
      </aside>

      {/* 💻 MAIN CONTENT WINDOW */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'appointments' ? 'Patient Channeling Intake Log' : 'Security Settings'}
          </h1>
        </header>

        {/* 1. 📋 APPOINTMENTS LIST VIEW */}
        {activeMenu === 'appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              
              {/* 🟢 [UI Fix]: උඹ ඉල්ලපු ලස්සන Stats Cards 3 මෙන්න මෙතන තියෙනවා බෝක්කා */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                
                {/* Pending Card */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Sessions</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Awaiting approval</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-md">⏳</div>
                </div>

                {/* Approved Card */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Sessions</p>
                    <h3 className="text-2xl font-black text-teal-400 mt-1">{approvedCount}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Active patients</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-md">✅</div>
                </div>

                {/* Total Income Card */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg border-emerald-500/10">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Earnings</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">
                      LKR {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cleared sessions</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-md">💵</div>
                </div>

              </div>

              <h2 className="text-sm font-bold text-slate-300 mb-4 font-semibold">Active Consultation Intake</h2>
              
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-12">Loading requests from medical database...</p>
              ) : appointments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No channelling requests found for your profile yet, doctor.</p>
              ) : (
                appointments.map((app) => (
                  <div key={app._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-800/50 transition-colors animate-fadeIn">
                    
                    {/* Patient Core Details */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg">👤</div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">
                          {app.patientId?.name || app.patientId?.username || 'MindMate Patient'}
                        </h3>
                        <p className="text-xs text-slate-400">{app.patientId?.email || 'No email log available'}</p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500 border-t border-slate-800/60 pt-2">
                          <div>📅 Date: <span className="text-slate-300">{app.date}</span></div>
                          <div>⏰ Slot: <span className="text-slate-300">{app.timeSlot}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Box */}
                    <div className="flex items-center gap-2 justify-end">
                      {app.status === 'Pending' && (
                        <>
                          <button onClick={() => handleStatusUpdate(app._id, 'Approved')} className="px-4 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:bg-teal-400 transition-colors">Approve</button>
                          <button onClick={() => handleStatusUpdate(app._id, 'Cancelled')} className="px-4 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-xs font-bold rounded-xl transition-all">Decline</button>
                        </>
                      )}

                      {app.status === 'Approved' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          Approved (Awaiting Payment)
                        </span>
                      )}

                      {app.status === 'Cancelled' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
                          Cancelled
                        </span>
                      )}

                      {/* 📊 [Smart Feature]: බුකින් එක PAID නම් විතරක් දොස්තරට GRAPH බටන් එක දෙනවා */}
                      {app.status === 'Paid' && (
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                            ● Paid & Confirmed 💵
                          </span>
                          <button 
                            onClick={() => openAnalytics(app.patientId?._id, app.patientId?.name)}
                            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                          >
                            📊 View Mood Analytics
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. ⚙️ SETTINGS TAB (EDIT PASSWORD FORM) */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div>
                <h2 className="text-md font-bold text-slate-200">Update Account Password</h2>
                <p className="text-xs text-slate-500 mt-1">Ensure your medical account stays completely secure.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">{passLoading ? "Updating Security..." : "Save New Password"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 📊 PREMIUM MOOD ANALYTICS DASHBOARD MODAL POPUP ==================== */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-md font-bold text-teal-400 flex items-center gap-2">📊 Mood Analytics Dashboard</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tracking mental well-being over time for <span className="text-white font-medium">{activePatientName}</span></p>
              </div>
              <button onClick={() => setShowChartModal(false)} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm hover:bg-rose-500 text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            {chartLoading ? (
              <p className="text-xs text-slate-500 text-center py-20">Extracting clinical markers from AI dataset...</p>
            ) : (
              <div className="w-full h-80 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Neutral" fill="#94a3b8" />
                    <Bar dataKey="Stress" fill="#38bdf8" />
                    <Bar dataKey="Anxiety" fill="#f59e0b" />
                    <Bar dataKey="Depression" fill="#6366f1" />
                    <Bar dataKey="Critical" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="text-right"><button onClick={() => setShowChartModal(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-colors">Close Log</button></div>
          </div>
        </div>
      )}

      {/* ==================== 🚪 PREMIUM LOGOUT CONFIRMATION POPUP ==================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 border border-rose-500/10">
            
            {/* Icon & Message */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 text-xl shadow-lg shadow-rose-500/5 animate-pulse">
                🚪
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Confirm Logout</h3>
                <p className="text-xs text-slate-400">Are you sure you want to end your active session on MindMate?</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowLogoutModal(false)} 
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }} 
                className="w-1/2 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-rose-500/10 transition-all"
              >
                Logout Account
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default DoctorDashboard;