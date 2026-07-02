"use client";

import { useState } from 'react';
import { UserCircle2, Pencil, KeyRound, HelpCircle, Briefcase, DollarSign, Wrench, Calendar, Landmark, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '../../actions/user';
import DatePicker from '../../components/ui/DatePicker';

export default function CashierProfile({ user, stats }: { user?: any; stats?: any }) {
  const router = useRouter();
  const navigate = router.push;

  const [userName, setUserName] = useState(user?.name || 'Cashier Staff');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.image || '');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [dob, setDob] = useState(user?.dateOfBirth || '');

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const empId = user?.id ? `EMP-${user.id.substring(user.id.length - 6).toUpperCase()}` : 'EMP-001928';
  const hireDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'June 15, 2025';

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
    <main className="flex-1 p-2 sm:p-5 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        
        <div className="w-full flex flex-col lg:flex-row gap-6">
          {/* Left Column: ID Badge & Sub-Nav */}
          <aside className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
            
            {/* Holographic Styled Digital ID Card */}
            <div className="relative overflow-hidden bg-gradient-to-tr from-[#6d28d9] via-[#4c1d95] to-[#1e1b4b] rounded-3xl p-6 shadow-xl border border-white/10 text-white flex flex-col items-center gap-5">
              {/* Decorative Holographic Circle Backgrounds */}
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-500/30 rounded-full blur-xl" />
              
              <div className="w-full flex justify-between items-center pb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <Landmark size={16} className="text-purple-300" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-200">Graphix POS ID</span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Active</span>
                </div>
              </div>

              {/* Avatar Frame */}
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-white/20 shadow-md flex items-center justify-center bg-white/5 relative group">
                {avatar ? (
                  <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle2 size={80} className="text-purple-200/50" />
                )}
              </div>

              {/* ID Details */}
              <div className="flex flex-col items-center text-center gap-1 w-full">
                <span className="text-xl font-bold tracking-tight text-white">{userName}</span>
                <span className="text-xs font-semibold text-purple-300 bg-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Store Cashier
                </span>
              </div>

              {/* Card Bottom Details */}
              <div className="w-full grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-white/10 text-xs font-medium text-purple-200">
                <div className="flex flex-col gap-0.5">
                  <span className="text-purple-400 font-semibold uppercase text-[9px] tracking-wider">Staff ID</span>
                  <span className="font-bold text-white font-mono">{empId}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-purple-400 font-semibold uppercase text-[9px] tracking-wider">Joined Date</span>
                  <span className="font-bold text-white">{hireDate}</span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="bg-white rounded-3xl p-3 shadow-sm border border-purple-100 flex flex-col gap-1.5">
              <button 
                onClick={() => {}}
                className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-purple-50 text-[#bd00ff]"
              >
                <Briefcase size={22} />
                <span className="text-base font-bold">Profile Info</span>
              </button>

              <button 
                onClick={() => navigate('/cashier/change-password')}
                className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent text-gray-700 hover:bg-purple-50 hover:text-[#bd00ff] transition-all group"
              >
                <KeyRound className="text-gray-400 group-hover:text-[#bd00ff] transition-colors" size={22} />
                <span className="text-base font-semibold transition-colors">Change Password</span>
              </button>
            </nav>
          </aside>

          {/* Right Column: Main Profile Fields & Stats */}
          <section className="flex-1 flex flex-col gap-6">
            
            {/* System Performance Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-[#bd00ff] rounded-xl shrink-0">
                  <Briefcase size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-black">{(stats?.salesCount || 0).toLocaleString()}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">POS Checkouts</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
                  <DollarSign size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-black">₱{(stats?.salesRevenue || 0).toLocaleString()}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue Processed</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <Wrench size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-black">{(stats?.activeRepairs || 0).toLocaleString()}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Repairs</span>
                </div>
              </div>
            </div>

            {/* Profile Form Details */}
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-[#bd00ff] flex flex-col">
              <div className="border-b border-gray-100 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-black m-0">Staff Profile</h2>
                <p className="text-gray-400 m-0 mt-1 font-semibold text-sm">Manage and protect your store credentials</p>
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-8">
                {/* Form Fields */}
                <div className="flex-1 flex flex-col gap-5">
                  
                  {/* Name field */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
                    <label className="sm:w-[120px] text-left sm:text-right text-gray-500 font-bold text-sm shrink-0">Username</label>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-semibold"
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
                    <label className="sm:w-[120px] text-left sm:text-right text-gray-500 font-bold text-sm shrink-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                      Email Address
                      <HelpCircle size={14} className="text-gray-400 cursor-help" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-25 text-center shadow-lg leading-normal font-medium">
                        Your registered staff email cannot be updated.
                      </div>
                    </label>
                    <div className="flex-1 text-black font-semibold pl-1">{user?.email || 'cashier@graphix.com'}</div>
                  </div>

                  {/* Phone field */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
                    <label className="sm:w-[120px] text-left sm:text-right text-gray-500 font-bold text-sm shrink-0">Phone Number</label>
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
                    <label className="sm:w-[120px] text-left sm:text-right text-gray-500 font-bold text-sm shrink-0">Gender</label>
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
                    <label className="sm:w-[120px] text-left sm:text-right text-gray-500 font-bold text-sm shrink-0">Date of Birth</label>
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
                <div className="flex flex-col items-center gap-4 shrink-0 md:border-l md:border-gray-100 md:pl-8">
                  <div className="w-[120px] h-[120px] bg-gray-50 rounded-full flex justify-center items-center overflow-hidden border border-gray-200">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserCircle2 size={90} className="text-gray-400" />
                    )}
                  </div>
                  <label className="px-5 py-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all text-xs">
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
                  className="w-full sm:w-auto px-10 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </div>
          </section>
        </div>

      </div>

      {/* Save Success Alert Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle size={28} />
            </div>
            <p className="text-lg font-bold text-gray-900 m-0 text-center">Changes saved successfully!</p>
            <button 
              onClick={() => setIsSaveModalOpen(false)}
              className="w-full py-3 bg-[#bd00ff] text-white font-bold rounded-xl border-none cursor-pointer hover:bg-[#9c00d6] transition-colors shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Phone Number Updater Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-900 m-0">Update Phone Number</h3>
              <p className="text-gray-500 m-0 text-xs font-semibold">Enter your active contact number below</p>
            </div>
            <input 
              type="text" 
              placeholder="e.g. 09123456789" 
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] text-black font-semibold uppercase tracking-wider transition-colors"
            />
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="flex-1 py-3 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePhoneUpdate}
                className="flex-1 py-3 bg-[#bd00ff] border-none text-white font-bold rounded-xl cursor-pointer hover:bg-[#9c00d6] transition-colors shadow-md"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
