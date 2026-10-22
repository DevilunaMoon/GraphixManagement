"use client";

import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Building2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function TechnicianSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to change password');
      }

      setPwdSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Error changing password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-4xl w-full mx-auto font-['Inter']">
      {/* Header */}
      <div className="border-b border-purple-100 pb-5">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
          Technician Account & Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
          Manage your credentials, branch assignment, and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center font-black text-lg">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 m-0">
                {profile?.name || 'Technician'}
              </h3>
              <span className="text-[10px] font-bold text-[#8b00cc] bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Staff Technician
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500 font-medium">Email</span>
              <span className="font-bold text-gray-900">{profile?.email || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500 font-medium">Contact Phone</span>
              <span className="font-bold text-gray-900">{profile?.phone || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500 font-medium">Operating Branch</span>
              <span className="font-bold text-purple-900">📍 {profile?.branch || 'Tagoloan'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500 font-medium">Account Status</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-[#8b00cc]">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 m-0">
                Change Password
              </h3>
              <p className="text-[11px] text-gray-500 m-0">Update your account login password</p>
            </div>
          </div>

          {pwdError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-200">
              {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-gray-700">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-gray-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-gray-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold transition-all shadow-sm cursor-pointer border-none disabled:opacity-50"
            >
              {pwdLoading ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
