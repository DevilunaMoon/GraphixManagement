"use client";

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate?: string | Date | null;
  onExpire?: () => void;
  format?: 'full' | 'short' | 'compact';
  className?: string;
  badgeStyle?: boolean;
}

export default function CountdownTimer({
  targetDate,
  onExpire,
  format = 'short',
  className = '',
  badgeStyle = false
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const calculate = () => {
      const targetTime = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate || timeLeft.isExpired) {
    return (
      <span className={`text-rose-500 font-bold text-xs ${className}`}>
        Discount Expired
      </span>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (format === 'full') {
    return (
      <span className={`font-mono font-bold flex items-center gap-1 text-xs ${className}`}>
        <Clock size={13} className="shrink-0" />
        {`${pad(timeLeft.days)} Days ${pad(timeLeft.hours)} Hours ${pad(timeLeft.minutes)} Minutes ${pad(timeLeft.seconds)} Seconds`}
      </span>
    );
  }

  if (format === 'compact') {
    return (
      <span className={`font-mono font-black text-[11px] ${className}`}>
        {`${timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
      </span>
    );
  }

  // format === 'short'
  return (
    <div className={`flex items-center gap-1 font-mono font-bold text-xs ${badgeStyle ? 'bg-black/80 backdrop-blur-xs text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30' : ''} ${className}`}>
      <Clock size={12} className="shrink-0 text-amber-400" />
      <span>
        {`${pad(timeLeft.days)}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`}
      </span>
    </div>
  );
}
