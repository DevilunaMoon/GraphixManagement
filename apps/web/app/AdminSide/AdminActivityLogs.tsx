"use client";

import { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Building2, 
  ShieldAlert, 
  UserCheck, 
  Package, 
  Trash2, 
  Edit3, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar,
  X,
  Filter
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import DatePicker from '../../components/ui/DatePicker';

interface ActivityLogItem {
  id: string;
  action: string;
  description: string;
  details?: string | null;
  branch?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  createdAt: string;
}

export default function AdminActivityLogs() {
  const { branches } = useBranch();
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const itemsPerPage = 15;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        search: searchTerm,
        branch: selectedBranchFilter,
        action: selectedActionFilter,
        date: filterDate
      });

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, selectedBranchFilter, selectedActionFilter, filterDate]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE_BRANCH':
      case 'CREATE_ACCOUNT':
      case 'ADD_DEVICE':
        return {
          icon: <Plus size={13} />,
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      case 'UPDATE_BRANCH':
      case 'EDIT_ACCOUNT':
        return {
          icon: <Edit3 size={13} />,
          bg: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'SUSPEND_ACCOUNT':
      case 'DEACTIVATE_BRANCH':
        return {
          icon: <ShieldAlert size={13} />,
          bg: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 'LIFT_SUSPENSION':
        return {
          icon: <UserCheck size={13} />,
          bg: 'bg-teal-100 text-teal-800 border-teal-200'
        };
      case 'DELETE_BRANCH':
      case 'DELETE_ACCOUNT':
        return {
          icon: <Trash2 size={13} />,
          bg: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: <ScrollText size={13} />,
          bg: 'bg-purple-100 text-purple-800 border-purple-200'
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-[#bd00ff] shadow-sm">
            <ScrollText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">System Activity Logs</h2>
            <p className="text-gray-500 m-0 text-sm">Audit trail tracking all administrative and operational activities</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-purple-50 text-purple-700 font-bold rounded-2xl border border-purple-100 text-sm">
          {totalLogs.toLocaleString()} Logged Events
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="w-full md:flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search descriptions, actors, or details..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* Branch Filter */}
        <div className="w-full md:w-auto min-w-[180px]">
          <select
            value={selectedBranchFilter}
            onChange={(e) => { setSelectedBranchFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">🌐 All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>📍 {b.name} Branch</option>
            ))}
          </select>
        </div>

        {/* Action Filter */}
        <div className="w-full md:w-auto min-w-[180px]">
          <select
            value={selectedActionFilter}
            onChange={(e) => { setSelectedActionFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">⚡ All Actions</option>
            <option value="CREATE_BRANCH">Create Branch</option>
            <option value="UPDATE_BRANCH">Update Branch</option>
            <option value="DEACTIVATE_BRANCH">Deactivate Branch</option>
            <option value="DELETE_BRANCH">Delete Branch</option>
            <option value="CREATE_ACCOUNT">Create Staff Account</option>
            <option value="SUSPEND_ACCOUNT">Suspend Account</option>
            <option value="LIFT_SUSPENSION">Reactivate Account</option>
            <option value="DELETE_ACCOUNT">Delete Account</option>
            <option value="ADD_DEVICE">Add Inventory Product</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="w-full md:w-auto">
          <DatePicker
            value={filterDate}
            onChange={(val) => { setFilterDate(val); setCurrentPage(1); }}
            placeholder="Filter by date..."
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No Activity Logs Found</h3>
            <p className="text-sm text-gray-500 mt-1">There are no logged events matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-800">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}>
                          {badge.icon} {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">
                          📍 {log.branch || 'Tagoloan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{log.userName || 'System'}</span>
                          <span className="text-[11px] text-gray-400">{log.userRole || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-4 text-xs text-gray-500 font-semibold">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ScrollText size={22} className="text-[#bd00ff]" />
                <h3 className="text-xl font-bold text-gray-900 m-0">Activity Details</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-5">
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-400">Action</span>
                  <span className="font-bold text-sm text-purple-700">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-400">Branch</span>
                  <span className="font-bold text-sm text-gray-800">📍 {selectedLog.branch || 'Tagoloan'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-400">Actor</span>
                  <span className="font-bold text-sm text-gray-800">{selectedLog.userName} ({selectedLog.userRole})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-400">Timestamp</span>
                  <span className="font-medium text-xs text-gray-600">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                <div className="p-3.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-800 border border-gray-100">
                  {selectedLog.description}
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Additional Details</label>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto font-mono max-h-48">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                      } catch (e) {
                        return selectedLog.details;
                      }
                    })()}
                  </pre>
                </div>
              )}

              <div className="mt-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
