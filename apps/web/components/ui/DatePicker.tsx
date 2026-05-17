import { useState, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, className = '', placeholder = 'Select date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let selectedDate: Date | undefined = undefined;
  if (value) {
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (!isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer ${className}`}
      >
        <span className={selectedDate ? 'text-black font-semibold' : 'text-gray-400'}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
        <CalendarIcon size={18} className="text-gray-500 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-[110%] left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
          <style dangerouslySetInnerHTML={{__html: `
            .rdp-day_selected { background-color: #bd00ff !important; color: white !important; font-weight: bold; border-radius: 8px; }
            .rdp-day_today { color: #bd00ff; font-weight: bold; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f3e8ff; border-radius: 8px; }
            .rdp-day { border-radius: 8px; }
          `}} />
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            className="text-sm font-['Inter'] m-0"
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
