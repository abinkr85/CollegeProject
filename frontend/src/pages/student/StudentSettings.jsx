import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Layers,
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
  uploadStudentIdCard
} from '../../api/userApi';
import Navbar from '../../components/layout/Navbar';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import IdCardBadgeWidget from '../../components/id-card/IdCardBadgeWidget';
import IdCardScannerModal from '../../components/id-card/IdCardScannerModal';

const TABS = [
  { id: 'profile', label: 'Profile Details', icon: User },
  { id: 'notifications', label: 'Notification Alerts', icon: Bell },
  { id: 'security', label: 'Security & Password', icon: ShieldCheck }
];

export default function StudentSettings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [showInitialOnboardingModal, setShowInitialOnboardingModal] = useState(false);

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
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Student ID Card State
  const [profileData, setProfileData] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  async function loadData() {
    try {
      setIsLoading(true);
      const data = await getUserSettings();
      if (data) {
        setProfileData(data.profile || null);
        setName(data.profile?.name || '');
        setEmail(data.profile?.email || '');
        const currentDept = data.profile?.department || '';
        const currentYear = data.profile?.year || '';
        setDepartment(currentDept);
        setYear(currentYear);
        setCreatedAt(data.profile?.createdAt || '');
        setEmailInstantAlerts(!!data.notifications?.emailInstantAlerts);
        setEmailDailyDigest(!!data.notifications?.emailDailyDigest);

        // Guide student on initial login if ID card is unverified
        if (data.profile?.idCardStatus !== 'VERIFIED') {
          setShowInitialOnboardingModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
      toast.error('Could not load profile settings from server.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleIdCardSuccess = async (cardPayload) => {
    const updated = await uploadStudentIdCard(cardPayload);
    setProfileData((prev) => ({
      ...prev,
      ...updated,
    }));
    if (updated.name) setName(updated.name);
    if (updated.department) setDepartment(updated.department);
    if (updated.year) setYear(updated.year);
    if (updateUser) {
      updateUser({
        ...user,
        name: updated.name || user?.name,
        studentIdNumber: updated.studentIdNumber,
        idCardStatus: updated.idCardStatus,
        idCardFrontUrl: updated.idCardFrontUrl,
        idCardBackUrl: updated.idCardBackUrl,
      });
    }
  };

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
    setIsRevokingSessions(true);
    try {
      await revokeAllSessions();
      toast.success('All other active sessions have been signed out.');
      setShowRevokeModal(false);
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
            Manage your profile, email notifications, and account password.
          </p>
        </div>

        {/* Settings Layout: Tabs + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-2.5 shadow-sm flex flex-col sm:flex-row lg:flex-col gap-1.5 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 sm:flex-initial lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-primary shrink-0'} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Summary Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <ShieldCheck size={16} className="text-secondary shrink-0" /> Student Account
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your account is linked to your college email. To change your registered email, please visit the campus administrative office.
              </p>
              <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Joined</span>
                <span className="font-semibold text-on-surface">{formattedDate}</span>
              </div>
            </div>
          </aside>

          {/* Tab Content Panels */}
          <div className="lg:col-span-8 min-w-0">
            {/* TAB 1: PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Institutional Student ID Verification Card (Single Source of Truth) */}
                <IdCardBadgeWidget
                  profile={profileData || { name, email, department, year, idCardStatus: 'UNVERIFIED' }}
                  onOpenScanner={() => setIsScannerOpen(true)}
                  onRefresh={loadData}
                />
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
                      className="px-6 h-[46px] text-sm font-semibold rounded-xl flex items-center gap-2"
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
                        className="px-6 h-[46px] text-sm font-semibold rounded-xl flex items-center gap-2"
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
                      onClick={() => setShowRevokeModal(true)}
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

      {/* Session Revocation Confirmation Modal */}
      {showRevokeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-error">
              <div className="p-2.5 bg-error/10 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <h3 id="revoke-modal-title" className="text-lg font-bold text-on-surface">
                Sign Out Other Sessions?
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to sign out of all other active sessions? Any other devices or browsers logged into your account will require you to log in again.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevokingSessions}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={isRevokingSessions}
                onClick={handleRevokeAllSessions}
                className="bg-error hover:bg-error/90 text-white font-semibold"
              >
                Sign Out Sessions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Login ID Card Verification Guidance Modal */}
      {showInitialOnboardingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5 text-primary">
              <div className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 id="onboarding-modal-title" className="text-lg font-bold text-on-surface">
                  Verify Your Institutional ID Card
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Required to access all campus features and file complaints
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 rounded-xl p-4 text-xs leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <AlertCircle size={14} /> Action Required:
              </p>
              <p>
                To maintain campus security and authenticate your student profile, please scan your physical College ID Card.
              </p>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your Roll Number, Course, Batch, and Expiry Date will be authenticated and locked to your profile.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setShowInitialOnboardingModal(false);
                  setIsScannerOpen(true);
                }}
                className="px-5 py-2.5 text-xs font-semibold"
              >
                Scan & Verify ID Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student ID Live Camera Scanner Modal */}
      <IdCardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleIdCardSuccess}
        currentStudentId={profileData?.studentIdNumber || ''}
        currentName={profileData?.name || name || ''}
        currentPhone={profileData?.phone || ''}
        currentDepartment={department || profileData?.department || ''}
        currentBatch={profileData?.batch || ''}
        currentYear={year || profileData?.year || ''}
        currentValidUpto={profileData?.idCardValidUpto || ''}
        currentEmergencyPhone={profileData?.emergencyPhone || ''}
      />
    </div>
  );
}
