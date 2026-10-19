// src/pages/admin/UserManagement.jsx
// User & Student Directory management page for campus administrators.

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Lock,
  Unlock,
  Mail,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  ChevronRight,
  GraduationCap,
  Calendar,
  Shield,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getAdminUsers, unlockUserAccount } from '../../api/adminApi';
import MetricCard from '../../components/ui/MetricCard';
import PaginationControls from '../../components/admin/PaginationControls';
import { formatDate } from '../../utils/formatDate';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Mechanical Engineering',
  'Electrical & Electronics',
  'Civil Engineering',
  'Electronics & Communication',
  'Information Technology',
  'Biotechnology',
  'Business Administration',
  'Architecture & Design',
  'General Science & Humanities'
];

function getInitials(name = '') {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  // Data & State
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ totalStudents: 0, totalLocked: 0, activeStudents: 0 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    department: '',
    status: 'all',
    page: 1,
    limit: 10
  });

  // Selected student for detail drawer
  const [selectedUser, setSelectedUser] = useState(null);

  // Debounced search input
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 }));
      });
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch users from API
  const loadUsers = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);

    getAdminUsers(filters)
      .then(res => {
        if (!cancelled) {
          setUsers(res.data || []);
          if (res.metrics) setMetrics(res.metrics);
          if (res.pagination) {
            setPagination({
              total: res.pagination.total || 0,
              totalPages: res.pagination.totalPages || 1,
              page: res.pagination.page || 1,
              limit: res.pagination.limit || 10
            });
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load users:', err);
        toast.error('Could not load user directory.');
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Account Unlock
  async function handleUnlock(user) {
    if (isUnlocking) return;
    setIsUnlocking(user.id);
    try {
      await unlockUserAccount(user.id);
      toast.success(`Account for ${user.name} unlocked successfully.`);
      // Update local item
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, isLocked: false, lockedUntil: null, loginFailedAttempts: 0 } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser(prev => ({ ...prev, isLocked: false, lockedUntil: null, loginFailedAttempts: 0 }));
      }
      setMetrics(prev => ({
        ...prev,
        totalLocked: Math.max(0, prev.totalLocked - 1),
        activeStudents: prev.activeStudents + 1
      }));
    } catch (err) {
      console.error('Failed to unlock user:', err);
      toast.error(err.response?.data?.message || 'Failed to unlock user account.');
    } finally {
      setIsUnlocking(null);
    }
  }

  function handleFilterChange(field, value) {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  }

  function handlePageChange(newPage) {
    setFilters(prev => ({ ...prev, page: newPage }));
  }

  function handleViewUserComplaints(email) {
    navigate(`/admin/complaints?search=${encodeURIComponent(email)}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#0a1422] tracking-tight">User Directory</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Campus Accounts
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Search, inspect, and manage student accounts, academic departments, and security lockout status.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Registered Students"
          value={metrics.totalStudents || 0}
          icon={GraduationCap}
          tone="blue"
          isLoading={isLoading && users.length === 0}
        />
        <MetricCard
          label="Active Accounts"
          value={metrics.activeStudents || 0}
          icon={CheckCircle2}
          tone="green"
          isLoading={isLoading && users.length === 0}
        />
        <MetricCard
          label="Locked Out Accounts"
          value={metrics.totalLocked || 0}
          icon={Lock}
          tone={metrics.totalLocked > 0 ? 'red' : 'neutral'}
          isLoading={isLoading && users.length === 0}
        />
        <MetricCard
          label="Filtered Users Displayed"
          value={pagination.total || 0}
          icon={Users}
          tone="indigo"
          isLoading={isLoading && users.length === 0}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Live Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by student name, email, or department..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1422] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filters.department}
              onChange={e => handleFilterChange('department', e.target.value)}
              className="w-full py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1422] transition-colors text-gray-700"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1422] transition-colors text-gray-700"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="locked">Locked Out Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Student / User</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Complaints Filed</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="font-medium text-gray-600">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  >
                    {/* User Name & Email */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs select-none ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Mail size={12} className="text-gray-400" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-4 px-4">
                      {u.department ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-800">
                          <Building2 size={12} className="text-gray-500" />
                          <span className="truncate max-w-[160px]">{u.department}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'Admin' : 'Student'}
                      </span>
                    </td>

                    {/* Complaints Count */}
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleViewUserComplaints(u.email);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-all cursor-pointer"
                        title="View complaints filed by this user"
                      >
                        <FileText size={12} />
                        <span>{u.complaintsCount} Complaints</span>
                        <ExternalLink size={10} className="text-gray-400 group-hover:text-blue-500" />
                      </button>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {formatDate(u.createdAt, 'MMM d, yyyy')}
                    </td>

                    {/* Security Status */}
                    <td className="py-4 px-4">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <Lock size={12} />
                          Locked Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.isLocked && (
                          <button
                            type="button"
                            disabled={isUnlocking === u.id}
                            onClick={e => {
                              e.stopPropagation();
                              handleUnlock(u);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Unlock account immediately"
                          >
                            {isUnlocking === u.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Unlock size={12} />
                            )}
                            Unlock
                          </button>
                        )}
                        <span className="text-gray-400 group-hover:text-blue-600 transition-colors">
                          <ChevronRight size={18} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-gray-200 p-4">
          <PaginationControls
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.total}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Selected User Slide-Over Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Student Profile
              </h2>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-sm select-none">
                  {getInitials(selectedUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{selectedUser.email}</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-2 ${
                      selectedUser.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {selectedUser.role === 'ADMIN' ? 'Administrator' : 'Verified Student'}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Account Details</h4>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2 text-xs">
                      <Building2 size={15} />
                      Academic Department
                    </span>
                    <span className="font-medium text-gray-900 text-right text-xs">
                      {selectedUser.department || 'Not configured'}
                    </span>
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2 text-xs">
                      <Calendar size={15} />
                      Registered On
                    </span>
                    <span className="font-medium text-gray-900 text-xs">
                      {formatDate(selectedUser.createdAt, 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2 text-xs">
                      <Shield size={15} />
                      Security Status
                    </span>
                    {selectedUser.isLocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <Lock size={12} />
                        Locked ({selectedUser.loginFailedAttempts} failed tries)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 size={12} />
                        Normal (Active)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Complaints Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Complaint History</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-center">
                    <p className="text-lg font-bold text-red-700">
                      {selectedUser.complaintsSummary?.open || 0}
                    </p>
                    <p className="text-[11px] text-red-600 font-medium">Open</p>
                  </div>
                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-center">
                    <p className="text-lg font-bold text-amber-700">
                      {selectedUser.complaintsSummary?.inProgress || 0}
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium">In Progress</p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      {selectedUser.complaintsSummary?.resolved || 0}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">Resolved</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewUserComplaints(selectedUser.email)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileText size={14} />
                  <span>View All Complaints by {selectedUser.name}</span>
                  <ExternalLink size={12} />
                </button>
              </div>

              {/* Unlock Action if Locked */}
              {selectedUser.isLocked && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Account is Locked Out</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        This user exceeded maximum failed login attempts. You can unlock their access now.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isUnlocking === selectedUser.id}
                    onClick={() => handleUnlock(selectedUser)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUnlocking === selectedUser.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Unlock size={14} />
                    )}
                    Unlock Account Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
