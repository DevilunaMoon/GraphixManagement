import { useState } from 'react';
import { format, parse } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar as CalendarIcon, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, className = '', placeholder = 'Select date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

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
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-between cursor-pointer ${className}`}
      >
        <span className={selectedDate ? 'text-black font-semibold' : 'text-gray-400'}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
        <CalendarIcon size={18} className="text-gray-500 shrink-0" />
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="mb-2 pr-8">
              <h3 className="text-lg font-bold text-gray-900 m-0">Select Date</h3>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              .rdp-day_selected { background-color: #bd00ff !important; color: white !important; font-weight: bold; border-radius: 12px; }
              .rdp-day_today { color: #bd00ff; font-weight: bold; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f3e8ff; border-radius: 12px; }
              .rdp-day { border-radius: 12px; height: 40px; width: 40px; }
              .rdp-nav_button { width: 32px; height: 32px; border-radius: 8px; }
            `}} />
            
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              className="text-sm font-['Inter'] m-0"
              showOutsideDays
            />
          </div>
        </div>
      )}
    </>
  );
}
