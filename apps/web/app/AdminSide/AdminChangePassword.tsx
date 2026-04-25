"use client";

import { useState, useTransition } from 'react';
import { changePassword } from '../../actions/auth';
import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

export default function AdminChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const { styles } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match!');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('oldPassword', oldPassword);
      formData.append('newPassword', newPassword);

      const result = await changePassword(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result?.success) {
        setSuccessMsg('Password successfully changed!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
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
            <label className="text-[#111] font-semibold" htmlFor="oldPassword">Old Password</label>
            <div className="bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden">
              <input 
                type="password" 
                id="oldPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#111] font-semibold" htmlFor="newPassword">New Password</label>
            <div className="bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden">
              <input 
                type="password" 
                id="newPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#111] font-semibold" htmlFor="confirmPassword">Type your password again</label>
            <div className="bg-[#f9fafb] border border-black/10 rounded-lg overflow-hidden">
              <input 
                type="password" 
                id="confirmPassword" 
                required
                className="w-full px-4 py-3 bg-transparent outline-none text-[#111] focus:bg-black/5 transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
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
