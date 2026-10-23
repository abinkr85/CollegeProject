import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  RefreshCw,
  Rotate3d,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  User,
  ZoomIn
} from 'lucide-react';
import Button from '../ui/Button';

export default function IdCardBadgeWidget({
  profile,
  onOpenScanner,
  onRefresh
}) {
  const [currentSide, setCurrentSide] = useState('front'); // 'front' | 'back'
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const isVerified = profile?.idCardStatus === 'VERIFIED';
  const isRejected = profile?.idCardStatus === 'REJECTED';
  const hasFrontImage = Boolean(profile?.idCardFrontUrl);
  const hasBackImage = Boolean(profile?.idCardBackUrl);
  const studentIdNumber = profile?.studentIdNumber || 'Not specified';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-xl ${
              isVerified
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Institutional Student ID Card
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Verified Student 🛡️
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                  <AlertCircle className="w-3 h-3" />
                  Needs Re-Scan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Not Scanned
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isVerified
                ? 'Your student credentials are authenticated with your college identity card.'
                : 'Scan both sides of your college physical ID card using your camera to verify your account.'}
            </p>
          </div>
        </div>

        {isVerified && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenScanner}
            className="text-xs"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Re-Scan ID Card
          </Button>
        )}
      </div>

      <div className="p-6">
        {isVerified && hasFrontImage ? (
          /* VERIFIED STATE: 3D DUAL-SIDED ID CARD VIEWER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Interactive Card Flip Container */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-md relative">
                {/* Side Toggle Control */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Viewing: <strong className="text-blue-600 dark:text-blue-400 uppercase">{currentSide} Side</strong>
                  </span>

                  <button
                    onClick={() => setCurrentSide(currentSide === 'front' ? 'back' : 'front')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-xs font-semibold transition border border-blue-200 dark:border-blue-800"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip to {currentSide === 'front' ? 'Back' : 'Front'}</span>
                  </button>
                </div>

                {/* ID Card Display Card */}
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="group relative aspect-[1.58/1] rounded-2xl overflow-hidden shadow-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-900 cursor-zoom-in transition-all duration-300 hover:shadow-2xl"
                >
                  <img
                    src={currentSide === 'front' ? profile.idCardFrontUrl : profile.idCardBackUrl || profile.idCardFrontUrl}
                    alt={`Student ID ${currentSide}`}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />

                  {/* Watermark & Badges */}
                  <div className="absolute top-3 left-3 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 border border-slate-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{currentSide === 'front' ? 'FRONT SIDE' : 'BACK SIDE'}</span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Click to Zoom</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-slate-400">
                  <span>💡 Flip to inspect both sides or click to open full-resolution view.</span>
                </div>
              </div>
            </div>

            {/* Right: Verified Student Data Summary */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Verified Identity Record
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {profile.name}
                </h4>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Student ID / Roll No:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {studentIdNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">College / Dept:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[180px] truncate">
                    {profile.department || 'Not selected'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Academic Year:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {profile.year || 'Not selected'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Verified Date:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {profile.idCardVerifiedAt ? new Date(profile.idCardVerifiedAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Complaints you submit will now carry the verified student trust seal.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* UNVERIFIED STATE: INVITATION TO SCAN */
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-slate-50/60 dark:bg-slate-900/30">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Camera className="w-7 h-7" />
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add Your Physical Student ID Card
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Use our live HD camera scan to capture the front and back of your college ID card. Our smart clarity check ensures every detail is crisp and legible.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={onOpenScanner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 shadow-md shadow-blue-600/20"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Live Camera Scan (Front & Back)
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4 max-w-lg mx-auto">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                HD Blur & Focus Check
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Front & Back Capture
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Verified Badge
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN ZOOM MODAL */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="max-w-3xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full text-white text-xs mb-3">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {profile.name} - Student ID ({currentSide.toUpperCase()})
              </span>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium"
              >
                Close
              </button>
            </div>
            <img
              src={currentSide === 'front' ? profile.idCardFrontUrl : profile.idCardBackUrl || profile.idCardFrontUrl}
              alt="Zoomed Student ID"
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl border border-white/20 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
