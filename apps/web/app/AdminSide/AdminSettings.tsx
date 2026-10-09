"use client";

import { useRouter } from 'next/navigation';
import { Palette, MailCheck, KeyRound, FileText, ChevronRight, Building2, MessageSquare, MessageSquarePlus, HelpCircle, Lock } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

export default function AdminSettings() {
  const router = useRouter();
  const navigate = router.push;
  const { isSuperAdmin } = useBranch();

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-7xl mx-auto w-full pb-10">
      <div className="mb-1 sm:mb-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 m-0 tracking-tight">Admin Settings</h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-1 leading-relaxed">
          Manage store branches, dashboard aesthetics, customer inquiries, and security credentials.
        </p>
      </div>

      {/* Settings Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-200/80 shadow-xs py-2 sm:py-3 w-full overflow-hidden">
        <ul className="flex flex-col list-none m-0 p-0">
          
          <SettingsItem 
            icon={<Building2 className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
            label="Branch & Contact Settings"
            sublabel="Manage store contact email, phone, location address, and checkout GCash"
            onClick={() => navigate('/admin/branches')}
          />

          <SettingsItem 
            icon={<Palette className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
            label="Themes"
            sublabel="Customize dashboard color theme and aesthetics"
            onClick={() => navigate('/admin/themes')}
          />
          
          <SettingsItem 
            icon={
              <div className="relative inline-block">
                <MessageSquarePlus className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            }
            label="Customer Support Questions"
            sublabel={isSuperAdmin 
              ? "View, monitor, and answer customer support inquiries across all branches"
              : "View and respond to customer inquiries submitted to your assigned branch"
            }
            onClick={() => navigate('/admin/support')}
          />
          
          <SettingsItem 
            icon={
              <div className="relative inline-block">
                <MailCheck className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />
                <span className="absolute -bottom-0.5 -right-1 bg-[#6B21A8] text-white text-[0.6rem] font-bold border-2 border-white rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
                  !
                </span>
              </div>
            }
            label="Customer Feedback"
            sublabel="Review reviews, ratings, and customer comments"
            onClick={() => navigate('/admin/feedback')}
          />

          <SettingsItem 
            icon={
              <div className="relative inline-block">
                <MessageSquare className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />
                <span className="absolute -bottom-0.5 -right-1 bg-[#6B21A8] text-white text-[0.6rem] font-bold border-2 border-white rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
                  !
                </span>
              </div>
            }
            label="Repair Feedback"
            sublabel="View customer feedback, ratings, and comments about completed repairs"
            onClick={() => navigate('/admin/repair-feedback')}
          />

          <SettingsItem 
            icon={<KeyRound className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7 -rotate-45" />}
            label="Change Password"
            sublabel="Update your admin account login credentials"
            onClick={() => navigate('/admin/change-password')}
          />

          <SettingsItem 
            icon={<FileText className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
            label="Terms & Privacy"
            badge={!isSuperAdmin ? "View Only" : undefined}
            sublabel={isSuperAdmin 
              ? "Manage and edit store policies, terms & conditions, and privacy guidelines"
              : "View store policies, warranty terms, and privacy guidelines"
            }
            onClick={() => navigate('/admin/terms')}
          />

          <SettingsItem 
            icon={<HelpCircle className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
            label="Frequently Asked Questions"
            badge={!isSuperAdmin ? "View Only" : undefined}
            sublabel={isSuperAdmin 
              ? "Manage frequently asked questions and answers displayed to customers"
              : "View published frequently asked questions and answers"
            }
            onClick={() => navigate('/admin/faqs')}
          />

        </ul>
      </div>
    </div>
  );
}

function SettingsItem({ 
  icon, 
  label, 
  sublabel, 
  badge, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  sublabel?: string; 
  badge?: string; 
  onClick: () => void;
}) {
  return (
    <li 
      onClick={onClick}
      className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-3.5 sm:py-4.5 md:py-5 hover:bg-purple-50/50 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0 gap-3"
    >
      <div className="flex items-center gap-3.5 sm:gap-5 md:gap-6 flex-1 min-w-0">
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm sm:text-[1.05rem] md:text-[1.1rem] font-bold text-gray-900 group-hover:text-[#BF00FF] transition-colors leading-snug">
              {label}
            </span>
            {badge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-[#bd00ff] font-extrabold text-[10px] sm:text-[11px] rounded-full border border-purple-200 shrink-0 whitespace-nowrap shadow-2xs">
                <Lock size={10} className="text-[#bd00ff]" />
                {badge}
              </span>
            )}
          </div>
          {sublabel && (
            <span className="text-xs text-gray-500 font-normal mt-0.5 line-clamp-2 leading-relaxed">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#BF00FF] group-hover:translate-x-1 transition-all" />
      </div>
    </li>
  );
}
