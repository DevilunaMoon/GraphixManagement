"use client";

import { useState } from 'react';
import { UserCircle2, Pencil, Receipt, KeyRound, Eye, EyeOff, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '../../actions/user';

export default function CustomerChangePassword({ user }: { user?: any }) {
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
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-[#0022ff] shadow-sm flex items-center justify-center bg-gray-50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={80} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl font-bold text-black">{user?.name || "Customer"}</span>
              <button 
                onClick={() => navigate('/customer/profile')}
                className="flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer transition-colors font-semibold p-0"
              >
                <Pencil size={16} /> Edit Profile
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
            <button 
              onClick={() => navigate('/customer/digital-receipt')}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors group"
            >
              <Receipt className="text-[#01f0ff] group-hover:text-[#bd00ff] transition-colors" size={24} />
              <span className="text-lg font-semibold text-gray-700 group-hover:text-[#bd00ff] transition-colors">Digital Receipt</span>
            </button>
            <button 
              className="flex items-center gap-4 w-full p-4 rounded-xl border-2 border-[#bd00ff] bg-purple-50 cursor-pointer text-left transition-colors"
            >
              <KeyRound className="text-[#bd00ff]" size={24} />
              <span className="text-lg font-bold text-[#bd00ff]">Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Area */}
        <section className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-[#bd00ff] flex flex-col">
          <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold text-black m-0 border-none">Change Password</h2>
            <p className="text-gray-500 m-0 mt-2 font-medium text-sm sm:text-base">Protect your account with a strong password</p>
          </div>

          <div className="flex flex-col gap-5 sm:gap-8 w-full max-w-2xl mx-auto mt-2 sm:mt-4">
            {message.text && (
              <div className={`p-4 rounded-xl font-bold text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1">Current Password</label>
              <div className="relative">
                <input 
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full h-12 sm:h-14 border-2 border-gray-200 rounded-xl px-4 sm:px-5 text-black outline-none focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 transition-all font-medium pr-10 sm:pr-12 text-base sm:text-lg shadow-sm"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowOld(!showOld)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showOld ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1">New Password</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 sm:h-14 border-2 border-gray-200 rounded-xl px-4 sm:px-5 text-black outline-none focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 transition-all font-medium pr-10 sm:pr-12 text-base sm:text-lg shadow-sm"
                  placeholder="Enter new password"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showNew ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gray-700 font-bold ml-1">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 sm:h-14 border-2 border-gray-200 rounded-xl px-4 sm:px-5 text-black outline-none focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 transition-all font-medium pr-10 sm:pr-12 text-base sm:text-lg shadow-sm"
                  placeholder="Confirm new password"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>
            
            <div className="pt-4 sm:pt-6 flex justify-center">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full md:w-auto px-4 sm:px-16 py-3 sm:py-4 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] hover:-translate-y-1 hover:shadow-lg transition-all border-none cursor-pointer disabled:opacity-50 text-base sm:text-lg whitespace-nowrap"
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
