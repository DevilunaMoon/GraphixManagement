"use client";

import { useState, useTransition } from 'react';
import { changePassword } from '../../actions/auth';
import { useTheme } from '../../context/ThemeContext';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import PasswordRequirements from '../../components/PasswordRequirements';
import { validatePassword, detectInvalidPasswordChars } from '../../lib/passwordPolicy';

export default function AdminChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isNewFocused, setIsNewFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const { styles } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMsg('New password must be different from your current password.');
      return;
    }

    const val = validatePassword(newPassword);
    if (!val.isValid) {
      setErrorMsg(val.error || 'Password does not meet security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('oldPassword', oldPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmPassword', confirmPassword);

      const result = await changePassword(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result?.success) {
        setSuccessMsg('Your password has been changed successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsNewFocused(false);
        setIsConfirmFocused(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Change Password</h2>
      </div>

      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 ${styles.borderMain} shadow-sm p-8 md:p-12 w-full max-w-2xl mx-auto transition-colors duration-300`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm font-medium">
              {successMsg}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[#111] font-semibold" htmlFor="oldPassword">Current Password</label>
            <div className="relative bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden flex items-center">
              <input 
                type={showOld ? "text" : "password"} 
                id="oldPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors pr-10"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowOld(!showOld)} 
                className="absolute right-3 text-gray-400 hover:text-black bg-transparent border-none p-1 cursor-pointer"
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#111] font-semibold" htmlFor="newPassword">New Password</label>
            <div className="relative bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden flex items-center">
              <input 
                type={showNew ? "text" : "password"} 
                id="newPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors pr-10"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                onFocus={() => setIsNewFocused(true)}
                onBlur={() => setIsNewFocused(false)}
              />
              <button 
                type="button" 
                onClick={() => setShowNew(!showNew)} 
                className="absolute right-3 text-gray-400 hover:text-black bg-transparent border-none p-1 cursor-pointer"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Re-use warning */}
            {oldPassword && newPassword && oldPassword === newPassword && (
              <div className="text-xs font-bold text-red-500 ml-1 animate-in fade-in flex items-center gap-1">
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

          <div className="flex flex-col gap-2">
            <label className="text-[#111] font-semibold" htmlFor="confirmPassword">Confirm New Password</label>
            <div className="relative bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden flex items-center">
              <input 
                type={showConfirm ? "text" : "password"} 
                id="confirmPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors pr-10"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                onFocus={() => setIsConfirmFocused(true)}
                onBlur={() => setIsConfirmFocused(false)}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirm(!showConfirm)} 
                className="absolute right-3 text-gray-400 hover:text-black bg-transparent border-none p-1 cursor-pointer"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Real-time mismatch error */}
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <div className="text-xs font-bold text-red-500 ml-1 animate-in fade-in flex items-center gap-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>Passwords do not match.</span>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className={`mt-4 w-full bg-gradient-to-r ${styles.gradient} text-white font-bold py-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 opacity-90 hover:opacity-100 disabled:opacity-50`}
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Click to Change Password'}
          </button>

        </form>
      </div>
    </div>
  );
}

