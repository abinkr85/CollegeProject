import { useState } from 'react';
import Modal from '../ui/Modal';
import PriorityBadge from '../ui/PriorityBadge';
import StatusBadge from '../ui/StatusBadge';
import ActivityTimeline from './ActivityTimeline';
import { getComplaintById, submitFollowUp } from '../../api/complaintApi';
import { useSystemTimezone } from '../../context/TimezoneContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import {
  Sparkles,
  MessageSquare,
  Eye,
  BookOpen,
  ChevronRight,
  Info,
  Hourglass,
  CheckCircle2,
  ChevronsUp,
  Minus,
  ChevronDown,
  Copy,
  Check,
  CheckCheck,
  Wrench,
  Clock,
  FileText,
  Building2,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Send
} from 'lucide-react';

/**
 * Visual 4-step progress stepper tailored for student clarity.
 */
function StudentLifecycleStepper({ status, department }) {
  const normStatus = (status || 'OPEN').toUpperCase();

  const getStepIndex = (s) => {
    if (s === 'RESOLVED') return 3;
    if (s === 'IN_PROGRESS') return 2;
    return 1;
  };

  const currentIndex = getStepIndex(normStatus);

  const steps = [
    { id: 0, label: 'Submitted', desc: 'Ticket logged', icon: FileText },
    { id: 1, label: 'Under Review', desc: 'Admin triage', icon: Clock },
    { id: 2, label: 'In Progress', desc: department ? `${department} team` : 'Action assigned', icon: Wrench },
    { id: 3, label: 'Resolved', desc: 'Fix verified', icon: CheckCircle2 }
  ];

  const progressPercents = [0, 33.33, 66.67, 100];
  const isResolved = normStatus === 'RESOLVED';

  const statusExplanations = {
    OPEN: 'Your complaint has been submitted and is currently queued for administrator triage and assignment.',
    IN_PROGRESS: department
      ? `Your complaint is actively being addressed by the ${department} department.`
      : 'Your complaint is being handled by the assigned campus department.',
    RESOLVED: 'This complaint has been addressed and marked as resolved. You can submit a follow-up below if anything remains unresolved.'
  };

  return (
    <section aria-label="Complaint Progress Tracker" className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Resolution Lifecycle
        </span>
        <span className="text-xs font-semibold text-gray-700">
          Stage {currentIndex + 1} of 4
        </span>
      </div>

      <div className="relative">
        {/* Background track line & active progress fill */}
        <div className="absolute top-4 left-10 right-10 sm:left-12 sm:right-12 h-1 -translate-y-1/2 z-0">
          <div className="w-full h-full bg-gray-100 rounded-full relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isResolved ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercents[currentIndex]}%` }}
            />
          </div>
        </div>

        {/* Step nodes */}
        <div className="relative z-10 flex justify-between items-start">
          {steps.map((step) => {
            const isCompleted = step.id < currentIndex || (step.id === 3 && currentIndex === 3);
            const isCurrent = step.id === currentIndex && currentIndex < 3;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center w-20 sm:w-24">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                </div>
                <span
                  className={`mt-2 text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'text-emerald-700'
                      : isCurrent
                      ? 'text-blue-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanatory banner */}
      <div
        className={`mt-4 rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2.5 ${
          isResolved
            ? 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-800'
            : 'bg-blue-50/60 border border-blue-200/60 text-blue-800'
        }`}
      >
        <Info size={16} className="shrink-0 mt-0.5 text-current" />
        <p className="font-medium">{statusExplanations[normStatus] || statusExplanations.OPEN}</p>
      </div>
    </section>
  );
}

export default function ComplaintCard({ complaint, onClick }) {
  const { timezone } = useSystemTimezone();
  const [isModalOpen, setModalOpen] = useState(false);
  const [detailedComplaint, setDetailedComplaint] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  async function loadDetails() {
    setIsLoadingDetails(true);
    try {
      const res = await getComplaintById(complaint.id);
      setDetailedComplaint(res.complaint);
    } catch (err) {
      console.error('Failed to load complaint details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function openDetails() {
    if (onClick) {
      onClick(complaint);
      return;
    }
    setModalOpen(true);
    setFollowUpError('');
    await loadDetails();
  }

  function handleCopyId(idToCopy) {
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  async function handleFollowUpSubmit(event) {
    event.preventDefault();
    const message = followUpMessage.trim();

    if (message.length < 3 || isSendingFollowUp) {
      return;
    }

    setIsSendingFollowUp(true);
    setFollowUpError('');

    try {
      await submitFollowUp(complaint.id, message);
      setFollowUpMessage('');
      await loadDetails();
    } catch (err) {
      console.error('Failed to submit follow-up:', err);
      setFollowUpError(err.response?.data?.message || 'Unable to send follow-up. Please try again.');
    } finally {
      setIsSendingFollowUp(false);
    }
  }

  // Map status to badges
  const statusConfig = {
    open: {
      label: 'Open',
      bgClass: 'bg-error-container text-on-error-container border border-error-container/30',
      icon: Hourglass
    },
    in_progress: {
      label: 'In Progress',
      bgClass: 'bg-primary-fixed text-on-primary-fixed-variant border border-primary-fixed-dim/30',
      icon: Eye
    },
    resolved: {
      label: 'Resolved',
      bgClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary-fixed-dim/30',
      icon: CheckCircle2
    }
  }[complaint.status?.toLowerCase()] || {
    label: complaint.status || 'Unknown',
    bgClass: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30',
    icon: Info
  };

  const priorityConfig = {
    high: { label: 'High Priority', bgClass: 'bg-red-50 text-red-700 border-red-200', icon: ChevronsUp },
    medium: { label: 'Medium Priority', bgClass: 'bg-amber-50 text-amber-700 border-amber-200', icon: Minus },
    low: { label: 'Low Priority', bgClass: 'bg-green-50 text-green-700 border-green-200', icon: ChevronDown }
  }[complaint.priority?.toLowerCase()] || null;

  // Format AI classification confidence score
  const confidencePercent = complaint.nlpConfidence
    ? `${(Number(complaint.nlpConfidence) * 100).toFixed(0)}%`
    : null;

  // Determine current active display details (fallback to list details if dynamic fetch hasn't completed)
  const activeDetail = detailedComplaint || complaint;
  const studentFollowUps = activeDetail.studentFollowUps || [];
  const canSendFollowUp = followUpMessage.trim().length >= 3 && !isSendingFollowUp;

  return (
    <>
      <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 flex flex-col justify-between hover:border-outline hover:shadow-md transition-all duration-300">
        <div>
          <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`rounded-full px-3 py-1 font-label-md text-label-md flex items-center gap-1.5 font-semibold ${statusConfig.bgClass}`}>
                {statusConfig.icon && (() => { const Icon = statusConfig.icon; return <Icon size={14} />; })()}
                {statusConfig.label}
              </div>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-mono">
                ID: {complaint.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {priorityConfig && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${priorityConfig.bgClass}`}>
                {priorityConfig.icon && (() => { const Icon = priorityConfig.icon; return <Icon size={13} />; })()}
                <span>{priorityConfig.label}</span>
              </div>
            )}
          </div>

          <h3 className="font-headline-sm text-headline-sm text-primary mb-2 line-clamp-2 font-bold leading-snug">
            {complaint.title}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4 line-clamp-3 leading-relaxed">
            {complaint.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/40">
          <div className="flex justify-between items-center text-xs text-on-surface-variant font-medium">
            <div className="flex items-center gap-1.5 text-outline">
              <BookOpen size={16} />
              <span className="capitalize text-primary font-semibold">
                {complaint.category || 'Classifying...'}
              </span>
            </div>

            {confidencePercent && (
              <span className="flex items-center gap-1 text-[10px] bg-secondary/5 text-secondary px-2 py-0.5 rounded-full border border-secondary/10 font-bold uppercase tracking-wider">
                <Sparkles size={10} />
                {confidencePercent} Conf
              </span>
            )}
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="font-label-md text-label-md text-outline font-medium">
              {formatDate(complaint.createdAt, timezone)}
            </span>
            <button
              onClick={openDetails}
              className="text-secondary font-label-md text-label-md font-bold flex items-center gap-1 hover:underline cursor-pointer group"
            >
              Details 
              <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {!onClick && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Complaint Details"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Top Meta Bar: Status, Priority, Category, and Copy ID */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={activeDetail.status} />
                {activeDetail.priority && <PriorityBadge priority={activeDetail.priority} />}
                {activeDetail.category && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <BookOpen size={12} className="text-gray-500" />
                    <span className="capitalize">{activeDetail.category}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  ID: {activeDetail.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyId(activeDetail.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-2xs cursor-pointer"
                  title="Copy Ticket ID to Clipboard"
                >
                  {copiedId ? (
                    <>
                      <CheckCheck size={13} className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resolution Lifecycle Stepper */}
            <StudentLifecycleStepper
              status={activeDetail.status}
              department={activeDetail.department}
            />

            {/* Complaint Overview Card */}
            <section aria-label="Complaint Overview" className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900 leading-snug">
                  {activeDetail.title}
                </h4>
                <div className="mt-3 bg-gray-50/70 rounded-xl p-4 border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-normal">
                  {activeDetail.description}
                </div>
              </div>

              {/* Image Evidence */}
              {activeDetail.imageUrl && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <Eye size={13} /> Attached Proof
                    </span>
                    <a
                      href={activeDetail.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      View Full Image <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex justify-center max-h-72">
                    <img
                      src={activeDetail.imageUrl}
                      alt="Uploaded proof"
                      className="object-contain max-h-72 w-full rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Key Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
                <div className="bg-gray-50/60 rounded-xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1 flex items-center gap-1">
                    <Building2 size={12} /> Assigned Department
                  </span>
                  <span className="font-semibold text-gray-900">
                    {activeDetail.department || 'Awaiting Assignment'}
                  </span>
                </div>

                <div className="bg-gray-50/60 rounded-xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Submitted On
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatDate(activeDetail.createdAt, timezone)}
                  </span>
                </div>

                <div className="bg-gray-50/60 rounded-xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1 flex items-center gap-1">
                    <Sparkles size={12} /> AI Classification
                  </span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span className="capitalize">{activeDetail.category || 'Classified'}</span>
                    {confidencePercent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {confidencePercent}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* Official Admin Update Card */}
            {activeDetail.adminNote ? (
              <section aria-label="Admin Update" className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Official Admin Update
                  </span>
                  <span className="ml-auto text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified Update
                  </span>
                </div>
                <p className="text-sm text-emerald-950 leading-relaxed font-medium whitespace-pre-wrap break-words pl-6.5">
                  {activeDetail.adminNote}
                </p>
              </section>
            ) : (
              <div className="bg-gray-50/70 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-3 text-xs text-gray-500">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <p className="leading-relaxed">
                  No official administrator update has been posted yet. You will see public notes and instructions here as soon as an administrator takes action.
                </p>
              </div>
            )}

            {/* Activity Timeline Audit Trail */}
            <section aria-label="Activity Timeline" className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Complaint History & Audit Trail
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {(activeDetail.logs || []).filter((l) => !l.isInternal).length} Updates
                </span>
              </div>
              <ActivityTimeline logs={activeDetail.logs || []} isLoading={isLoadingDetails} />
            </section>

            {/* Student Follow-Up / Message Replies */}
            <section aria-label="Student Follow-up" className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <MessageSquare size={14} /> Student Follow-up & Discussion
                </span>
                {studentFollowUps.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {studentFollowUps.length} {studentFollowUps.length === 1 ? 'Message' : 'Messages'}
                  </span>
                )}
              </div>

              {studentFollowUps.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {studentFollowUps.map((reply) => (
                    <div key={reply.id} className="rounded-xl border border-gray-200/80 bg-gray-50/60 p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-900">{reply.student?.name || 'You'}</span>
                        <span className="text-gray-400">{formatDateTime(reply.createdAt, timezone)}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleFollowUpSubmit} className="space-y-3 pt-2">
                <textarea
                  rows={3}
                  value={followUpMessage}
                  onChange={(event) => setFollowUpMessage(event.target.value)}
                  disabled={isSendingFollowUp}
                  maxLength={2000}
                  placeholder="Need to add more information, report changes, or request a status update?"
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
                {followUpError && (
                  <p className="text-xs font-semibold text-red-600">{followUpError}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    {followUpMessage.length}/2000 characters
                  </span>
                  <button
                    type="submit"
                    disabled={!canSendFollowUp}
                    className="h-[42px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Send size={13} />
                    {isSendingFollowUp ? 'Sending...' : 'Send Follow-up Message'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}
