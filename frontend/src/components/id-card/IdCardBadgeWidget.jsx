import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  GraduationCap,
  Heart,
  Layers,
  Phone,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  ZoomIn
} from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';

export default function IdCardBadgeWidget({
  profile,
  onOpenScanner,
  onRefresh
}) {
  const [currentSide, setCurrentSide] = useState('front'); // 'front' | 'back'
  const [isFlipped, setIsFlipped] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const isVerified = profile?.idCardStatus === 'VERIFIED';
  const isRejected = profile?.idCardStatus === 'REJECTED';
  const hasFrontImage = Boolean(profile?.idCardFrontUrl);
  const hasBackImage = Boolean(profile?.idCardBackUrl);
  const studentIdNumber = profile?.studentIdNumber || 'Not specified';

  const rawUrl = currentSide === 'front' ? profile?.idCardFrontUrl : profile?.idCardBackUrl || profile?.idCardFrontUrl;
  const currentImageUrl = rawUrl ? (retryNonce ? `${rawUrl}?r=${retryNonce}` : rawUrl) : '';

  const handleCopyId = () => {
    if (!profile?.studentIdNumber) return;
    navigator.clipboard.writeText(profile.studentIdNumber);
    setCopiedId(true);
    toast.success(`Copied Roll No: ${profile.studentIdNumber}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const toggleSide = () => {
    const nextSide = currentSide === 'front' ? 'back' : 'front';
    setCurrentSide(nextSide);
    setIsFlipped(!isFlipped);
    setImageLoading(true);
    setImageError(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl shadow-sm ${
              isVerified
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Institutional Student ID Card
              </h3>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Verified Student 🛡️
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Needs Re-Scan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Not Scanned
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVerified
                ? 'Your student credentials are authenticated with your college physical ID card.'
                : 'Scan or upload both sides of your college physical ID card (Harsha Institutions format supported).'}
            </p>
          </div>
        </div>

        {isVerified && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              title="Toggle portrait/landscape view"
            >
              {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenScanner}
              className="text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Re-Scan ID Card
            </Button>
          </div>
        )}
      </div>

      <div className="p-6">
        {isVerified && hasFrontImage ? (
          /* VERIFIED STATE: AUTHENTIC DIGITAL ID BADGE VIEWER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: 3D ID Card Badge Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              {/* Lanyard Strap & Clip Simulation */}
              <div className="w-16 h-4 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700 rounded-t-sm shadow-sm opacity-90 mx-auto" />
              <div className="w-8 h-3 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-sm shadow-md mx-auto relative -mt-0.5 z-10 flex items-center justify-center">
                <div className="w-4 h-1 bg-slate-600 rounded-full" />
              </div>

              {/* ID Card Holder Container */}
              <div className="relative w-full max-w-[280px] -mt-1">
                {/* Lanyard punch hole cut-out in card acrylic */}
                <div className="w-10 h-2 bg-slate-300 dark:bg-slate-800 rounded-full mx-auto mb-2 border border-slate-400/50 shadow-inner z-10" />

                {/* Flip Card Wrapper */}
                <div
                  onClick={() => !imageError && setIsZoomOpen(true)}
                  className={`group relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-700 bg-slate-950 transition-all duration-300 hover:shadow-blue-500/10 hover:border-blue-400/60 ${
                    !imageError ? 'cursor-zoom-in' : ''
                  } ${
                    orientation === 'portrait' ? 'aspect-[1/1.58]' : 'aspect-[1.58/1]'
                  }`}
                >
                  {/* Skeleton loader while fetching image */}
                  {imageLoading && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-10 animate-pulse">
                      <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mb-2 opacity-80" />
                      <span className="text-[11px] font-semibold text-slate-300">
                        Loading ID card photo...
                      </span>
                    </div>
                  )}

                  {/* Fallback if image failed to load from CDN */}
                  {imageError ? (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-20 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                      <span className="text-xs font-bold text-white mb-1">
                        Could not load ID photo
                      </span>
                      <span className="text-[10px] text-slate-400 mb-3 max-w-[200px]">
                        The card is verified. Tap reload to re-fetch the image from storage.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageError(false);
                          setImageLoading(true);
                          setRetryNonce((prev) => prev + 1);
                          onRefresh?.();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Reload Image</span>
                      </button>
                    </div>
                  ) : null}

                  {/* ID Card Image (Front or Back) */}
                  {currentImageUrl && (
                    <img
                      key={`${currentSide}-${retryNonce}-${currentImageUrl}`}
                      src={currentImageUrl}
                      alt={`Student ID ${currentSide}`}
                      onLoad={() => {
                        setImageLoading(false);
                        setImageError(false);
                      }}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                      className={`w-full h-full object-contain bg-slate-900 transition-all duration-300 group-hover:scale-102 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                  )}

                  {/* Subtle Holographic Glass Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none opacity-40 group-hover:opacity-75 transition duration-500" />

                  {/* Corner Badge Tag */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 border border-slate-700/80 shadow">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{currentSide === 'front' ? 'FRONT' : 'BACK'}</span>
                  </div>

                  {/* Hover Zoom Prompt */}
                  {!imageError && !imageLoading && (
                    <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow">
                      <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                      <span>Inspect</span>
                    </div>
                  )}
                </div>

                {/* Card Controls Toolbar */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Showing: <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">{currentSide} Side</strong>
                  </span>

                  <button
                    onClick={toggleSide}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-xs font-semibold transition border border-blue-200 dark:border-blue-800 shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip to {currentSide === 'front' ? 'Back' : 'Front'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Verified Student Data Record */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Harsha Institutions Student Record
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {profile.name}
                    </h4>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Roll No */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Roll No</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {studentIdNumber}
                      </span>
                    </div>
                    {profile.studentIdNumber && (
                      <button
                        onClick={handleCopyId}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Copy Roll Number"
                      >
                        {copiedId ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Course */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Course / Department</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs line-clamp-1">
                      {profile.department || 'Bachelor of Computer Application'}
                    </span>
                  </div>

                  {/* Batch */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Batch</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {profile.batch || '2023 - 2024'}
                    </span>
                  </div>

                  {/* Valid Upto / Expiry Date */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Valid Upto</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {profile.idCardValidUpto || (profile.idCardExpiresAt ? new Date(profile.idCardExpiresAt).getFullYear() : '2026')}
                    </span>
                  </div>

                  {/* Student Phone */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Phone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                      {profile.phone || 'N/A'}
                    </span>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Contact</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                      {profile.emergencyPhone || 'N/A'}
                    </span>
                  </div>

                  {/* Academic Year */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Year</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {profile.year || '3rd Year'}
                    </span>
                  </div>

                  {/* Verified Timestamp */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Verified Date</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      {profile.idCardVerifiedAt ? new Date(profile.idCardVerifiedAt).toLocaleDateString() : 'Verified Recently'}
                    </span>
                  </div>
                </div>

                {/* Trust Seal Banner */}
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Your identity is fully verified. Every complaint you submit carries the official institutional student seal.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsZoomOpen(true)}
                  className="text-xs"
                >
                  <ZoomIn className="w-3.5 h-3.5 mr-1.5" />
                  Inspect Full Resolution
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenScanner}
                  className="text-xs text-slate-600"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Update ID Photo
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* UNVERIFIED STATE: MODERN ONBOARDING & SCANNER INVITATION */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Realistic Card Mockup Preview */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[240px] rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-gradient-to-b from-blue-50/50 to-slate-100 dark:from-slate-900/60 dark:to-slate-900/20 p-4 aspect-[1/1.58] flex flex-col justify-between shadow-sm">
                {/* Simulated Header */}
                <div className="border-b border-blue-200 dark:border-blue-900 pb-2 text-center">
                  <span className="text-[10px] font-extrabold tracking-wider text-blue-900 dark:text-blue-300 uppercase block">
                    HARSHA INSTITUTIONS
                  </span>
                  <span className="text-[9px] text-slate-400">STUDENT IDENTITY CARD</span>
                </div>

                {/* Simulated Details & Photo silhouette */}
                <div className="my-auto space-y-3">
                  <div className="w-16 h-20 bg-blue-100 dark:bg-blue-950/80 rounded-lg mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                    <User className="w-8 h-8 opacity-60" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <div className="h-2.5 w-24 bg-slate-300 dark:bg-slate-700 rounded mx-auto" />
                    <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-center">
                  <div className="text-[8px] font-mono tracking-widest text-slate-500">||| 23BC023 |||</div>
                </div>

                {/* Overlay Prompt */}
                <div className="absolute inset-0 bg-blue-950/30 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow">
                    Portrait Card Format
                  </span>
                  <span className="text-[10px] text-blue-100 drop-shadow">
                    Front & Back Scanner
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action & Feature Steps */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Your Physical College ID Card
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Authenticate your account by scanning your official Harsha Institutions student ID card. Our smart scanner automatically extracts your Roll Number (e.g. <strong>23BC023</strong>), course, and emergency details.
                </p>
              </div>

              {/* 3 Step List */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Capture Front Side</strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Align the side with your photo, name, and barcode (Roll No: 23BC023).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Capture Back Side</strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Flip over to capture emergency phone and parent/guardian contact.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Instant Verification & Badge</strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Your verified status will be reflected across all your complaints.
                    </span>
                  </div>
                </div>
              </div>

              {/* Call to action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={onOpenScanner}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 shadow-md shadow-blue-600/20"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Live Camera Scan
                </Button>

                <Button
                  variant="outline"
                  onClick={onOpenScanner}
                  className="text-xs font-semibold"
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload Card Photos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN HIGH-RESOLUTION INSPECT MODAL */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div
            className="max-w-2xl w-full flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between w-full text-white text-xs mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">
                  {profile.name} - Student ID
                </span>
                <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded font-mono font-bold text-[11px]">
                  {studentIdNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSide}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Flip to {currentSide === 'front' ? 'Back' : 'Front'}</span>
                </button>
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white font-medium text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* High-res Image Container */}
            <div className="relative max-h-[75vh] w-full flex items-center justify-center p-2">
              <img
                src={currentImageUrl || (currentSide === 'front' ? profile?.idCardFrontUrl : profile?.idCardBackUrl || profile?.idCardFrontUrl)}
                alt="Zoomed Student ID"
                className="max-h-[70vh] w-auto rounded-xl shadow-2xl border border-slate-700 object-contain"
              />
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800 mt-2">
              <span>Showing: <strong className="text-white uppercase">{currentSide} side</strong></span>
              <span>College Record Verified & Protected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
