"use client";

import { useState, useEffect } from 'react';
import { Filter, ChevronDown, FileSpreadsheet, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDashboard() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [year, setYear] = useState('2026');

  const [reportData, setReportData] = useState<{month: string; salesGrowth: number; userGrowth: number}[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ month: string, users: string, trend: string, trendUp: boolean }[]>([]);
  const [selectedMonthData, setSelectedMonthData] = useState<{ month: string, users: string, trend: string, trendUp: boolean } | null>(null);
  
  const { styles } = useTheme();
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Generate static data for the selected year so CSV matches the chart exactly
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    setReportData(months.map(m => ({
      month: m,
      salesGrowth: Math.floor(Math.random() * 60) + 30,
      userGrowth: Math.floor(Math.random() * 60) + 30,
    })));

    // Fetch real User Growth data based on selected year
    fetch(`/api/analytics/users/yearly-growth?year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUserGrowthData(data);
        }
      })
      .catch(err => console.error("Failed to fetch user growth data:", err));
  }, [year]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    setIsFilterOpen(false);
    setKey(prev => prev + 1);
  };

  const handleDownload = () => {
    if (reportData.length === 0) return;

    const headers = ['Month', 'Sales Growth (%)', 'User Growth (%)'];
    const csvRows = [headers.join(',')];

    for (const row of reportData) {
      csvRows.push(`${row.month},${row.salesGrowth},${row.userGrowth}`);
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Graphix_Monthly_Activities_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-[1.6rem] font-bold text-[#111]">Monthly Activities Summary</h2>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Download CSV */}
            <button 
              onClick={handleDownload}
              className={`flex items-center gap-2 bg-gradient-to-r ${styles.gradient} text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm opacity-90 hover:opacity-100`}
            >
              <FileSpreadsheet size={20} />
              <span>Download CSV</span>
            </button>

            {/* Filter Dropdown */}
            <div className="relative font-['Inter']">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 cursor-pointer ${styles.textActive} text-[1.1rem] font-semibold hover:bg-black/5 transition-all w-[150px] justify-between`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  <span>{year}</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute top-[115%] right-0 w-[150px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-black/10 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
                  {['2026', '2025', '2024', '2023'].map(y => (
                    <button 
                      key={y}
                      onClick={() => handleYearChange(y)}
                      className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${year === y ? `${styles.textActive} font-bold` : 'text-[#111]'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div key={key} className="flex flex-col gap-8">
          {/* Sales Growth Chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#111] mb-1">Sales Growth</h3>
              <p className="text-sm text-[#666]">Monthly Overview ({year})</p>
            </div>
            
            <div className={`w-full overflow-x-auto border-2 ${styles.borderMain} rounded-xl relative transition-colors duration-300`}>
              <div className="w-full min-w-[500px] h-[300px] p-5 flex justify-around items-end gap-2 text-xs md:text-sm">
                {reportData.map((data) => (
                  <ChartBar key={`sales-${data.month}`} label={data.month} height={() => `${data.salesGrowth}%`} color={`bg-gradient-to-t ${styles.gradient}`} />
                ))}
              </div>
            </div>
          </div>

          {/* User Growth Table */}
          <div className="w-full">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 flex flex-col">
              <div className="mb-5 pb-4 border-b border-black/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#111] mb-1">User Growth</h3>
                  <p className="text-sm text-[#666]">Monthly Registration Overview ({year})</p>
                </div>
              </div>
              <div className={`w-full border-2 ${styles.borderMain} rounded-xl overflow-hidden`}>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-black/5">
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5">Month</th>
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5">New Users</th>
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5 hidden md:table-cell">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userGrowthData.map((data, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-black/5 hover:bg-black/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedMonthData(data)}
                      >
                        <td className="py-4 px-5 font-medium text-[#111] text-sm">{data.month}</td>
                        <td className="py-4 px-5 font-medium text-[#111] text-sm">{data.users}</td>
                        <td className="py-4 px-5 hidden md:table-cell">
                          <div className={`font-bold text-sm flex items-center gap-1.5 ${data.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                            {data.trendUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />} {data.trend}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {userGrowthData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-[#666] font-medium">Loading user data...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedMonthData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedMonthData(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">{selectedMonthData.month} Details</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedMonthData(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-[#666] font-medium">New Users</span>
                <span className="font-bold text-xl text-[#111]">{selectedMonthData.users}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666] font-medium">Monthly Trend</span>
                <div className={`font-bold text-lg flex items-center gap-1.5 ${selectedMonthData.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedMonthData.trendUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />} 
                  {selectedMonthData.trend}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedMonthData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChartBar({ label, height, color }: { label: string, height: () => string, color: string }) {
  const [h, setH] = useState('0%');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setH(height());
    }, 50);
    return () => clearTimeout(timer);
  }, [height]);

  return (
    <div className="flex flex-col items-center justify-end h-full w-full gap-2">
      <div 
        className={`w-full max-w-[40px] ${color} rounded-t-md hover:brightness-125 transition-all duration-1000 ease-out cursor-pointer`}
        style={{ height: h }}
      ></div>
      <span className="text-[#111] font-semibold">{label}</span>
    </div>
  );
}
