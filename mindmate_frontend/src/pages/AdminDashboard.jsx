import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('doctor'); 
    const [doctors, setDoctors] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 🔄 Editing States
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);

    const TOKEN = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${TOKEN}` } };

    const [docForm, setDocForm] = useState({
        name: '', email: '', password: '', role: 'Doctor',
        phone: '', specialization: '', fee: '', bio: '', slots: ''
    });

    const [staffForm, setStaffForm] = useState({
        name: '', email: '', password: '', role: 'Staff',
        phone: '', address: ''
    });

    const fetchData = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/users', config);
            setDoctors(data.filter(user => user.role === 'Doctor'));
            setStaffList(data.filter(user => user.role === 'Staff'));
        } catch (err) {
            console.error("Error fetching users:", err.message);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDocChange = (e) => {
        setDocForm({ ...docForm, [e.target.name]: e.target.value });
        if (error) setError('');
    };
    
    const handleStaffChange = (e) => {
        setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    // 🚀 Submit handling for Doctor (Handles both Create & Update)
    const handleDocSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setMessage(''); setError('');
        
        // 🛑 Frontend Guard: Fee එක සෘණදැයි බැලීම
        if (Number(docForm.fee) < 0) {
            setError("Fee cannot be negative!");
            setLoading(false);
            return;
        }

        try {
            if (isEditing) {
                // UPDATE LOGIC
                await axios.put(`http://localhost:5000/api/users/${editingUserId}`, docForm, config);
                setMessage('Doctor Updated Successfully! 🎉');
                cancelEdit();
            } else {
                // CREATE LOGIC
                await axios.post('http://localhost:5000/api/auth/register-practitioner', docForm, config);
                setMessage('Doctor Registered Successfully! 🎉');
                setDocForm({ name: '', email: '', password: '', role: 'Doctor', phone: '', specialization: '', fee: '', bio: '', slots: '' });
            }
            fetchData();
            setTimeout(() => setMessage(''), 4000); // 🟢 තත්පර 4කින් මැසේජ් එක Clear කිරීම
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally { setLoading(false); }
    };

    // 🚀 Submit handling for Staff (Handles both Create & Update)
    const handleStaffSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setMessage(''); setError('');
        try {
            if (isEditing) {
                await axios.put(`http://localhost:5000/api/users/${editingUserId}`, staffForm, config);
                setMessage('Staff Member Updated Successfully! 🎉');
                cancelEdit();
            } else {
                await axios.post('http://localhost:5000/api/auth/register-practitioner', staffForm, config);
                setMessage('Staff Member Registered Successfully! 🎉');
                setStaffForm({ name: '', email: '', password: '', role: 'Staff', phone: '', address: '' });
            }
            fetchData();
            setTimeout(() => setMessage(''), 4000); // 🟢 Clear Message
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally { setLoading(false); }
    };

    // 📝 Edit බටන් එක එබූ විට දත්ත Form එකට ලෝඩ් කිරීම
    const startEdit = (user) => {
        setIsEditing(true);
        setEditingUserId(user._id);
        setMessage(''); setError('');

        if (user.role === 'Doctor') {
            setDocForm({
                name: user.name, email: user.email, password: 'protected_pass', role: 'Doctor',
                phone: user.phone || '', specialization: user.specialization || '', 
                fee: user.fee || '', bio: user.bio || '', slots: user.slots || ''
            });
        } else {
            setStaffForm({
                name: user.name, email: user.email, password: 'protected_pass', role: 'Staff',
                phone: user.phone || '', address: user.address || ''
            });
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditingUserId(null);
        setDocForm({ name: '', email: '', password: '', role: 'Doctor', phone: '', specialization: '', fee: '', bio: '', slots: '' });
        setStaffForm({ name: '', email: '', password: '', role: 'Staff', phone: '', address: '' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this user?")) {
            try {
                await axios.delete(`http://localhost:5000/api/users/${id}`, config);
                fetchData();
                if (editingUserId === id) cancelEdit();
            } catch (err) { alert("Error deleting user"); }
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-xl">
                <div>
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-slate-950 text-lg font-bold">👑</div>
                        <div>
                            <h2 className="text-md font-bold tracking-wide text-teal-400">MindMate Admin</h2>
                            <p className="text-[11px] text-slate-400">System Control</p>
                        </div>
                    </div>
                    <nav className="p-4 space-y-2">
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/40 text-teal-400 border border border-teal-500/20 rounded-xl font-semibold text-sm shadow-md">
                            🩺 Practitioner Control
                        </button>
                    </nav>
                </div>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-full py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl transition-all text-xs tracking-wide">
                        Logout Session
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-200">Management Dashboard</h1>
                    <p className="text-xs text-slate-400 mt-1">Add, update, or remove MindMate clinical staff and doctors</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-md font-bold text-slate-300 mb-4">
                            {isEditing ? '🔄 Edit Practitioner Details' : 'Add Practitioner Account'}
                        </h2>
                        
                        {!isEditing && (
                            <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
                                <button onClick={() => { setActiveTab('doctor'); setMessage(''); setError(''); }} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'doctor' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>Doctor Model</button>
                                <button onClick={() => { setActiveTab('staff'); setMessage(''); setError(''); }} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'staff' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>Staff Model</button>
                            </div>
                        )}

                        {message && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">{message}</div>}
                        {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">{error}</div>}

                        {activeTab === 'doctor' ? (
                            <form onSubmit={handleDocSubmit} className="space-y-4">
                                <input type="text" name="name" value={docForm.name} onChange={handleDocChange} placeholder="Dr. Full Name" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <input type="email" name="email" value={docForm.email} onChange={handleDocChange} placeholder="Official Email Address" required disabled={isEditing} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 disabled:opacity-50" />
                                {!isEditing && <input type="password" name="password" value={docForm.password} onChange={handleDocChange} placeholder="Secure Password" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />}
                                <input type="text" name="phone" value={docForm.phone} onChange={handleDocChange} placeholder="Contact Number" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <input type="text" name="specialization" value={docForm.specialization} onChange={handleDocChange} placeholder="Specialization" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <input type="number" name="fee" min="0" value={docForm.fee} onChange={handleDocChange} placeholder="Channeling Fee (LKR)" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <textarea name="bio" value={docForm.bio} onChange={handleDocChange} placeholder="Brief Bio Description..." rows="3" className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors resize-none"></textarea>
                                <input type="text" name="slots" value={docForm.slots} onChange={handleDocChange} placeholder="Available Slots" className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <button type="submit" disabled={loading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all shadow-md text-sm">
                                    {loading ? 'Processing...' : isEditing ? 'Update Doctor Details' : 'Register New Doctor'}
                                </button>
                                {isEditing && <button type="button" onClick={cancelEdit} className="w-full py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700 transition-colors">Cancel Edit</button>}
                            </form>
                        ) : (
                            <form onSubmit={handleStaffSubmit} className="space-y-4">
                                <input type="text" name="name" value={staffForm.name} onChange={handleStaffChange} placeholder="Staff Member Name" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <input type="email" name="email" value={staffForm.email} onChange={handleStaffChange} placeholder="Staff Email" required disabled={isEditing} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 disabled:opacity-50" />
                                {!isEditing && <input type="password" name="password" value={staffForm.password} onChange={handleStaffChange} placeholder="Secure Password" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />}
                                <input type="text" name="phone" value={staffForm.phone} onChange={handleStaffChange} placeholder="Contact Number" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors" />
                                <textarea name="address" value={staffForm.address} onChange={handleStaffChange} placeholder="Residential Address..." rows="3" required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors resize-none"></textarea>
                                <button type="submit" disabled={loading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all shadow-md text-sm">
                                    {loading ? 'Processing...' : isEditing ? 'Update Staff Details' : 'Register New Staff'}
                                </button>
                                {isEditing && <button type="button" onClick={cancelEdit} className="w-full py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700 transition-colors">Cancel Edit</button>}
                            </form>
                        )}
                    </div>

                    <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-md font-bold text-slate-300 mb-4">
                            {activeTab === 'doctor' ? '⚡ Active MindMate Doctors' : '⚡ Registered System Staff'}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                        <th className="py-3 px-2">Name</th>
                                        <th className="py-3 px-2">{activeTab === 'doctor' ? 'Specialization / Phone' : 'Contact'}</th>
                                        <th className="py-3 px-2">{activeTab === 'doctor' ? 'Fee' : 'Address'}</th>
                                        <th className="py-3 px-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300 divide-y divide-slate-800/60">
                                    {activeTab === 'doctor' ? (
                                        doctors.map((doc) => (
                                            <tr key={doc._id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="py-3.5 px-2 font-semibold text-slate-200">{doc.name}</td>
                                                <td className="py-3.5 px-2 text-xs text-slate-400">
                                                    <div>{doc.specialization || 'General'}</div>
                                                    <div className="text-[10px] text-slate-500">{doc.phone || 'N/A'}</div>
                                                </td>
                                                <td className="py-3.5 px-2 font-bold text-teal-400">Rs. {doc.fee || 0}</td>
                                                <td className="py-3.5 px-2 text-center flex items-center justify-center gap-2">
                                                    <button onClick={() => startEdit(doc)} className="px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-xs font-bold rounded-lg transition-all">Edit</button>
                                                    <button onClick={() => handleDelete(doc._id)} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-xs font-bold rounded-lg transition-all">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        staffList.map((st) => (
                                            <tr key={st._id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="py-3.5 px-2 font-semibold text-slate-200">{st.name}</td>
                                                <td className="py-3.5 px-2 text-xs text-slate-400">{st.phone}</td>
                                                <td className="py-3.5 px-2 text-xs text-slate-400 truncate max-w-[150px]">{st.address}</td>
                                                <td className="py-3.5 px-2 text-center flex items-center justify-center gap-2">
                                                    <button onClick={() => startEdit(st)} className="px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-xs font-bold rounded-lg transition-all">Edit</button>
                                                    <button onClick={() => handleDelete(st._id)} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-xs font-bold rounded-lg transition-all">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;