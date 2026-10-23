import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import ComplaintList from '../../components/complaint/ComplaintList';
import Spinner from '../../components/ui/Spinner';
import { useMyComplaints } from '../../hooks/useComplaints';
import { useAuth } from '../../hooks/useAuth';
import { Plus, FolderOpen, Clock, CheckCircle2, ArrowRight, Inbox } from 'lucide-react';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Queries for metrics and recent complaints list
  const recentQuery = useMyComplaints({ page: 1, limit: 6 });
  const resolvedQuery = useMyComplaints({ status: 'resolved', page: 1, limit: 1 });

  if (recentQuery.isLoading || resolvedQuery.isLoading) {
    return <Spinner fullPage />;
  }

  const complaints = recentQuery.data?.complaints || [];
  const total = recentQuery.data?.pagination?.total ?? complaints.length;
  const resolved = resolvedQuery.data?.pagination?.total ?? 0;
  const pending = Math.max(total - resolved, 0);

  // Deriving display name
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen flex flex-col antialiased">
      <Navbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-margin-desktop space-y-section-gap">
        {/* Welcome and quick action banner */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-primary to-primary/95 text-white rounded-2xl p-8 shadow-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <p className="font-label-md text-label-md text-white uppercase tracking-widest font-semibold">
              Student Dashboard
            </p>
            <h1 className="font-display-lg text-display-lg leading-tight font-bold">
              Welcome back, {displayName}
            </h1>
            <p className="font-body-lg text-body-lg text-secondary-fixed-dim/90 max-w-xl">
              Track your complaints and status updates in one place.
            </p>
          </div>
          <button
            onClick={() => navigate('/submit')}
            className="relative z-10 bg-secondary text-white hover:bg-secondary-container hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 font-semibold rounded-xl px-6 py-3.5 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm"
          >
            <Plus size={18} />
            File New Complaint
          </button>
        </header>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter" aria-label="Complaints summary statistics">
          {/* Card: Total */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-outline transition-all duration-300 group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="font-body-md text-body-md text-on-surface-variant font-medium block">
                  Total Filed
                </span>
                <span className="text-[11px] text-outline font-semibold uppercase tracking-wider block">
                  Total complaints submitted by you.
                </span>
              </div>
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <FolderOpen size={22} />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="font-display-lg text-display-lg text-primary leading-none font-bold">
                {total}
              </h2>
            </div>
          </div>

          {/* Card: Pending */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-outline transition-all duration-300 group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="font-body-md text-body-md text-on-surface-variant font-medium block">
                  In Progress
                </span>
                <span className="text-[11px] text-outline font-semibold uppercase tracking-wider block">
                  Complaints under review or being worked on.
                </span>
              </div>
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-error-container text-on-error-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <Clock size={22} />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="font-display-lg text-display-lg text-primary leading-none font-bold">
                {pending}
              </h2>
            </div>
          </div>

          {/* Card: Resolved */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-outline transition-all duration-300 group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="font-body-md text-body-md text-on-surface-variant font-medium block">
                  Resolved
                </span>
                <span className="text-[11px] text-outline font-semibold uppercase tracking-wider block">
                  Complaints marked as solved.
                </span>
              </div>
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="font-display-lg text-display-lg text-primary leading-none font-bold">
                {resolved}
              </h2>
            </div>
          </div>
        </section>

        {/* Recent Complaints Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Recent Complaint Updates</h2>
            {complaints.length > 0 && (
              <button
                onClick={() => navigate('/history')}
                className="text-secondary font-label-md text-label-md font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                View History <ArrowRight size={16} />
              </button>
            )}
          </div>

          {complaints.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-[48px] md:p-[80px] flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-surface-container mb-6 flex items-center justify-center text-outline">
                <Inbox size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-2 font-bold">
                No complaints yet.
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto mb-6">
                Facing an issue on campus? Click below to file your first complaint.
              </p>
              <button
                onClick={() => navigate('/submit')}
                className="bg-transparent border border-outline text-primary hover:bg-surface-container-low font-semibold rounded-xl px-6 py-3 transition-colors duration-200 cursor-pointer text-sm"
              >
                File New Complaint
              </button>
            </div>
          ) : (
            <ComplaintList complaints={complaints} pagination={recentQuery.data?.pagination} isLoading={false} />
          )}
        </section>
      </main>
    </div>
  );
}
