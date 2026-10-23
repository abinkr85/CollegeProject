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
  ExternalLink,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Ban,
  UserCheck,
  Layers,
  Save,
  Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getAdminUsers,
  unlockUserAccount,
  deleteUserAccount,
  toggleSuperAdminStatus,
  toggleBlockUser,
  toggleStudentDeletionPermission,
  updateStaffProfile
} from '../../api/adminApi';
import MetricCard from '../../components/ui/MetricCard';
import PaginationControls from '../../components/admin/PaginationControls';
import { formatDate } from '../../utils/formatDate';
import { useSystemTimezone } from '../../context/TimezoneContext';
import { useAuth } from '../../hooks/useAuth';

const DEPARTMENTS = [
  'Harsha Institute of Technology',
  'Harsha Institute of Management Studies',
  'Harsha College of Nursing',
  'Victory College of Nursing',
  'Harsha Institute of Allied Health Sciences',
  'Harsha Institute of Physiotherapy',
  'Harsha College of Pharmacy',
  'Harsha Institute of Hospital Administration',
  'Harsha School of Law'
];

function getInitials(name = '') {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { timezone } = useSystemTimezone();
  const { user: currentUser } = useAuth();
  const isCurrentUserSuperAdmin = Boolean(currentUser?.isSuperAdmin);
  const [, startTransition] = useTransition();

  // Active Tab ('ALL' | 'STUDENT' | 'ADMIN')
  const [activeTab, setActiveTab] = useState('ALL');

  // Data & State
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalLocked: 0,
    activeStudents: 0,
    totalAdmins: 0,
    totalSuperAdmins: 0
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingSuperAdmin, setIsTogglingSuperAdmin] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [isTogglingPermission, setIsTogglingPermission] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  // Staff profile edit state in drawer
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

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

  // Selected user for detail drawer
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (selectedUser) {
      setEditEmployeeId(selectedUser.employeeId || '');
      setEditJoiningDate(selectedUser.joiningDate ? String(selectedUser.joiningDate).slice(0, 10) : '');
      setEditDepartment(selectedUser.department || '');
    }
  }, [selectedUser]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      role: tab === 'ALL' ? '' : tab,
      page: 1
    }));
  }

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

  // Handle Account Deletion (Super Admin only)
  async function handleConfirmDelete() {
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteUserAccount(userToDelete.id);
      toast.success(`Account for ${userToDelete.name} deleted successfully.`);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setUserToDelete(null);
      setMetrics(prev => ({
        ...prev,
        totalUsers: Math.max(0, (prev.totalUsers || 1) - 1),
        totalStudents: userToDelete.role === 'STUDENT' ? Math.max(0, prev.totalStudents - 1) : prev.totalStudents,
        activeStudents: (!userToDelete.isLocked && userToDelete.role === 'STUDENT') ? Math.max(0, prev.activeStudents - 1) : prev.activeStudents,
        totalLocked: userToDelete.isLocked ? Math.max(0, prev.totalLocked - 1) : prev.totalLocked,
        totalAdmins: userToDelete.role === 'ADMIN' ? Math.max(0, (prev.totalAdmins || 1) - 1) : prev.totalAdmins,
        totalSuperAdmins: (userToDelete.role === 'ADMIN' && userToDelete.isSuperAdmin) ? Math.max(0, (prev.totalSuperAdmins || 1) - 1) : prev.totalSuperAdmins
      }));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error(err.response?.data?.message || 'Failed to delete user account.');
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle Super Admin Toggle (Super Admin only for ADMIN accounts)
  async function handleToggleSuperAdmin(targetUser) {
    if (isTogglingSuperAdmin) return;
    setIsTogglingSuperAdmin(true);
    const newStatus = !targetUser.isSuperAdmin;
    try {
      await toggleSuperAdminStatus(targetUser.id, newStatus);
      toast.success(
        newStatus
          ? `${targetUser.name} is now a Super Administrator.`
          : `Super Administrator privileges revoked for ${targetUser.name}.`
      );
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, isSuperAdmin: newStatus } : u))
      );
      setMetrics(prev => ({
        ...prev,
        totalSuperAdmins: newStatus ? (prev.totalSuperAdmins || 0) + 1 : Math.max(0, (prev.totalSuperAdmins || 1) - 1)
      }));
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, isSuperAdmin: newStatus }));
      }
    } catch (err) {
      console.error('Failed to toggle Super Admin status:', err);
      toast.error(err.response?.data?.message || 'Failed to update Super Admin privileges.');
    } finally {
      setIsTogglingSuperAdmin(false);
    }
  }

  // Handle Account Block / Unblock (Super Admin only)
  async function handleToggleBlock(targetUser) {
    if (isTogglingBlock) return;
    setIsTogglingBlock(true);
    const nextStatus = !targetUser.isBlocked;
    try {
      await toggleBlockUser(targetUser.id, nextStatus);
      toast.success(
        nextStatus
          ? `Account for ${targetUser.name} has been suspended.`
          : `Account for ${targetUser.name} has been restored.`
      );
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, isBlocked: nextStatus } : u))
      );
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, isBlocked: nextStatus }));
      }
    } catch (err) {
      console.error('Failed to update blocked status:', err);
      toast.error(err.response?.data?.message || 'Failed to update account blocked status.');
    } finally {
      setIsTogglingBlock(false);
    }
  }

  // Handle Student Deletion Permission Toggle (Super Admin on Admins)
  async function handleToggleStudentDeletion(targetUser) {
    if (isTogglingPermission) return;
    setIsTogglingPermission(true);
    const nextPerm = !targetUser.canDeleteStudents;
    try {
      await toggleStudentDeletionPermission(targetUser.id, nextPerm);
      toast.success(
        nextPerm
          ? `Permission granted: ${targetUser.name} can now remove student accounts.`
          : `Permission revoked: ${targetUser.name} can no longer remove student accounts.`
      );
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, canDeleteStudents: nextPerm } : u))
      );
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, canDeleteStudents: nextPerm }));
      }
    } catch (err) {
      console.error('Failed to update student deletion permission:', err);
      toast.error(err.response?.data?.message || 'Failed to update student deletion permission.');
    } finally {
      setIsTogglingPermission(false);
    }
  }

  // Handle Staff Profile Details Update
  async function handleSaveStaffDetails(e) {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSavingStaff(true);
    try {
      const updated = await updateStaffProfile(selectedUser.id, {
        employeeId: editEmployeeId.trim() || null,
        joiningDate: editJoiningDate || null,
        department: editDepartment || null,
      });
      toast.success('Staff profile details saved successfully.');
      setUsers(prev =>
        prev.map(u => (u.id === selectedUser.id ? {
          ...u,
          employeeId: updated.employeeId,
          joiningDate: updated.joiningDate,
          department: updated.department,
        } : u))
      );
      setSelectedUser(prev => ({
        ...prev,
        employeeId: updated.employeeId,
        joiningDate: updated.joiningDate,
        department: updated.department,
      }));
    } catch (err) {
      console.error('Failed to save staff profile details:', err);
      toast.error(err.response?.data?.message || 'Failed to save staff details.');
    } finally {
      setIsSavingStaff(false);
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
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#0a1422] tracking-tight">User Directory</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Campus Accounts
            </span>
            {isCurrentUserSuperAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                <ShieldCheck size={13} className="text-amber-600" />
                Super Admin Privilege
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Search, inspect, and manage student accounts, academic departments, and security lockout status.
          </p>
        </div>
      </div>

      {/* Segmented Role Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabChange('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Users size={15} />
            <span>All Accounts</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === 'ALL' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/70 text-gray-600'
            }`}>
              {metrics.totalUsers ?? pagination.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('STUDENT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'STUDENT'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200/60'
                : 'text-gray-600 hover:text-blue-700 hover:bg-white/50'
            }`}
          >
            <GraduationCap size={15} className={activeTab === 'STUDENT' ? 'text-blue-600' : 'text-gray-400'} />
            <span>Students Directory</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === 'STUDENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-200/70 text-gray-600'
            }`}>
              {metrics.totalStudents ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('ADMIN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ADMIN'
                ? 'bg-white text-purple-700 shadow-sm border border-purple-200/60'
                : 'text-gray-600 hover:text-purple-700 hover:bg-white/50'
            }`}
          >
            <ShieldCheck size={15} className={activeTab === 'ADMIN' ? 'text-purple-600' : 'text-gray-400'} />
            <span>Administrators & Staff</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-200/70 text-gray-600'
            }`}>
              {metrics.totalAdmins ?? 0}
            </span>
          </button>
        </div>

        <p className="text-xs text-gray-500 font-medium">
          {activeTab === 'STUDENT' && 'Managing enrolled student profiles, academic departments, and passout cleanup.'}
          {activeTab === 'ADMIN' && 'Managing administrative staff privileges, role elevation, and admin removals.'}
          {activeTab === 'ALL' && 'Viewing all registered accounts across the campus directory.'}
        </p>
      </div>

      {/* Dynamic KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'STUDENT' ? (
          <>
            <MetricCard
              label="Total Enrolled Students"
              value={metrics.totalStudents || 0}
              icon={GraduationCap}
              tone="blue"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Active Student Accounts"
              value={metrics.activeStudents || 0}
              icon={CheckCircle2}
              tone="green"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Locked Out Students"
              value={metrics.totalLocked || 0}
              icon={Lock}
              tone={metrics.totalLocked > 0 ? 'red' : 'neutral'}
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Filtered Students Displayed"
              value={pagination.total || 0}
              icon={Users}
              tone="indigo"
              isLoading={isLoading && users.length === 0}
            />
          </>
        ) : activeTab === 'ADMIN' ? (
          <>
            <MetricCard
              label="Total Administrators"
              value={metrics.totalAdmins || 0}
              icon={Shield}
              tone="purple"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Super Administrators"
              value={metrics.totalSuperAdmins || 0}
              icon={ShieldCheck}
              tone="amber"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Department Staff"
              value={Math.max(0, (metrics.totalAdmins || 0) - (metrics.totalSuperAdmins || 0))}
              icon={Building2}
              tone="blue"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Filtered Staff Displayed"
              value={pagination.total || 0}
              icon={Users}
              tone="indigo"
              isLoading={isLoading && users.length === 0}
            />
          </>
        ) : (
          <>
            <MetricCard
              label="Total Registered Accounts"
              value={metrics.totalUsers || pagination.total || 0}
              icon={Users}
              tone="indigo"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Enrolled Students"
              value={metrics.totalStudents || 0}
              icon={GraduationCap}
              tone="blue"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Administrative Staff"
              value={metrics.totalAdmins || 0}
              icon={ShieldCheck}
              tone="purple"
              isLoading={isLoading && users.length === 0}
            />
            <MetricCard
              label="Locked Out Accounts"
              value={metrics.totalLocked || 0}
              icon={Lock}
              tone={metrics.totalLocked > 0 ? 'red' : 'neutral'}
              isLoading={isLoading && users.length === 0}
            />
          </>
        )}
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
              placeholder={
                activeTab === 'STUDENT'
                  ? 'Search students by name, email, or department...'
                  : activeTab === 'ADMIN'
                  ? 'Search administrators by name or email...'
                  : 'Search by student name, email, or department...'
              }
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
              className="w-full py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1422] transition-colors text-gray-700 cursor-pointer"
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
              className="w-full py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1422] transition-colors text-gray-700 cursor-pointer"
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
                <th className="py-3.5 px-4 sm:px-6">
                  {activeTab === 'STUDENT' ? 'Student' : activeTab === 'ADMIN' ? 'Staff / Administrator' : 'User'}
                </th>
                <th className="py-3.5 px-4">Department</th>
                {activeTab === 'STUDENT' && <th className="py-3.5 px-4">Academic Year</th>}
                {activeTab === 'ADMIN' && <th className="py-3.5 px-4">Staff ID & Joining</th>}
                {activeTab === 'ALL' && <th className="py-3.5 px-4">Role</th>}
                {activeTab !== 'ADMIN' && <th className="py-3.5 px-4">Complaints Filed</th>}
                {activeTab === 'ADMIN' && <th className="py-3.5 px-4">Privilege & Permissions</th>}
                <th className="py-3.5 px-4">Joined Portal</th>
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
                    {activeTab === 'STUDENT' ? (
                      <GraduationCap className="mx-auto text-gray-300 mb-2" size={32} />
                    ) : activeTab === 'ADMIN' ? (
                      <ShieldCheck className="mx-auto text-gray-300 mb-2" size={32} />
                    ) : (
                      <Users className="mx-auto text-gray-300 mb-2" size={32} />
                    )}
                    <p className="font-medium text-gray-600">
                      No {activeTab === 'STUDENT' ? 'students' : activeTab === 'ADMIN' ? 'administrators' : 'users'} found
                    </p>
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
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'STUDENT' && u.idCardStatus === 'VERIFIED' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300" title="Verified Student ID">
                                🛡️ Verified
                              </span>
                            )}
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

                    {/* Academic Year (For Students) */}
                    {activeTab === 'STUDENT' && (
                      <td className="py-4 px-4">
                        {u.year ? (
                          <span className="font-semibold text-gray-900 text-xs">{u.year}</span>
                        ) : (
                          <span className="text-xs text-amber-600 italic">Incomplete</span>
                        )}
                      </td>
                    )}

                    {/* Staff ID & Joining Date (For Admins) */}
                    {activeTab === 'ADMIN' && (
                      <td className="py-4 px-4">
                        <div className="text-xs">
                          <span className="font-mono font-semibold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                            {u.employeeId || 'ID: Not set'}
                          </span>
                          <span className="block text-[11px] text-gray-500 mt-1">
                            {u.joiningDate ? formatDate(u.joiningDate, timezone) : 'No joining date'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Role column (Only in 'ALL' tab) */}
                    {activeTab === 'ALL' && (
                      <td className="py-4 px-4">
                        {u.role === 'ADMIN' ? (
                          u.isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              <ShieldCheck size={12} className="text-amber-600" />
                              Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Admin
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Student
                          </span>
                        )}
                      </td>
                    )}

                    {/* Complaints Count (For Students and ALL) */}
                    {activeTab !== 'ADMIN' && (
                      <td className="py-4 px-4">
                        {u.role === 'STUDENT' ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleViewUserComplaints(u.email);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-all cursor-pointer"
                            title="View complaints filed by this student"
                          >
                            <FileText size={12} />
                            <span>{u.complaintsCount} Complaints</span>
                            <ExternalLink size={10} className="text-gray-400 group-hover:text-blue-500" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">N/A (Staff)</span>
                        )}
                      </td>
                    )}

                    {/* System Privilege & Delegated Permissions (For Admins) */}
                    {activeTab === 'ADMIN' && (
                      <td className="py-4 px-4 space-y-1">
                        <div>
                          {u.isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              <ShieldCheck size={11} className="text-amber-600" />
                              Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Staff Admin
                            </span>
                          )}
                        </div>
                        {u.canDeleteStudents && !u.isSuperAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <UserCheck size={10} />
                            Can Remove Students
                          </span>
                        )}
                      </td>
                    )}

                    {/* Joined Date */}
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {formatDate(u.createdAt, timezone)}
                    </td>

                    {/* Security Status */}
                    <td className="py-4 px-4">
                      {u.isBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                          <Ban size={12} />
                          Suspended / Blocked
                        </span>
                      ) : u.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
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

                    {/* Tailored Actions Column */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Student Unlock Action */}
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

                        {/* Super Admin Block / Unblock on staff/admins */}
                        {isCurrentUserSuperAdmin && u.id !== currentUser?.id && u.role === 'ADMIN' && (
                          <button
                            type="button"
                            disabled={isTogglingBlock}
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleBlock(u);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                              u.isBlocked
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            }`}
                            title={u.isBlocked ? 'Click to Unblock Account' : 'Click to Block Staff Account'}
                          >
                            <Ban size={12} className={u.isBlocked ? 'text-emerald-600' : 'text-red-600'} />
                            <span>{u.isBlocked ? 'Unblock' : 'Block'}</span>
                          </button>
                        )}

                        {/* Super Admin Student Deletion Permission Delegation on regular Admins */}
                        {isCurrentUserSuperAdmin && u.id !== currentUser?.id && u.role === 'ADMIN' && !u.isSuperAdmin && (
                          <button
                            type="button"
                            disabled={isTogglingPermission}
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleStudentDeletion(u);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                              u.canDeleteStudents
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                            title={
                              u.canDeleteStudents
                                ? 'Click to revoke permission to remove student accounts'
                                : 'Click to grant permission to remove student accounts'
                            }
                          >
                            <UserCheck size={12} className={u.canDeleteStudents ? 'text-indigo-600' : 'text-gray-400'} />
                            <span>{u.canDeleteStudents ? 'Can Remove Students' : 'Grant Removal'}</span>
                          </button>
                        )}

                        {/* Admin Role Quick Toggle (Super Admin on other admins) */}
                        {u.role === 'ADMIN' && isCurrentUserSuperAdmin && u.id !== currentUser?.id && (
                          <button
                            type="button"
                            disabled={isTogglingSuperAdmin}
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleSuperAdmin(u);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                              u.isSuperAdmin
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                            }`}
                            title={u.isSuperAdmin ? 'Click to Revoke Super Administrator' : 'Click to Grant Super Administrator'}
                          >
                            <ShieldCheck size={12} className={u.isSuperAdmin ? 'text-amber-600' : 'text-purple-600'} />
                            <span>{u.isSuperAdmin ? 'Super' : 'Set Super'}</span>
                          </button>
                        )}

                        {/* Current User Self Indicator */}
                        {u.id === currentUser?.id && (
                          <span
                            className="text-[11px] text-gray-400 font-medium px-2 py-1 select-none"
                            title="You are currently signed in as this account"
                          >
                            (You)
                          </span>
                        )}

                        {/* Delete Action: Super Admin (all except self) OR Admin with canDeleteStudents (STUDENT only) */}
                        {((isCurrentUserSuperAdmin && u.id !== currentUser?.id) ||
                          (!isCurrentUserSuperAdmin && currentUser?.canDeleteStudents && u.role === 'STUDENT')) && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setUserToDelete(u);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title={
                              u.role === 'ADMIN'
                                ? 'Permanently delete administrator account'
                                : 'Permanently delete student account (old / passout student)'
                            }
                          >
                            <Trash2 size={16} />
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
                {selectedUser.role === 'ADMIN' ? (
                  <ShieldCheck size={20} className="text-purple-600" />
                ) : (
                  <GraduationCap size={20} className="text-blue-600" />
                )}
                {selectedUser.role === 'ADMIN' ? 'Administrator Profile' : 'Student Profile'}
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
                <div
                  className={`h-14 w-14 rounded-full text-white flex items-center justify-center text-lg font-bold shadow-sm select-none ${
                    selectedUser.role === 'ADMIN' ? 'bg-purple-600' : 'bg-blue-600'
                  }`}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{selectedUser.email}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-2 ${
                      selectedUser.role === 'ADMIN'
                        ? selectedUser.isSuperAdmin
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {selectedUser.role === 'ADMIN'
                      ? selectedUser.isSuperAdmin
                        ? 'Super Administrator'
                        : 'Administrator'
                      : 'Verified Student'}
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
                      {selectedUser.role === 'ADMIN' ? 'Office / Department' : 'Academic Department'}
                    </span>
                    <span className="font-medium text-gray-900 text-right text-xs">
                      {selectedUser.department || 'Not configured'}
                    </span>
                  </div>

                  {selectedUser.role === 'STUDENT' && (
                    <>
                      <div className="p-3.5 flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2 text-xs">
                          <GraduationCap size={15} />
                          Academic Year
                        </span>
                        <span className="font-medium text-gray-900 text-xs">
                          {selectedUser.year || 'Not configured'}
                        </span>
                      </div>

                      <div className="p-3.5 flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2 text-xs">
                          <ShieldCheck size={15} />
                          Student ID / Roll No
                        </span>
                        <span className="font-mono font-bold text-gray-900 text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {selectedUser.studentIdNumber || 'Not provided'}
                        </span>
                      </div>

                      <div className="p-3.5 flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2 text-xs">
                          <Shield size={15} />
                          ID Verification
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            selectedUser.idCardStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {selectedUser.idCardStatus === 'VERIFIED' ? 'Verified Student 🛡️' : 'Unverified'}
                        </span>
                      </div>

                      {selectedUser.idCardFrontUrl && (
                        <div className="p-3.5 space-y-2 border-t border-gray-100">
                          <span className="text-gray-500 text-xs font-semibold block">
                            Scanned Physical ID Card
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={selectedUser.idCardFrontUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative aspect-[1.58/1] rounded-lg overflow-hidden border border-gray-300 shadow-sm hover:opacity-90"
                            >
                              <img
                                src={selectedUser.idCardFrontUrl}
                                alt="Front ID"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Front
                              </span>
                            </a>
                            {selectedUser.idCardBackUrl ? (
                              <a
                                href={selectedUser.idCardBackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block relative aspect-[1.58/1] rounded-lg overflow-hidden border border-gray-300 shadow-sm hover:opacity-90"
                              >
                                <img
                                  src={selectedUser.idCardBackUrl}
                                  alt="Back ID"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Back
                                </span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedUser.role === 'ADMIN' && (
                    <>
                      <div className="p-3.5 flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2 text-xs">
                          <Shield size={15} />
                          Staff Employee ID
                        </span>
                        <span className="font-mono font-semibold text-purple-900 text-xs">
                          {selectedUser.employeeId || 'Not set'}
                        </span>
                      </div>

                      <div className="p-3.5 flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2 text-xs">
                          <Clock size={15} />
                          Date of Joining
                        </span>
                        <span className="font-medium text-gray-900 text-xs">
                          {selectedUser.joiningDate ? formatDate(selectedUser.joiningDate, timezone) : 'Not recorded'}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2 text-xs">
                      <Calendar size={15} />
                      Registered On
                    </span>
                    <span className="font-medium text-gray-900 text-xs">
                      {formatDate(selectedUser.createdAt, timezone)}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2 text-xs">
                      <Shield size={15} />
                      Security Status
                    </span>
                    {selectedUser.isBlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <Ban size={12} />
                        Suspended / Blocked
                      </span>
                    ) : selectedUser.isLocked ? (
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

              {/* Staff Edit Section (for Admins when user is Super Admin or self) */}
              {selectedUser.role === 'ADMIN' && (isCurrentUserSuperAdmin || selectedUser.id === currentUser?.id) && (
                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Building2 size={16} className="text-purple-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Staff Employment Record
                    </h4>
                  </div>

                  <form onSubmit={handleSaveStaffDetails} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Employee ID Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-1049"
                        value={editEmployeeId}
                        onChange={e => setEditEmployeeId(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        value={editJoiningDate}
                        onChange={e => setEditJoiningDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Department / Office
                      </label>
                      <select
                        value={editDepartment}
                        onChange={e => setEditDepartment(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingStaff}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingStaff ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Staff Details
                    </button>
                  </form>
                </div>
              )}

              {/* Student Complaints Summary (Only shown for students) */}
              {selectedUser.role === 'STUDENT' && (
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
              )}

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

              {/* Super Admin Block / Unblock Staff Account */}
              {selectedUser.role === 'ADMIN' && isCurrentUserSuperAdmin && selectedUser.id !== currentUser?.id && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <Ban className={`${selectedUser.isBlocked ? 'text-emerald-700' : 'text-red-600'} shrink-0 mt-0.5`} size={18} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {selectedUser.isBlocked ? 'Staff Account is Suspended' : 'Suspend Staff Account'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {selectedUser.isBlocked
                          ? 'This staff account is currently blocked from signing into the portal. You can unblock access anytime.'
                          : 'Suspend this staff account to immediately revoke all active sessions and block further portal access.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isTogglingBlock}
                    onClick={() => handleToggleBlock(selectedUser)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                      selectedUser.isBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isTogglingBlock ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    {selectedUser.isBlocked ? 'Unblock Account Access' : 'Block / Suspend Staff Account'}
                  </button>
                </div>
              )}

              {/* Super Admin Student Deletion Permission Delegation */}
              {selectedUser.role === 'ADMIN' && isCurrentUserSuperAdmin && selectedUser.id !== currentUser?.id && !selectedUser.isSuperAdmin && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <UserCheck className="text-indigo-700 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-indigo-950">Student Removal Permission</p>
                      <p className="text-xs text-indigo-800 mt-0.5">
                        {selectedUser.canDeleteStudents
                          ? 'This administrator has been granted permission to remove old or passout student accounts.'
                          : 'Grant permission to allow this administrator to remove old passout student accounts from the directory.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isTogglingPermission}
                    onClick={() => handleToggleStudentDeletion(selectedUser)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                      selectedUser.canDeleteStudents
                        ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isTogglingPermission ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    {selectedUser.canDeleteStudents ? 'Revoke Student Removal Permission' : 'Grant Student Removal Permission'}
                  </button>
                </div>
              )}

              {/* Super Admin Privilege Management for Admins */}
              {selectedUser.role === 'ADMIN' && isCurrentUserSuperAdmin && selectedUser.id !== currentUser?.id && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="text-amber-700 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-amber-950">Super Administrator Privilege</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {selectedUser.isSuperAdmin
                          ? 'This user is a Super Administrator with rights to delete accounts and manage administrative access.'
                          : 'Grant Super Administrator rights to allow this administrator to delete student/admin accounts and assign roles.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isTogglingSuperAdmin}
                    onClick={() => handleToggleSuperAdmin(selectedUser)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                      selectedUser.isSuperAdmin
                        ? 'bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400'
                        : 'bg-[#0a1422] hover:bg-gray-800 text-white'
                    }`}
                  >
                    {isTogglingSuperAdmin ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    {selectedUser.isSuperAdmin ? 'Revoke Super Administrator Role' : 'Grant Super Administrator Privileges'}
                  </button>
                </div>
              )}

              {/* Danger Zone: Account Deletion (Super Admin or Delegated Admin for Students) */}
              {((isCurrentUserSuperAdmin && selectedUser.id !== currentUser?.id) ||
                (!isCurrentUserSuperAdmin && currentUser?.canDeleteStudents && selectedUser.role === 'STUDENT')) && (
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-red-950">Danger Zone: Permanent Deletion</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Permanently remove this {selectedUser.role === 'ADMIN' ? 'staff / administrator' : 'student (e.g. passout)'} account from the campus portal.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(selectedUser)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Permanently Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Account Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Account Deletion</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Only Super Administrators can perform this action. This deletion cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-semibold text-gray-900">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-gray-900">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Role:</span>
                <span className="font-semibold text-purple-700">
                  {userToDelete.isSuperAdmin ? 'Super Administrator' : userToDelete.role === 'ADMIN' ? 'Administrator' : 'Student'}
                </span>
              </div>
              {userToDelete.complaintsCount > 0 && (
                <div className="flex justify-between text-amber-700 pt-1 border-t border-gray-200">
                  <span>Linked Complaints:</span>
                  <span className="font-semibold">{userToDelete.complaintsCount} complaint(s) filed</span>
                </div>
              )}
            </div>

            <p className="text-xs text-red-600 font-medium leading-relaxed">
              Are you sure you want to permanently delete this account? Old passout students and administrators will lose campus portal access immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Yes, Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
