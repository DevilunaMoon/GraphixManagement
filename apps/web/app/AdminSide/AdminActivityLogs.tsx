"use client";

import { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Building2, 
  ShieldAlert, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  X,
  Lock,
  ArrowRight,
  Sparkles,
  Info
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
      case 'CREATE_FAQ':
      case 'ADD_DISCOUNT':
        return {
          icon: <Plus size={13} />,
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      case 'UPDATE_BRANCH':
      case 'EDIT_ACCOUNT':
      case 'UPDATE_ACCOUNT':
      case 'UPDATE_FAQ':
      case 'UPDATE_DEVICE':
      case 'TRANSFER_INVENTORY':
      case 'ADJUST_INVENTORY':
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
      case 'DELETE_FAQ':
      case 'DELETE_DEVICE':
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
            <option value="EDIT_ACCOUNT">Edit Staff Account</option>
            <option value="SUSPEND_ACCOUNT">Suspend Account</option>
            <option value="LIFT_SUSPENSION">Reactivate Account</option>
            <option value="DELETE_ACCOUNT">Delete Account</option>
            <option value="ADD_DEVICE">Add Inventory Product</option>
            <option value="CREATE_FAQ">Create FAQ</option>
            <option value="UPDATE_FAQ">Update FAQ</option>
            <option value="DELETE_FAQ">Delete FAQ</option>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg md:max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#bd00ff] flex items-center justify-center shrink-0">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 m-0">Activity Details</h3>
                  <span className="text-[11px] font-medium text-gray-400">System audit log record</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto p-6 flex flex-col gap-4.5">
              
              {/* Audit Summary Card */}
              <div className="bg-purple-50/50 border border-purple-100/80 p-4 rounded-2xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Action</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getActionBadge(selectedLog.action).bg}`}>
                    {getActionBadge(selectedLog.action).icon} {selectedLog.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Branch</span>
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    <Building2 size={13} className="text-[#bd00ff]" /> {selectedLog.branch || 'Tagoloan'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Actor</span>
                  <span className="font-bold text-xs text-gray-800">
                    {selectedLog.userName || 'System'} <span className="text-purple-700 font-extrabold text-[10px] bg-purple-100/80 px-1.5 py-0.5 rounded">({selectedLog.userRole || 'SUPER_ADMIN'})</span>
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Timestamp</span>
                  <span className="font-semibold text-xs text-gray-600 flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    {new Date(selectedLog.createdAt).toLocaleString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>

              {/* Description Card */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</span>
                <div className="p-3.5 bg-gray-50 rounded-xl text-sm font-semibold text-gray-900 border border-gray-200/70 leading-relaxed">
                  {selectedLog.description}
                </div>
              </div>

              {/* Structured Additional Details / Changes Made */}
              <StructuredLogDetails detailsStr={selectedLog.details} />

            </div>

            {/* Sticky Footer */}
            <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function StructuredLogDetails({ detailsStr }: { detailsStr?: string | null }) {
  if (!detailsStr || !detailsStr.trim()) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(detailsStr);
  } catch {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Additional Details</span>
        <div className="p-3.5 bg-gray-50 rounded-xl text-xs font-medium text-gray-800 border border-gray-200/70">
          {detailsStr}
        </div>
      </div>
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Additional Details</span>
        <div className="p-3.5 bg-gray-50 rounded-xl text-xs font-medium text-gray-800 border border-gray-200/70">
          {String(parsed)}
        </div>
      </div>
    );
  }

  const SENSITIVE_KEYS = new Set([
    'password', 'hash', 'salt', 'token', 'secret', 'apikey', 'key', 'auth', 'pin', 'cvv',
    'gcashname', 'gcashnumber', 'gcashqrcode', 'gcash', 'qrcode', 'qr'
  ]);

  const IGNORED_KEYS = new Set([
    'id', '_id', 'userid', 'branchid', 'deviceid', 'faqid', 'purchaseid', 'createdat', 'updatedat'
  ]);

  const formatKeyName = (key: string): string => {
    const keyLower = key.toLowerCase();
    if (keyLower === 'gcashname' || keyLower === 'gcashnumber' || keyLower === 'gcashqrcode') {
      return 'GCash Account Information';
    }
    const mapping: Record<string, string> = {
      name: 'Name',
      branch: 'Branch',
      branchname: 'Branch Name',
      address: 'Address',
      phone: 'Phone Number',
      email: 'Email Address',
      status: 'Status',
      role: 'Role',
      price: 'Price',
      originalprice: 'Original Price',
      discountedprice: 'Discounted Price',
      discountpercentage: 'Discount (%)',
      stock: 'Stock Quantity',
      previousstock: 'Previous Stock',
      newstock: 'New Stock',
      adjustment: 'Stock Adjustment',
      quantity: 'Quantity',
      reason: 'Reason',
      frombranch: 'From Branch',
      tobranch: 'To Branch',
      devicename: 'Product Name',
      imei: 'IMEI',
      serialnumber: 'Serial Number',
      question: 'Question',
      answer: 'Answer',
      isactive: 'Status',
      category: 'Category',
      storage: 'Storage',
      color: 'Color',
      rating: 'Rating',
      comment: 'Comment',
      suspendeduntil: 'Suspended Until'
    };
    if (mapping[keyLower]) return mapping[keyLower];

    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  const formatValue = (key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') {
      if (key.toLowerCase().includes('active')) return val ? 'Active' : 'Inactive';
      return val ? 'Yes' : 'No';
    }
    if (typeof val === 'number') {
      const k = key.toLowerCase();
      if (k.includes('price') || k.includes('amount') || k.includes('cost') || k.includes('fee')) {
        return `₱${val.toLocaleString()}`;
      }
      if (k.includes('percent') || k.includes('discount')) {
        return `${val}%`;
      }
      return val.toLocaleString();
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  const prevObj = parsed.previous || parsed.before || parsed.old;
  const nextObj = parsed.updated || parsed.after || parsed.new || parsed.current;

  // Case 1: Diff comparison (previous vs updated)
  if (prevObj && nextObj && typeof prevObj === 'object' && typeof nextObj === 'object') {
    const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]));
    const changes: Array<{ field: string; previous: string; updated: string; isSensitive?: boolean }> = [];
    let gcashChanged = false;
    let passwordChanged = false;

    for (const key of allKeys) {
      const keyLower = key.toLowerCase();
      if (IGNORED_KEYS.has(keyLower)) continue;

      const prevVal = prevObj[key];
      const nextVal = nextObj[key];

      const isDifferent = String(prevVal ?? '').trim() !== String(nextVal ?? '').trim();
      if (!isDifferent) continue;

      if (keyLower.startsWith('gcash')) {
        gcashChanged = true;
        continue;
      }
      if (keyLower.includes('password') || keyLower.includes('token') || keyLower.includes('secret')) {
        passwordChanged = true;
        continue;
      }

      changes.push({
        field: formatKeyName(key),
        previous: formatValue(key, prevVal),
        updated: formatValue(key, nextVal)
      });
    }

    if (gcashChanged) {
      changes.push({
        field: 'GCash Account Information',
        previous: '••••••••',
        updated: 'Updated',
        isSensitive: true
      });
    }

    if (passwordChanged) {
      changes.push({
        field: 'Password Credentials',
        previous: '••••••••',
        updated: 'Reset / Updated',
        isSensitive: true
      });
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Changes Made</span>
          {changes.length > 0 && (
            <span className="text-[11px] font-semibold text-[#bd00ff] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              {changes.length} {changes.length === 1 ? 'field modified' : 'fields modified'}
            </span>
          )}
        </div>

        {changes.length === 0 ? (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs font-medium text-gray-500 flex items-center gap-2">
            <Info size={14} className="text-gray-400" />
            <span>No attribute values were modified.</span>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3.5 w-1/3">Field</th>
                  <th className="py-2.5 px-3.5 w-1/3">Previous</th>
                  <th className="py-2.5 px-3.5 w-1/3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {changes.map((c, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-gray-900 align-top">
                      {c.field}
                    </td>
                    <td className="py-3 px-3.5 text-gray-600 align-top break-words">
                      {c.isSensitive ? (
                        <span className="inline-flex items-center gap-1 text-gray-400 font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                          <Lock size={10} /> ••••••••
                        </span>
                      ) : (
                        <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 inline-block max-w-full break-words">
                          {c.previous}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-gray-900 font-semibold align-top break-words">
                      {c.isSensitive ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-bold text-[11px] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          Updated
                        </span>
                      ) : (
                        <span className="text-purple-950 font-bold bg-purple-50/90 px-2 py-0.5 rounded border border-purple-100 inline-block max-w-full break-words">
                          {c.updated}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Case 2: Key-value attributes (e.g. creation details, restock details, discount info)
  const entries: Array<{ label: string; value: string; isSensitive?: boolean }> = [];
  let gcashPresent = false;

  for (const [key, val] of Object.entries(parsed)) {
    const keyLower = key.toLowerCase();
    if (IGNORED_KEYS.has(keyLower)) continue;

    if (keyLower.startsWith('gcash')) {
      gcashPresent = true;
      continue;
    }
    if (SENSITIVE_KEYS.has(keyLower)) {
      continue;
    }

    entries.push({
      label: formatKeyName(key),
      value: formatValue(key, val)
    });
  }

  if (gcashPresent) {
    entries.push({
      label: 'GCash Account Information',
      value: 'Configured (Protected)',
      isSensitive: true
    });
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Additional Details</span>
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-100">
        {entries.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5 px-4 hover:bg-purple-50/20 text-xs">
            <span className="font-bold text-gray-700">{item.label}</span>
            <span className={`font-semibold max-w-[60%] text-right truncate ${item.isSensitive ? 'text-purple-700 flex items-center gap-1 font-bold' : 'text-gray-900'}`}>
              {item.isSensitive && <Lock size={11} />}
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

