"use client";

import { useRouter } from 'next/navigation';
import { Palette, MailCheck, KeyRound, FileText, ChevronRight, Building2 } from 'lucide-react';

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
            icon={<Building2 className="text-[#BF00FF] w-7 h-7" />}
            label="Branch & Contact Settings"
            sublabel="Manage store contact email, phone, location address, and checkout GCash"
            onClick={() => navigate('/admin/branches')}
          />

          <SettingsItem 
            icon={<Palette className="text-[#BF00FF] w-7 h-7" />}
            label="Themes"
            sublabel="Customize dashboard color theme and aesthetics"
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
            label="Customer Feedback"
            sublabel="Review reviews, ratings, and customer comments"
            onClick={() => navigate('/admin/feedback')}
          />

          <SettingsItem 
            icon={<KeyRound className="text-[#BF00FF] w-7 h-7 -rotate-45" />}
            label="Change Password"
            sublabel="Update your admin account login credentials"
            onClick={() => navigate('/admin/change-password')}
          />

          <SettingsItem 
            icon={<FileText className="text-[#BF00FF] w-7 h-7" />}
            label="General Terms and Conditions"
            sublabel="View store policies, warranty terms, and service agreements"
            onClick={() => navigate('/admin/terms')}
          />

        </ul>
      </div>
    </div>
  );
}

function SettingsItem({ icon, label, sublabel, onClick }: { icon: React.ReactNode, label: string, sublabel?: string, onClick: () => void }) {
  return (
    <li 
      onClick={onClick}
      className="flex justify-between items-center px-8 md:px-10 py-5 md:py-6 hover:bg-[#8100FF]/5 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center gap-5 md:gap-6">
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col">
          <span className="text-[1.05rem] md:text-[1.1rem] font-bold text-[#111] group-hover:text-[#BF00FF] transition-colors">{label}</span>
          {sublabel && (
            <span className="text-xs text-gray-500 font-normal mt-0.5">{sublabel}</span>
          )}
        </div>
      </div>
      <div>
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-[#BF00FF] group-hover:translate-x-1 transition-all" />
      </div>
    </li>
  );
}
