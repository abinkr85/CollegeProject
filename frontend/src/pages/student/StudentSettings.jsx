import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';
import { changePassword } from '../../api/authApi';
import {
  getUserSettings,
  revokeAllSessions,
  updateUserNotifications,
  updateUserProfile
} from '../../api/userApi';
import Navbar from '../../components/layout/Navbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies / MBA',
  'Applied Sciences & Humanities',
  'Architecture & Design',
  'Other / General'
];

const TABS = [
  { id: 'profile', label: 'Profile Details', icon: User },
  { id: 'notifications', label: 'Notification Alerts', icon: Bell },
  { id: 'security', label: 'Security & Password', icon: ShieldCheck }
];

export default function StudentSettings() {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification Preferences State
  const [emailInstantAlerts, setEmailInstantAlerts] = useState(true);
  const [emailDailyDigest, setEmailDailyDigest] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Password / Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getUserSettings();
        if (active && data) {
          setName(data.profile?.name || '');
          setEmail(data.profile?.email || '');
          setDepartment(data.profile?.department || '');
          setCreatedAt(data.profile?.createdAt || '');
          setEmailInstantAlerts(!!data.notifications?.emailInstantAlerts);
          setEmailDailyDigest(!!data.notifications?.emailDailyDigest);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
        toast.error('Could not load profile settings from server.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        department: department || null
      });
      setName(updated.name);
      setDepartment(updated.department);
      updateUser?.({ name: updated.name });
      toast.success('Profile details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveNotifications(e) {
    e.preventDefault();
    setIsSavingNotifications(true);
    try {
      const updated = await updateUserNotifications({
        emailInstantAlerts,
        emailDailyDigest
      });
      setEmailInstantAlerts(updated.emailInstantAlerts);
      setEmailDailyDigest(updated.emailDailyDigest);
      toast.success('Notification preferences saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update notifications.');
    } finally {
      setIsSavingNotifications(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Password must include uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      toast.success('Password updated successfully! Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeAllSessions() {
    if (!window.confirm('Are you sure you want to sign out of all other sessions?')) return;

    setIsRevokingSessions(true);
    try {
      await revokeAllSessions();
      toast.success('All other active sessions have been signed out.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign out other sessions.');
    } finally {
      setIsRevokingSessions(false);
    }
  }

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  if (isLoading) {
    return <Spinner fullPage />;
  }

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      <Navbar />

      <main className="flex-grow w-full px-gutter py-8 max-w-container-max mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display-lg text-display-lg text-primary font-bold">
            Account Settings
          </h1>
          <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">
            Manage your personal profile details, notification preferences, and account security.
          </p>
        </div>

        {/* Settings Layout: Tabs + Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-1 space-y-2">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 shadow-sm space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-primary'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Summary Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <ShieldCheck size={16} /> Student Account
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your campus identity is tied to your institutional email. For security, official email updates must be requested through campus administration.
              </p>
              <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Joined</span>
                <span className="font-semibold text-on-surface">{formattedDate}</span>
              </div>
            </div>
          </aside>

          {/* Tab Content Panels */}
          <div className="md:col-span-3">
            {/* TAB 1: PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="border-b border-outline-variant/60 pb-5 mb-6">
                  <h2 className="text-xl font-bold text-primary">Student Profile</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Update your display name and academic department.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      id="name"
                      label="Full Name"
                      type="text"
                      placeholder="Your Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon={User}
                      required
                    />

                    <div>
                      <label htmlFor="email" className="label-base flex items-center justify-between">
                        <span>Institutional Email</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 lowercase bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> verified
                        </span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                          <Mail size={18} />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="input-base !pl-10 bg-surface-container-low text-on-surface-variant cursor-not-allowed opacity-80"
                        />
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1.5">
                        Verified student email address (used for secure login and 2FA).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="department" className="label-base">
                      Academic Department / Program
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 z-10">
                        <Building2 size={18} />
                      </div>
                      <select
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="select-base !pl-10"
                      >
                        <option value="">Select your academic department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1.5">
                      Specifying your department helps route campus issues more accurately.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/60 flex justify-end">
                    <Button
                      type="submit"
                      loading={isSavingProfile}
                      className="px-6 h-11 text-sm font-semibold rounded-lg flex items-center gap-2"
                    >
                      <Save size={16} /> Save Profile Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="border-b border-outline-variant/60 pb-5 mb-6">
                  <h2 className="text-xl font-bold text-primary">Notification Preferences</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Control how and when you receive automated email updates about your complaints.
                  </p>
                </div>

                <form onSubmit={handleSaveNotifications} className="space-y-6">
                  <div className="space-y-4">
                    {/* Instant Alert Switch */}
                    <div className="flex items-start justify-between p-4 rounded-xl border border-outline-variant/70 hover:bg-surface-container-low transition-colors">
                      <div className="space-y-1 pr-4">
                        <p className="text-sm font-semibold text-primary">
                          Instant Complaint Status Alerts
                        </p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Receive an immediate email whenever campus administrators change the status, assign priority, or post an update to your filed complaints.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={emailInstantAlerts}
                          onChange={(e) => setEmailInstantAlerts(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Daily Digest Switch */}
                    <div className="flex items-start justify-between p-4 rounded-xl border border-outline-variant/70 hover:bg-surface-container-low transition-colors">
                      <div className="space-y-1 pr-4">
                        <p className="text-sm font-semibold text-primary">
                          Daily Activity Digest
                        </p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Receive a consolidated summary email each evening outlining complaint progress, campus announcements, and resolution updates.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={emailDailyDigest}
                          onChange={(e) => setEmailDailyDigest(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/60 flex justify-end">
                    <Button
                      type="submit"
                      loading={isSavingNotifications}
                      className="px-6 h-11 text-sm font-semibold rounded-lg flex items-center gap-2"
                    >
                      <Save size={16} /> Save Notification Preferences
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="border-b border-outline-variant/60 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-primary">Change Password</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Choose a strong, unique password to keep your student account secure.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <Input
                      id="currentPassword"
                      label="Current Password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter current password"
                      icon={Lock}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        id="newPassword"
                        label="New Password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        icon={Lock}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />

                      <Input
                        id="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repeat new password"
                        icon={Lock}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-lg space-y-1">
                      <p className="font-semibold text-on-surface">Password requirements:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-on-surface-variant">
                        <li>Minimum 8 characters</li>
                        <li>Include uppercase, lowercase, and at least one number</li>
                      </ul>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        loading={isChangingPassword}
                        className="px-6 h-11 text-sm font-semibold rounded-lg flex items-center gap-2"
                      >
                        <Lock size={16} /> Update Password
                      </Button>
                    </div>
                  </form>
                </div>

                {/* 2FA Protection Status Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-primary">Two-Factor Authentication (Email OTP)</h3>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Your account is automatically protected with email two-factor authentication. When logging in from an unfamiliar device, a one-time 6-digit verification code will be sent to your registered email.
                      </p>
                      <span className="inline-block mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        ● Protected & Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Sessions Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-primary">Active Sessions</h3>
                      <p className="text-xs text-on-surface-variant max-w-[500px] leading-relaxed">
                        If you signed in on a shared campus lab computer or library workstation and forgot to sign out, you can invalidate all existing active sessions immediately.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      loading={isRevokingSessions}
                      onClick={handleRevokeAllSessions}
                      className="text-xs font-semibold text-error hover:bg-error/10 border-error/30 flex items-center gap-1.5"
                    >
                      <LogOut size={15} /> Sign out of all other sessions
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
