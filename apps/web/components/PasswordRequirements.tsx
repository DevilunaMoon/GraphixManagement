"use client";

import React from "react";
import { Check, X, AlertCircle } from "lucide-react";
import {
  checkPasswordRequirements,
  detectInvalidPasswordChars,
} from "../lib/passwordPolicy";

interface PasswordRequirementsProps {
  password: string;
  isFocused?: boolean;
  className?: string;
  variant?: "glass" | "card" | "clean";
}

export default function PasswordRequirements({
  password = "",
  isFocused = true,
  className = "",
  variant = "card",
}: PasswordRequirementsProps) {
  // Only render if focused or if user has started typing
  if (!isFocused && (!password || password.length === 0)) {
    return null;
  }

  const reqs = checkPasswordRequirements(password);
  const invalidCheck = detectInvalidPasswordChars(password);

  const items = [
    { label: "At least 8 characters", met: reqs.minLength },
    { label: "At least 1 uppercase letter (A-Z)", met: reqs.hasUppercase },
    { label: "At least 1 lowercase letter (a-z)", met: reqs.hasLowercase },
    { label: "At least 1 number (0-9)", met: reqs.hasNumber },
    { label: "At least 1 special character", met: reqs.hasSpecialChar },
    { label: "No spaces", met: password.length > 0 ? reqs.noSpaces : false },
    {
      label: "No unsupported/invalid characters",
      met: password.length > 0 ? reqs.noInvalidChars : false,
    },
  ];

  // Variant styling
  const isGlass = variant === "glass";
  const containerClasses = isGlass
    ? "bg-black/30 backdrop-blur-md border border-white/20 text-white rounded-2xl p-3.5 shadow-lg animate-in fade-in slide-in-from-top-1"
    : "bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 shadow-xs animate-in fade-in slide-in-from-top-1";

  const titleClasses = isGlass
    ? "text-xs font-black text-white/90 tracking-wide uppercase flex items-center justify-between"
    : "text-xs font-black text-purple-950 tracking-wide uppercase flex items-center justify-between";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={titleClasses}>
        <span>Password Requirements</span>
        {reqs.isValid && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
            All Met
          </span>
        )}
      </div>

      {invalidCheck.hasInvalid && (
        <div className="mt-2 p-2 bg-rose-500/20 border border-rose-400/40 rounded-xl flex items-center gap-1.5 text-xs font-bold text-rose-200 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 text-rose-300" />
          <span>{invalidCheck.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
        {items.map((item, idx) => {
          const isMet = item.met;

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors duration-200 ${
                isMet
                  ? isGlass
                    ? "text-emerald-300"
                    : "text-emerald-700 font-bold"
                  : isGlass
                  ? "text-white/60"
                  : "text-gray-500"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
                  isMet
                    ? isGlass
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : isGlass
                    ? "bg-white/10 text-white/40 border border-white/20"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {isMet ? <Check size={10} strokeWidth={3} /> : <X size={9} strokeWidth={2.5} />}
              </span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
