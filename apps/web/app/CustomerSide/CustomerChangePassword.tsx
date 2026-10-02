"use client";

import { useState } from 'react';
import { UserCircle2, Pencil, Receipt, KeyRound, Eye, EyeOff, Activity, AlertCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '../../actions/user';
import PasswordRequirements from '../../components/PasswordRequirements';
import { validatePassword, detectInvalidPasswordChars } from '../../lib/passwordPolicy';

export default function CustomerChangePassword({ user }: { user?: any }) {
  const router = useRouter();
  const navigate = router.push;
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isNewFocused, setIsNewFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);

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

    if (oldPassword === newPassword) {
      setMessage({ text: 'New password must be different from your current password.', type: 'error' });
      return;
    }

    const pwdVal = validatePassword(newPassword);
    if (!pwdVal.isValid) {
      setMessage({ text: pwdVal.error || 'Password does not meet security requirements.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setIsSaving(true);
    const res = await updatePassword(oldPassword, newPassword, confirmPassword);
    setIsSaving(false);

    if (res?.success) {
      setMessage({ text: 'Your password has been changed successfully.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsNewFocused(false);
      setIsConfirmFocused(false);
    } else {
      setMessage({ text: res?.error || "Failed to update password", type: 'error' });
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">

        {/* Left Sidebar */}
        <aside className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col items-center gap-3.5 text-center transition-all hover:border-purple-200">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm flex items-center justify-center bg-purple-50/50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={80} className="text-purple-300" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-gray-950 truncate max-w-[220px]">{user?.name || "Customer"}</span>
              <button 
                onClick={() => navigate('/customer/profile')}
                className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-full font-bold text-xs border border-purple-100 transition-colors cursor-pointer"
              >
                <Pencil size={11} className="text-[#8b00cc]" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-2.5 shadow-sm border border-purple-100/90 flex flex-col gap-1.5">
            <button 
              onClick={() => navigate('/customer/profile')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50/80 transition-all text-gray-700 hover:text-[#8b00cc] font-bold text-sm group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-purple-100/80 flex items-center justify-center transition-colors">
                <User className="text-[#6b588c] group-hover:text-[#8b00cc] transition-colors" size={18} />
              </div>
              <span>Profile</span>
            </button>

            <button 
              onClick={() => navigate('/customer/digital-receipt')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50/80 transition-all text-gray-700 hover:text-[#8b00cc] font-bold text-sm group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-purple-100/80 flex items-center justify-center transition-colors">
                <Receipt className="text-[#6b588c] group-hover:text-[#8b00cc] transition-colors" size={18} />
              </div>
              <span>Digital Receipt</span>
            </button>

            <button 
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-sm cursor-pointer text-left transition-all border-none shadow-sm shadow-purple-500/25"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <KeyRound size={18} className="text-white" />
              </div>
              <span>Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Area */}
        <section className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col">
          <div className="border-b border-purple-100 pb-5 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">Change Password</h2>
            <p className="text-gray-500 m-0 mt-1.5 font-medium text-xs sm:text-sm">Protect your account with a strong, secure password</p>
          </div>

          <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-xl mx-auto mt-2">
            {message.text && (
              <div className={`p-4 rounded-xl font-bold text-center text-xs sm:text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 font-bold text-xs sm:text-sm ml-0.5">Current Password</label>
              <div className="relative">
                <input 
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    if (message.text) setMessage({ text: '', type: '' });
                  }}
                  className="w-full h-11 border border-purple-100 bg-gray-50/60 focus:bg-white rounded-xl px-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] transition-all font-semibold pr-11 text-xs sm:text-sm shadow-xs"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowOld(!showOld)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8b00cc] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 font-bold text-xs sm:text-sm ml-0.5">New Password</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (message.text) setMessage({ text: '', type: '' });
                  }}
                  onFocus={() => setIsNewFocused(true)}
                  onBlur={() => setIsNewFocused(false)}
                  className="w-full h-11 border border-purple-100 bg-gray-50/60 focus:bg-white rounded-xl px-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] transition-all font-semibold pr-11 text-xs sm:text-sm shadow-xs"
                  placeholder="Enter new password"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8b00cc] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Re-use warning if identical to Current Password */}
              {oldPassword && newPassword && oldPassword === newPassword && (
                <div className="text-xs font-bold text-red-500 ml-1 animate-in fade-in flex items-center gap-1 mt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>New password must be different from your current password.</span>
                </div>
              )}

              {/* Real-time Password Requirements */}
              <PasswordRequirements 
                password={newPassword} 
                isFocused={isNewFocused} 
                variant="card" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 font-bold text-xs sm:text-sm ml-0.5">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (message.text) setMessage({ text: '', type: '' });
                  }}
                  onFocus={() => setIsConfirmFocused(true)}
                  onBlur={() => setIsConfirmFocused(false)}
                  className={`w-full h-11 border rounded-xl px-4 text-gray-900 outline-none focus:ring-2 transition-all font-semibold pr-11 text-xs sm:text-sm shadow-xs ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-100'
                      : 'border-purple-100 bg-gray-50/60 focus:bg-white focus:border-[#8b00cc] focus:ring-purple-200'
                  }`}
                  placeholder="Confirm new password"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8b00cc] cursor-pointer bg-transparent border-none p-0 flex items-center justify-center transition-colors">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Real-time mismatch error */}
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <div className="text-xs font-bold text-red-500 ml-1 animate-in fade-in flex items-center gap-1 mt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Passwords do not match.</span>
                </div>
              )}
            </div>
            
            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all border-none cursor-pointer disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
              >
                {isSaving ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
