"use client";

import { useState, useEffect } from 'react';
import { UserCircle2, Pencil, Receipt, KeyRound, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '../../actions/user';

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
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col gap-10">
        <div className="w-full flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-[#0022ff] shadow-sm flex items-center justify-center bg-gray-50">
              {avatar ? (
                <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle2 size={80} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl font-bold text-black">{userName}</span>
              <div className="flex items-center gap-2 text-gray-500 font-semibold p-0">
                <Pencil size={16} /> Edit Profile
              </div>
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
              onClick={() => navigate('/customer/change-password')}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors group"
            >
              <KeyRound className="text-[#01f0ff] group-hover:text-[#bd00ff] transition-colors" size={24} />
              <span className="text-lg font-semibold text-gray-700 group-hover:text-[#bd00ff] transition-colors">Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Profile Area */}
        <section className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-[#bd00ff] flex flex-col animate-in fade-in duration-300">
          <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold text-black m-0 border-none">My Profile</h2>
            <p className="text-gray-500 m-0 mt-2 font-medium">Manage and Protect your account</p>
          </div>

          <div className="flex flex-col-reverse lg:flex-row gap-8 sm:gap-10 lg:gap-20">
            {/* Form Fields */}
            <div className="flex-1 flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-semibold shrinkage-0">UserName</label>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full h-11 border-2 border-gray-300 rounded-lg px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-semibold shrinkage-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                  Email
                  <HelpCircle size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                    You cannot update your email
                  </div>
                </label>
                <div className="flex-1 text-black font-medium">{user?.email || ''}</div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-semibold shrinkage-0">Phone Number</label>
                <div className="flex-1 flex gap-4 items-center">
                  <span className="text-black font-medium">{phone}</span>
                  <button onClick={() => setIsPhoneModalOpen(true)} className="text-[#bd00ff] hover:underline bg-transparent border-none cursor-pointer font-semibold p-0">Change</button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-semibold shrinkage-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                  Gender
                </label>
                <div className="flex-1">
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                    className="w-full h-11 border-2 border-gray-300 rounded-lg px-4 outline-none focus:border-[#bd00ff] text-black font-semibold transition-colors bg-white cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full mb-6">
                <label className="sm:w-[120px] text-left sm:text-right text-gray-600 font-semibold shrinkage-0 flex items-center justify-start sm:justify-end gap-1 group relative">
                  Date of Birth
                </label>
                <div className="flex-1">
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)}
                    className="w-full h-11 border-2 border-gray-300 rounded-lg px-4 outline-none focus:border-[#bd00ff] text-black font-semibold transition-colors"
                  />
                </div>
              </div>

            </div>

            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-6 lg:border-l lg:border-gray-200 lg:pl-10">
              <div className="w-[150px] h-[150px] bg-gray-100 rounded-full flex justify-center items-center overflow-hidden border border-gray-200">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle2 size={100} className="text-gray-400" />
                )}
              </div>
              <label className="px-6 py-2.5 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold rounded-lg cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm">
                Upload an Image
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>

          <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-12 py-3 bg-[#bd00ff] text-white font-bold rounded-lg hover:bg-[#9c00d6] transition-colors border-none cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
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
