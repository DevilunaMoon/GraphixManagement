"use client";

import { useState, useEffect } from 'react';
import { UserCircle2, Pencil, Receipt, KeyRound, HelpCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '../../actions/user';
import DatePicker from '../../components/ui/DatePicker';

export default function CustomerProfile({ user }: { user?: any }) {
  const router = useRouter();
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
      router.refresh(); // Refresh layout so the navbar avatar updates globally!
    } else {
      alert(res?.error || "Failed to save profile");
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        <div className="w-full flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col items-center gap-3 text-center">
            <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-2 border-purple-200 shadow-xs flex items-center justify-center bg-purple-50/50">
              {avatar ? (
                <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle2 size={72} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-gray-950">{userName}</span>
              <div className="flex items-center gap-1.5 text-gray-500 font-bold text-xs">
                <Pencil size={13} className="text-[#8b00cc]" /> Edit Profile
              </div>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-2.5 shadow-sm border border-purple-100/90 flex flex-col gap-1">
            <button 
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#9d00e6] text-white font-black text-sm cursor-pointer text-left transition-all border-none shadow-xs shadow-purple-500/20"
            >
              <User size={20} className="text-white" />
              <span>Profile</span>
            </button>

            <button 
              onClick={() => navigate('/customer/digital-receipt')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors text-gray-700 hover:text-[#8b00cc] font-bold text-sm"
            >
              <Receipt className="text-[#6b588c]" size={20} />
              <span>Digital Receipt</span>
            </button>

            <button 
              onClick={() => navigate('/customer/change-password')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors text-gray-700 hover:text-[#8b00cc] font-bold text-sm"
            >
              <KeyRound className="text-[#6b588c]" size={20} />
              <span>Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Profile Area */}
        <section className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col animate-in fade-in duration-300">
          <div className="border-b border-purple-100 pb-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">My Profile</h2>
            <p className="text-gray-500 m-0 mt-1 font-medium text-xs sm:text-sm">Manage your personal information and account security.</p>
          </div>

          <div className="flex flex-col-reverse lg:flex-row gap-8 sm:gap-10 lg:gap-14">
            {/* Form Fields */}
            <div className="flex-1 flex flex-col gap-4.5">
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[110px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">Username</label>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full h-10.5 border border-purple-100 bg-gray-50/50 focus:bg-white rounded-xl px-3.5 text-gray-900 outline-none focus:ring-2 focus:ring-[#8b00cc]/20 focus:border-[#8b00cc] transition-all font-semibold text-xs sm:text-sm shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[110px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                  Email
                  <HelpCircle size={13} className="text-gray-400 cursor-help" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-gray-900 text-white text-[11px] px-2.5 py-1 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 text-center shadow-lg">
                    Email address is tied to your account
                  </div>
                </label>
                <div className="flex-1 text-gray-900 font-bold text-xs sm:text-sm">{user?.email || ''}</div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[110px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">Phone Number</label>
                <div className="flex-1 flex gap-3 items-center">
                  <span className="text-gray-900 font-bold text-xs sm:text-sm">{phone || "Not set"}</span>
                  <button onClick={() => setIsPhoneModalOpen(true)} className="text-[#8b00cc] hover:underline bg-transparent border-none cursor-pointer font-bold text-xs p-0">Change</button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full">
                <label className="sm:w-[110px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Gender
                </label>
                <div className="flex-1">
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                    className="w-full h-10.5 border border-purple-100 bg-gray-50/50 focus:bg-white rounded-xl px-3.5 outline-none focus:ring-2 focus:ring-[#8b00cc]/20 focus:border-[#8b00cc] text-gray-900 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 w-full mb-2">
                <label className="sm:w-[110px] text-left sm:text-right text-gray-600 font-bold text-xs sm:text-sm shrink-0">
                  Date of Birth
                </label>
                <div className="flex-1">
                  <DatePicker 
                    value={dob} 
                    onChange={setDob}
                    className="w-full h-10.5 border border-purple-100 bg-gray-50/50 focus:bg-white rounded-xl px-3.5 outline-none focus:ring-2 focus:ring-[#8b00cc]/20 focus:border-[#8b00cc] text-gray-900 font-bold text-xs sm:text-sm transition-all shadow-2xs"
                  />
                </div>
              </div>

            </div>

            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4 lg:border-l lg:border-purple-100 lg:pl-10">
              <div className="w-[120px] h-[120px] bg-purple-50/50 rounded-full flex justify-center items-center overflow-hidden border-2 border-purple-200 shadow-xs">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle2 size={90} className="text-gray-400" />
                )}
              </div>
              <label className="px-5 py-2 bg-gradient-to-r from-[#8b00cc] to-[#9d00e6] text-white font-bold rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all text-xs">
                Upload an Image
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-100 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-10 py-2.5 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all border-none cursor-pointer disabled:opacity-50 text-xs sm:text-sm shadow-xs"
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>

        </div>

      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
            <p className="text-xl font-bold text-black m-0 text-center">Profile saved successfully!</p>
            <button 
              onClick={() => setIsSaveModalOpen(false)}
              className="w-full py-3 bg-[#bd00ff] text-white font-bold rounded-lg border-none cursor-pointer hover:bg-[#9c00d6] transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Phone Prompt Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-black m-0 border-none">Change Phone Number</h3>
              <p className="text-gray-500 m-0 text-sm">Enter your new phone number below.</p>
            </div>
            <input 
              type="text" 
              placeholder="e.g. 09123456789" 
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full h-12 border-2 border-gray-300 rounded-lg px-4 outline-none focus:border-[#bd00ff] text-black font-semibold uppercase tracking-wider transition-colors"
            />
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePhoneUpdate}
                className="flex-1 py-3 bg-[#bd00ff] border-none text-white font-bold rounded-lg cursor-pointer hover:bg-[#9c00d6] transition-colors"
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
