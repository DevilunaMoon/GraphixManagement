"use client";

import { useRouter } from 'next/navigation';
import { Palette, MailCheck, KeyRound, FileText, ChevronRight } from 'lucide-react';

export default function AdminSettings() {
  const router = useRouter();
  const navigate = router.push;

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Settings</h2>
      </div>

      {/* Settings Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm py-5 w-full">
        <ul className="flex flex-col list-none">
          
          <SettingsItem 
            icon={<Palette className="text-[#BF00FF] w-7 h-7" />}
            label="Themes"
            onClick={() => navigate('/admin/themes')}
          />
          
          <SettingsItem 
            icon={
              <div className="relative inline-block">
                <MailCheck className="text-[#BF00FF] w-7 h-7" />
                <span className="absolute -bottom-0.5 -right-1 bg-[#6B21A8] text-white text-[0.6rem] font-bold border-2 border-white rounded-full w-4 h-4 flex items-center justify-center">
                  !
                </span>
              </div>
            }
            label="Customer's Feedback"
            onClick={() => navigate('/admin/feedback')}
          />

          <SettingsItem 
            icon={<KeyRound className="text-[#BF00FF] w-7 h-7 -rotate-45" />}
            label="Change Password"
            onClick={() => navigate('/admin/change-password')}
          />

          <SettingsItem 
            icon={<FileText className="text-[#BF00FF] w-7 h-7" />}
            label="General Terms and Conditions"
            onClick={() => navigate('/admin/terms')}
          />

        </ul>
      </div>
    </div>
  );
}

function SettingsItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <li 
      onClick={onClick}
      className="flex justify-between items-center px-10 py-7 hover:bg-[#8100FF]/5 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-6">
        {icon}
        <span className="text-[1.1rem] font-medium text-[#111] group-hover:text-[#BF00FF] transition-colors">{label}</span>
      </div>
      <div>
        <ChevronRight className="w-6 h-6 text-[#111] group-hover:text-[#BF00FF] group-hover:translate-x-1 transition-all" />
      </div>
    </li>
  );
}
