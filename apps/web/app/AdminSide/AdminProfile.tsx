"use client";

import { useState } from 'react';
import { 
  UserCircle2, 
  KeyRound, 
  HelpCircle, 
  Briefcase, 
  Calendar, 
  CheckCircle, 
  Building2, 
  Lock, 
  BadgeCheck, 
  ArrowRight, 
  Sparkles, 
  Info,
  Crown,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '../../actions/user';
import DatePicker from '../../components/ui/DatePicker';

export default function AdminProfile({ user }: { user?: any }) {
  const router = useRouter();
  const navigate = router.push;

  const [userName, setUserName] = useState(user?.name || 'Administrator');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.image || '');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [dob, setDob] = useState(user?.dateOfBirth || '');

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Derive official staff / administrator properties
  const empId = user?.id ? `ADM-${user.id.substring(user.id.length - 6).toUpperCase()}` : 'ADM-001001';
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const roleDisplay = isSuperAdmin ? 'Super Admin' : 'Branch Admin';

  const rawBranch = user?.branch || (isSuperAdmin ? 'All Branches' : 'Tagoloan');
  const branchDisplay = isSuperAdmin 
    ? 'All Branches (System-Wide)' 
    : (rawBranch.toLowerCase().includes('branch') ? rawBranch : `${rawBranch} Branch`);

  const hireDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'January 15, 2026';

  const statusName = user?.status || 'Active';
  const isActive = statusName.toLowerCase() === 'active';

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneUpdate = () => {
    if (newPhone.trim()) {
      setPhone(newPhone);
      setIsPhoneModalOpen(false);
      setNewPhone('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateProfile({
      name: userName,
      phone,
      gender,
      dateOfBirth: dob,
      image: avatar,
    });
    setIsSaving(false);
    if (res?.success) {
      setIsSaveModalOpen(true);
      router.refresh(); // Refresh layout to update navbar avatar immediately!
    } else {
      alert(res?.error || "Failed to save profile");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 font-['Inter']">
      
      {/* 1. Profile Information Card (Editable Details) */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-purple-200/80 flex flex-col">
        <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black m-0">Profile Information</h2>
            <p className="text-gray-400 m-0 mt-1 font-semibold text-sm">
              Manage your administrator account details and profile photo
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#bd00ff] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            <Sparkles size={13} />
            Editable
          </span>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-8">
          {/* Form Fields */}
          <div className="flex-1 flex flex-col gap-5">
            
            {/* Username / Full Name field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
              <label className="sm:w-[130px] text-left sm:text-right text-gray-600 font-bold text-sm shrink-0">
                Full Name
              </label>
              <div className="flex-1">
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-semibold"
                />
              </div>
            </div>

            {/* Email field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
              <label className="sm:w-[130px] text-left sm:text-right text-gray-600 font-bold text-sm shrink-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                Email Address
                <HelpCircle size={14} className="text-gray-400 cursor-help" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-gray-900 text-white text-xs px-3 py-2 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-25 text-center shadow-xl leading-normal font-medium">
                  Your registered administrator email cannot be updated directly.
                </div>
              </label>
              <div className="flex-1 text-gray-800 font-semibold pl-1 bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span>{user?.email || 'admin@graphix.com'}</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Primary</span>
              </div>
            </div>

            {/* Phone field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
              <label className="sm:w-[130px] text-left sm:text-right text-gray-600 font-bold text-sm shrink-0">
                Phone Number
              </label>
              <div className="flex-1 flex gap-4 items-center pl-1">
                <span className="text-black font-semibold">{phone || 'None'}</span>
                <button 
                  onClick={() => setIsPhoneModalOpen(true)} 
                  className="text-[#bd00ff] hover:underline bg-transparent border-none cursor-pointer font-bold text-sm p-0"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Gender field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
              <label className="sm:w-[130px] text-left sm:text-right text-gray-600 font-bold text-sm shrink-0">
                Gender
              </label>
              <div className="flex-1">
                <select 
                  value={gender} 
                  onChange={e => setGender(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] text-black font-semibold transition-colors bg-white cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* DOB field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full mb-2">
              <label className="sm:w-[130px] text-left sm:text-right text-gray-600 font-bold text-sm shrink-0">
                Date of Birth
              </label>
              <div className="flex-1">
                <DatePicker 
                  value={dob} 
                  onChange={setDob}
                  className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors bg-white font-semibold text-black"
                />
              </div>
            </div>

          </div>

          {/* Avatar Upload Container */}
          <div className="flex flex-col items-center gap-4 shrink-0 md:border-l md:border-gray-100 md:pl-8 justify-center">
            <div className="w-[120px] h-[120px] bg-purple-50 rounded-full flex justify-center items-center overflow-hidden border-2 border-purple-200 shadow-xs">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle2 size={90} className="text-purple-400" />
              )}
            </div>
            <label className="px-5 py-2.5 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all text-xs flex items-center gap-1.5 shadow-sm">
              <Sparkles size={13} />
              Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
        </div>

        {/* Submit Details Button */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-10 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer disabled:opacity-50 shadow-md shadow-purple-500/20"
          >
            {isSaving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>

      </div>

      {/* 2. Account Information Card (Read-Only) */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-purple-200/80 flex flex-col">
        <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black m-0 flex items-center gap-2">
              <span>Account Information</span>
            </h2>
            <p className="text-gray-400 m-0 mt-1 font-semibold text-sm">
              Official administrative credentials and verified authorization
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            <Lock size={12} className="text-gray-400" />
            Read-Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Staff ID */}
          <div className="bg-[#FAF7FF] p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Admin ID</span>
              <BadgeCheck size={18} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900 font-mono tracking-tight">{empId}</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Administrator Identifier</p>
            </div>
          </div>

          {/* Role */}
          <div className="bg-[#FAF7FF] p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#bd00ff] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</span>
              {isSuperAdmin ? <Crown size={18} className="text-amber-500" /> : <Briefcase size={18} />}
            </div>
            <div>
              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-sm font-black border ${
                isSuperAdmin 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-purple-100 text-[#bd00ff] border border-purple-200'
              }`}>
                {isSuperAdmin && <Crown size={14} className="text-amber-600" />}
                <span>{roleDisplay}</span>
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-1">
                {isSuperAdmin ? 'Full System Root Privileges' : 'Branch Management Privileges'}
              </p>
            </div>
          </div>

          {/* Assigned Branch */}
          <div className="bg-[#FAF7FF] p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {isSuperAdmin ? 'Branch Scope' : 'Assigned Branch'}
              </span>
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900 truncate" title={branchDisplay}>
                {branchDisplay}
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                {isSuperAdmin ? 'Global Multi-Branch Access' : 'Verified Location'}
              </p>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-[#FAF7FF] p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Account Status</span>
              <CheckCircle size={18} />
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {statusName}
              </span>
              <p className="text-[11px] text-gray-400 font-semibold mt-1">System Access Active</p>
            </div>
          </div>

          {/* Joined Date */}
          <div className="bg-[#FAF7FF] p-4 rounded-2xl border border-purple-100 flex flex-col justify-between sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between text-indigo-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Joined Date</span>
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">{hireDate}</p>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Account Registration Date</p>
            </div>
          </div>
        </div>

        {/* Informational Footer Note */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Info size={15} className="text-[#bd00ff] shrink-0" />
          <span>
            {isSuperAdmin 
              ? 'Super Admin roles maintain root level security and system-wide configurations across all branches.'
              : 'Branch Admin role and branch assignment are authorized by the Super Admin.'}
          </span>
        </div>
      </div>

      {/* 3. Security & Password Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#bd00ff] flex items-center justify-center shrink-0 border border-purple-100">
            <KeyRound size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 m-0">Password & Security</h3>
            <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5 font-medium">
              Keep your administrator account credentials safe and secure
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/change-password')}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#bd00ff] font-bold text-sm transition-colors border border-purple-200/60 shadow-xs cursor-pointer shrink-0"
        >
          <span>Change Password</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Save Success Alert Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200 border border-purple-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-xs border border-emerald-100">
              <CheckCircle size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-900 m-0">Changes Saved!</h3>
              <p className="text-sm text-gray-500 mt-1 font-medium">Your profile information has been updated successfully.</p>
            </div>
            <button 
              onClick={() => setIsSaveModalOpen(false)}
              className="w-full py-3 bg-[#bd00ff] text-white font-bold rounded-xl border-none cursor-pointer hover:bg-[#9c00d6] transition-colors shadow-md shadow-purple-500/20"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Phone Number Updater Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200 border border-purple-100">
            <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
              <h3 className="text-xl font-black text-gray-900 m-0">Update Phone Number</h3>
              <p className="text-gray-500 m-0 text-xs font-semibold">Enter your active contact number</p>
            </div>
            <input 
              type="text" 
              placeholder="e.g. 09123456789" 
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] text-black font-semibold tracking-wider transition-colors"
            />
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handlePhoneUpdate}
                className="flex-1 py-2.5 bg-[#bd00ff] border-none text-white font-bold rounded-xl cursor-pointer hover:bg-[#9c00d6] transition-colors shadow-md shadow-purple-500/20 text-sm"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
