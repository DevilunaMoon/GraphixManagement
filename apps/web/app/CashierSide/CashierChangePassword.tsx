"use client";

import { useState } from 'react';
import { UserCircle2, Pencil, KeyRound, Eye, EyeOff, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '../../actions/user';

export default function CashierChangePassword({ user }: { user?: any }) {
  const router = useRouter();
  const navigate = router.push;

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSave = async () => {
    setMessage({ text: '', type: '' });
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ text: 'Please fill out all fields.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }

    setIsSaving(true);
    const res = await updatePassword(oldPassword, newPassword);
    setIsSaving(false);

    if (res?.success) {
      setMessage({ text: 'Password successfully updated!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ text: res?.error || "Failed to update password", type: 'error' });
    }
  };

  return (
    <main className="flex-1 p-2 sm:p-5 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-purple-200 shadow-sm flex items-center justify-center bg-gray-50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={80} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl font-bold text-black">{user?.name || "Cashier Staff"}</span>
              <button 
                onClick={() => navigate('/cashier/profile')}
                className="flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer transition-colors font-semibold p-0"
              >
                <Pencil size={16} /> Edit Profile
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-3 shadow-sm border border-purple-100 flex flex-col gap-1.5">
            <button 
              onClick={() => navigate('/cashier/profile')}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent text-gray-700 hover:bg-purple-50 hover:text-[#bd00ff] transition-all group"
            >
              <Briefcase className="text-gray-400 group-hover:text-[#bd00ff] transition-colors" size={22} />
              <span className="text-base font-semibold transition-colors">Profile Info</span>
            </button>

            <button 
              onClick={() => {}}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-purple-50 text-[#bd00ff]"
            >
              <KeyRound size={22} />
              <span className="text-base font-bold">Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Area */}
        <section className="flex-1 bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-[#bd00ff] flex flex-col">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-black m-0 border-none">Change Password</h2>
            <p className="text-gray-400 m-0 mt-1 font-semibold text-sm">Protect your staff account with a strong password</p>
          </div>

          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto mt-2">
            {message.text && (
              <div className={`p-4 rounded-xl font-bold text-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1 text-sm">Current Password</label>
              <div className="relative">
                <input 
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-medium pr-10"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowOld(!showOld)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1 text-sm">New Password</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-medium pr-10"
                  placeholder="Enter new password"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1 text-sm">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-medium pr-10"
                  placeholder="Confirm new password"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="pt-4 flex justify-center">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-12 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
