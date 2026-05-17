import { useState } from 'react';
import { format, parse } from 'date-fns';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, className = '', placeholder = 'Select date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  let selectedDate: Date | null = null;
  if (value) {
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (!isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  const handleSelect = (date: Date | null) => {
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
            className="bg-white rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 m-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors z-10"
            >
              <X size={18} />
            </button>
            
            <div className="mb-4 pr-8 w-full text-left">
              <h3 className="text-lg font-bold text-gray-900 m-0">Select Date</h3>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              .react-datepicker { border: none !important; font-family: 'Inter', sans-serif !important; }
              .react-datepicker__header { background-color: transparent !important; border-bottom: none !important; padding-top: 0 !important; }
              .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background-color: #bd00ff !important; color: white !important; border-radius: 12px !important; font-weight: bold; }
              .react-datepicker__day:hover:not(.react-datepicker__day--selected) { background-color: #f3e8ff !important; border-radius: 12px !important; }
              .react-datepicker__day { border-radius: 12px !important; margin: 0.2rem !important; width: 2.5rem !important; line-height: 2.5rem !important; }
              .react-datepicker__day-name { margin: 0.2rem !important; width: 2.5rem !important; font-weight: bold; color: #6b7280; }
              .react-datepicker__current-month { display: none; }
              .react-datepicker__month-dropdown-container, .react-datepicker__year-dropdown-container { margin: 0 5px !important; }
              .react-datepicker__month-select, .react-datepicker__year-select { 
                padding: 6px 10px; 
                border-radius: 8px; 
                border: 2px solid #e5e7eb; 
                background: white; 
                font-weight: bold; 
                color: #111827; 
                outline: none; 
                cursor: pointer;
                transition: all 0.2s;
              }
              .react-datepicker__month-select:focus, .react-datepicker__year-select:focus { border-color: #bd00ff; }
              .react-datepicker__navigation { top: 12px !important; }
              .react-datepicker__header__dropdown { margin-bottom: 12px; }
            `}} />
            
            <ReactDatePicker
              selected={selectedDate}
              onChange={handleSelect}
              inline
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              minDate={new Date(1950, 0, 1)}
              maxDate={new Date(2030, 11, 31)}
            />
          </div>
        </div>
      )}
    </>
  );
}
