import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StaffDashboard() {
  const [activeMenu, setActiveMenu] = useState('ledger'); // 'ledger', 'articles', හෝ 'settings'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Staff Identity Info State
  const [staffInfo, setStaffInfo] = useState({ name: 'Loading...', email: '' });

  // Password Update States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // 📚 Articles Management States (Staff CRUD Engine)
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleForm, setArticleForm] = useState({
    tag: '',
    title: '',
    author: '',
    readTime: '',
    summary: '',
    content: ''
  });
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [articleSaving, setArticleSaving] = useState(false);

  const TOKEN = localStorage.getItem('token');

  // 🔄 1. මුළු සිස්ටම් එකේම තියෙන ඇපොයින්ට්මන්ට්ස් ඔක්කොම සර්වර් එකෙන් ඇදලා ගැනීම (Global Ledger)
  const fetchGlobalLedger = async () => {
    if (!TOKEN) return;
    setLoading(true);
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

  // 🔄 2. සර්වර් එකෙන් ලිපි (Articles) සියල්ල ලබා ගැනීම
  const fetchArticles = async () => {
    setArticlesLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/articles');
      setArticles(data);
    } catch (error) {
      console.error("Error fetching articles:", error.message);
    } finally {
      setArticlesLoading(false);
    }
  };

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    // 🕵️‍♂️ Token එක ඇතුළෙන් ලොග් වී ඉන්න ස්ටාෆ් මෙම්බර්ගේ නම සහ ඊමේල් එක ඩිකෝඩ් කරලා ගැනීම
    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const core = payload.user || payload;
      setStaffInfo({
        name: core.name || 'MindMate Staff',
        email: core.email || 'staff@mindmate.com'
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
    }

    fetchGlobalLedger();
  }, [TOKEN]);

  useEffect(() => {
    if (activeMenu === 'ledger') {
      fetchGlobalLedger();
    } else if (activeMenu === 'articles') {
      fetchArticles();
    }
  }, [activeMenu]);

  // 👨‍⚕️ Staff එකට ඕන නම් ඇපොයින්ට්මන්ට් එකක් Approve/Cancel කරන්න පුළුවන් ලෝජික් එක
  const handleStatusOverride = async (appId, nextStatus) => {
    if (!window.confirm(`Staff Override: Are you sure you want to ${nextStatus} this appointment?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${appId}/status`, { status: nextStatus }, config);
      alert(`Appointment status overridden to ${nextStatus}! `);
      fetchGlobalLedger();
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  };

  // 🔒 ස්ටාෆ්ගේ පාස්වර්ඩ් එක වෙනස් කිරීමේ Submission එක
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert("🔒 Staff Account Password Updated Successfully! ");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password Update Failed");
    } finally {
      setPassLoading(false);
    }
  };

  // 📚 Article Form Fields Change Handler
  const handleArticleChange = (e) => {
    setArticleForm({ ...articleForm, [e.target.name]: e.target.value });
  };

  // 📚 Create හෝ Edit Article Submit Handler
  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    setArticleSaving(true);

    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      if (editingArticleId) {
        // Update Article (PUT)
        await axios.put(`http://localhost:5000/api/articles/${editingArticleId}`, articleForm, config);
        alert('Article updated successfully! ✨');
      } else {
        // Create Article (POST)
        await axios.post('http://localhost:5000/api/articles', articleForm, config);
        alert('New Mental Health Article published successfully! ');
      }
      setArticleForm({ tag: '', title: '', author: '', readTime: '', summary: '', content: '' });
      setEditingArticleId(null);
      fetchArticles();
    } catch (error) {
      alert("Article Action Error: " + (error.response?.data?.message || error.message));
    } finally {
      setArticleSaving(false);
    }
  };

  // 📚 Edit Article Action Trigger
  const handleArticleEdit = (art) => {
    setEditingArticleId(art._id);
    setArticleForm({
      tag: art.tag || '',
      title: art.title || '',
      author: art.author || '',
      readTime: art.readTime || '',
      summary: art.summary || '',
      content: art.content || ''
    });
  };

  // 📚 Delete Article Action Trigger
  const handleArticleDelete = async (id) => {
    if (!window.confirm('Staff Action: Are you sure you want to permanently delete this article?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.delete(`http://localhost:5000/api/articles/${id}`, config);
      alert('Article deleted successfully!');
      fetchArticles();
    } catch (error) {
      alert("Delete Error: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* 📂 LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow-lg">💼</div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Staff</h2>
              <p className="text-[10px] text-slate-400">Desk Operations</p>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <button 
              onClick={() => setActiveMenu('ledger')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'ledger' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              📋 Overall App Log
            </button>

            {/* 📚 ස්ටාෆ් වෙනුවෙන් අලුතින්ම එක්කළ Articles Management Tab එක */}
            <button 
              onClick={() => setActiveMenu('articles')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'articles' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              📚 Mental Health Articles
            </button>
            
            {/* ⚙️ Security Settings Tab */}
            <button 
              onClick={() => setActiveMenu('settings')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              ⚙️ Account Settings
            </button>
          </nav>
        </div>

        {/* 🟢 [Smart Staff Badge] */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">
              {staffInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{staffInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{staffInfo.email}</p>
            </div>
          </div>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }} 
            className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all"
          >
            Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'ledger' && 'Global Appointment Ledger'}
            {activeMenu === 'articles' && 'Mental Health Articles & Publications'}
            {activeMenu === 'settings' && 'Security Settings'}
          </h1>
        </header>

        {/* 1. 📋 GLOBAL APPOINTMENT LEDGER VIEW */}
        {activeMenu === 'ledger' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-300 font-semibold">Clinic Schedule Overview</h2>
                <p className="text-[11px] text-slate-500">Monitor, validate, or override active patient sessions across the clinic</p>
              </div>
              
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-12">Synchronizing with medical database...</p>
              ) : appointments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No scheduled appointments found in the system ledger.</p>
              ) : (
                appointments.map((app) => (
                  <div key={app._id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:border-slate-800/40 transition-colors">
                    
                    {/* Left Section: Patient & Doctor Info mappings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Patient</span>
                        <p className="text-xs font-bold text-slate-200">{app.patientId?.name || app.patientId?.username || 'MindMate Patient'}</p>
                        <p className="text-[11px] text-slate-500">{app.patientId?.email || 'No email log'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Practitioner</span>
                        <p className="text-xs font-bold text-teal-400">{app.doctorDetails?.name || app.doctorId?.name || 'Clinical Expert'}</p>
                        <p className="text-[11px] text-slate-500">{app.doctorDetails?.specialization || 'Mental Health Specialist'}</p>
                      </div>
                    </div>

                    {/* Right Section: Date/Time Slot & Actions */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-800/50 pt-3 md:pt-0">
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>📅 <span className="text-slate-300">{app.date}</span></div>
                        <div>⏰ Slot: <span className="text-slate-300">{app.timeSlot}</span></div>
                        <div className="text-[11px] font-bold text-emerald-400">LKR {app.doctorDetails?.fee || "2500"}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${app.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : app.status === 'Approved' ? 'bg-cyan-500/10 text-cyan-400' : app.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{app.status}</span>
                        
                        {app.status === 'Pending' && (
                          <>
                            <button onClick={() => handleStatusOverride(app._id, 'Approved')} className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-[11px]">Approve</button>
                            <button onClick={() => handleStatusOverride(app._id, 'Cancelled')} className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-[11px]">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. 📚 ARTICLES MANAGEMENT TAB (New Staff Capability) */}
        {activeMenu === 'articles' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Form Container */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-200">
                    {editingArticleId ? '✏️ Edit Mental Health Publication' : '➕ Publish New Mental Health Article'}
                  </h2>
                  <p className="text-[11px] text-slate-500">Create research, coping strategies, or mental health awareness articles for the public portal.</p>
                </div>

                <form onSubmit={handleArticleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tag / Category</label>
                      <input 
                        type="text" 
                        name="tag"
                        required
                        placeholder="e.g. Stress & Coping"
                        value={articleForm.tag}
                        onChange={handleArticleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Author Name / Credential</label>
                      <input 
                        type="text" 
                        name="author"
                        required
                        placeholder="e.g. Dr. Anura Senanayake"
                        value={articleForm.author}
                        onChange={handleArticleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Read Time</label>
                      <input 
                        type="text" 
                        name="readTime"
                        placeholder="e.g. 5 min read"
                        value={articleForm.readTime}
                        onChange={handleArticleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Article Title</label>
                    <input 
                      type="text" 
                      name="title"
                      required
                      placeholder="e.g. Navigating Chronic Workplace Stress: Behavioral Strategies"
                      value={articleForm.title}
                      onChange={handleArticleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Summary (Short Overview)</label>
                    <textarea 
                      name="summary"
                      rows="2"
                      required
                      placeholder="Brief 2-line summary shown on the public landing page card..."
                      value={articleForm.summary}
                      onChange={handleArticleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200 resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Detailed Content</label>
                    <textarea 
                      name="content"
                      rows="5"
                      required
                      placeholder="Write the complete article content, psychological tips, and clinical insights..."
                      value={articleForm.content}
                      onChange={handleArticleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200"
                    ></textarea>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={articleSaving}
                      className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all"
                    >
                      {articleSaving ? "Processing..." : editingArticleId ? "Update Article" : "Publish Article"}
                    </button>
                    {editingArticleId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingArticleId(null);
                          setArticleForm({ tag: '', title: '', author: '', readTime: '', summary: '', content: '' });
                        }}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Existing Articles List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200">📚 Live Published Articles ({articles.length})</h3>
                
                {articlesLoading ? (
                  <p className="text-xs text-slate-500 text-center py-6">Loading articles registry...</p>
                ) : articles.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No articles published yet. Publish your first article above.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {articles.map((art) => (
                      <div key={art._id} className="py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                            {art.tag}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200">{art.title}</h4>
                          <p className="text-[11px] text-slate-500">{art.author} • {art.readTime || '5 min read'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleArticleEdit(art)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleArticleDelete(art._id)}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 3. ⚙️ STAFF PASSWORD ACCOUNT SETTINGS TAB */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-md font-bold text-slate-200">Update Account Security</h2>
                <p className="text-xs text-slate-500 mt-1">Keep your clinic management terminal fully safe and authorized.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="Minimum 6 characters" 
                    value={passwordForm.newPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" 
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">
                    {passLoading ? "Authorizing Security..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default StaffDashboard;