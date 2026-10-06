"use client";

import { useState, useEffect } from 'react';
import { UserCircle2, Pencil, Receipt, HelpCircle, User, Upload, CheckCircle2, Phone, X, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateProfile } from '../../actions/user';
import DatePicker from '../../components/ui/DatePicker';

export default function CustomerProfile({ user }: { user?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const fromParam = searchParams.get('from');
  const navigate = router.push;
  
  const [userName, setUserName] = useState(user?.name || 'User1');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.image || '');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [dob, setDob] = useState(user?.dateOfBirth || '');
  
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (actionParam === 'phone' && !phone) {
      setNewPhone('');
      setIsPhoneModalOpen(true);
    }
  }, [actionParam]);

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
      setPhone(newPhone.trim());
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
      router.refresh(); // Refresh layout so navbar avatar updates globally
    } else {
      alert(res?.error || "Failed to save profile");
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        <div className="w-full flex flex-col md:flex-row gap-6">

        {/* Left Sidebar */}
        <aside className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
          {/* User Profile Summary Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col items-center gap-3.5 text-center transition-all hover:border-purple-200">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm flex items-center justify-center bg-purple-50/50">
                {avatar ? (
                  <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle2 size={80} className="text-purple-300" />
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-[10px] font-bold gap-1">
                <Upload size={16} />
                <span>Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-gray-950 truncate max-w-[220px]">{userName}</span>
              <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full font-bold text-xs border border-purple-100">
                <Pencil size={11} className="text-[#8b00cc]" />
                <span>Edit Profile</span>
              </div>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="bg-white rounded-3xl p-2.5 shadow-sm border border-purple-100/90 flex flex-col gap-1.5">
            <button 
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-sm cursor-pointer text-left transition-all border-none shadow-sm shadow-purple-500/25"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <User size={18} className="text-white" />
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

          </nav>
        </aside>

        {/* Main Profile Area */}
        <section className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col">
          {/* Header */}
          <div className="border-b border-purple-100 pb-5 mb-8">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">My Profile</h2>
              <Sparkles size={20} className="text-[#bd00ff]" />
            </div>
            <p className="text-gray-500 m-0 mt-1.5 font-medium text-xs sm:text-sm">
              Manage your personal information, contact details, and account preferences.
            </p>
          </div>

          {actionParam === 'phone' && !phone && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900 text-xs sm:text-sm font-semibold animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Phone size={18} className="text-amber-600 shrink-0" />
                <span>Please add and save your phone number below to unlock the <strong>Request Repair</strong> feature.</span>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setNewPhone(phone);
                  setIsPhoneModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer border-none shrink-0 transition-colors"
              >
                Add Now
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse lg:flex-row gap-8 sm:gap-10 lg:gap-12 flex-1">
            {/* Form Fields */}
            <div className="flex-1 flex flex-col gap-5">
              
              {/* Username */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Username
                </label>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full h-11 border border-purple-100 bg-gray-50/60 focus:bg-white rounded-xl px-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] transition-all font-semibold text-xs sm:text-sm shadow-xs"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0 flex items-center justify-start sm:justify-end gap-1.5 group relative">
                  <span>Email</span>
                  <HelpCircle size={14} className="text-purple-400 cursor-help" />
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-48 bg-gray-900 text-white text-[11px] px-2.5 py-1 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 text-center shadow-lg font-normal">
                    Email address is associated with your account login
                  </div>
                </label>
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-full h-11 border border-gray-100 bg-gray-50/80 rounded-xl px-4 text-gray-700 font-semibold text-xs sm:text-sm flex items-center justify-between">
                    <span className="truncate">{user?.email || 'No email attached'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Read-only</span>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Phone Number
                </label>
                <div className="flex-1 flex gap-3 items-center">
                  <div className="flex-1 h-11 border border-purple-100 bg-gray-50/60 rounded-xl px-4 text-gray-900 font-semibold text-xs sm:text-sm flex items-center justify-between">
                    <span className={phone ? "text-gray-900" : "text-gray-400 italic"}>
                      {phone || "No phone number added"}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewPhone(phone);
                      setIsPhoneModalOpen(true);
                    }} 
                    className="px-4 h-11 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] hover:text-[#7a00b3] font-bold text-xs border border-purple-200/80 cursor-pointer transition-colors shrink-0"
                  >
                    {phone ? 'Change' : '+ Add Phone'}
                  </button>
                </div>
              </div>

              {/* Gender */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Gender
                </label>
                <div className="flex-1">
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                    className="w-full h-11 border border-purple-100 bg-gray-50/60 focus:bg-white rounded-xl px-4 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] text-gray-900 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Date of Birth
                </label>
                <div className="flex-1">
                  <DatePicker 
                    value={dob} 
                    onChange={setDob}
                    className="w-full h-11 border border-purple-100 bg-gray-50/60 focus:bg-white rounded-xl px-4 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] text-gray-900 font-semibold text-xs sm:text-sm transition-all shadow-xs"
                  />
                </div>
              </div>

            </div>

            {/* Avatar Upload Container */}
            <div className="flex flex-col items-center justify-center gap-4 lg:border-l lg:border-purple-100 lg:pl-10 shrink-0">
              <div className="w-32 h-32 bg-purple-50/50 rounded-full flex justify-center items-center overflow-hidden border-4 border-purple-100 shadow-sm relative group">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle2 size={100} className="text-purple-300" />
                )}
              </div>
              
              <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-bold rounded-xl cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-xs">
                <Upload size={14} />
                <span>Upload an Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              
              <div className="text-center text-[11px] text-gray-400 font-medium max-w-[160px]">
                File size: max 5MB<br />Formats: JPG, PNG, WEBP
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-8 pt-5 border-t border-purple-100 flex flex-col sm:flex-row justify-end items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all border-none cursor-pointer disabled:opacity-50 text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </section>

        </div>

      </div>

      {/* Save Success Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-purple-100 flex flex-col items-center text-center gap-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-black text-gray-900 m-0">Profile Updated</h3>
              <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">Your account details have been successfully saved.</p>
            </div>

            {fromParam === 'monitoring' ? (
              <div className="flex flex-col gap-2.5 w-full mt-2">
                <button 
                  onClick={() => router.push('/customer/monitoring')}
                  className="w-full py-3 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold rounded-xl border-none cursor-pointer hover:shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <span>Return to Device Monitoring</span>
                  <ArrowRight size={16} />
                </button>
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-none cursor-pointer transition-colors text-xs"
                >
                  Stay on Profile
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold rounded-xl border-none cursor-pointer hover:shadow-md transition-all text-sm"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phone Prompt Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-100 flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#8b00cc] flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 m-0">{phone ? 'Change Phone Number' : 'Add Phone Number'}</h3>
                  <p className="text-gray-500 m-0 text-xs font-medium">Update your contact phone number</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">New Phone Number</label>
              <input 
                type="text" 
                placeholder="e.g. 0917 123 4567" 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full h-11 border border-purple-200 bg-purple-50/30 focus:bg-white rounded-xl px-4 outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] text-gray-900 font-semibold text-sm transition-all"
              />
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => { setIsPhoneModalOpen(false); setNewPhone(''); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer border-none transition-colors text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handlePhoneUpdate}
                disabled={!newPhone.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold rounded-xl border-none cursor-pointer hover:shadow-md transition-all disabled:opacity-50 text-xs sm:text-sm"
              >
                Update Phone
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

