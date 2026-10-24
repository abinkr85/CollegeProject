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
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Widget Header: Balanced responsive layout preventing button wrapping */}
      <div className="px-6 py-4.5 border-b border-outline-variant/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-container-low/40">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div
            className={`p-2.5 rounded-xl shadow-xs shrink-0 ${
              isVerified
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-secondary-fixed/50 text-secondary border border-secondary-fixed/80'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-primary truncate">
                Institutional Student ID Card
              </h3>
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Student 🛡️
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Needs Re-Scan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  Not Scanned
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 truncate sm:whitespace-normal">
              {isVerified
                ? 'Your student credentials are authenticated with your college physical ID card.'
                : 'Scan or upload both sides of your college physical ID card (Harsha Institutions format supported).'}
            </p>
          </div>
        </div>

        {isVerified && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsZoomOpen(true)}
              className="text-xs font-semibold"
            >
              <ZoomIn className="w-3.5 h-3.5 mr-1.5 text-secondary" />
              Inspect Card
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenScanner}
              className="text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 text-secondary" />
              Re-Scan ID Card
            </Button>
          </div>
        )}
      </div>

      <div className="p-6">
        {isVerified && hasFrontImage ? (
          /* VERIFIED STATE: BALANCED DUAL-COLUMN LAYOUT ALIGNED AT TOP */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Authentic 3D ID Card Badge Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              {/* Lanyard Strap & Swivel Clip Simulation */}
              <div className="w-12 h-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 rounded-t shadow-xs mx-auto" />
              <div className="w-7 h-3.5 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 rounded-xs shadow-xs border border-slate-300 mx-auto -mt-0.5 z-20 flex items-center justify-center">
                <div className="w-3 h-0.5 bg-slate-500 rounded-full" />
              </div>
              <div className="w-3.5 h-3 rounded-full border-2 border-slate-400 mx-auto -mt-1.5 z-10 shadow-xs" />

              {/* Protective Acrylic Badge Sleeve */}
              <div className="relative w-full max-w-[245px] p-2 bg-slate-50/90 rounded-2xl border border-outline-variant/70 shadow-md backdrop-blur-xs transition-all duration-300 hover:shadow-lg -mt-1.5">
                {/* Lanyard punch hole cut-out in card acrylic */}
                <div className="w-9 h-2 bg-white rounded-full mx-auto mb-2 border border-slate-300/80 shadow-inner" />

                {/* Physical Card Preview Frame */}
                <div
                  onClick={() => !imageError && setIsZoomOpen(true)}
                  className={`group relative rounded-xl overflow-hidden bg-white shadow-xs border border-slate-200 aspect-[1/1.58] transition-all duration-300 hover:border-secondary/60 ${
                    !imageError ? 'cursor-zoom-in' : ''
                  }`}
                >
                  {/* Skeleton loader while fetching image */}
                  {imageLoading && (
                    <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-10 animate-pulse">
                      <RefreshCw className="w-6 h-6 text-secondary animate-spin mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-on-surface-variant">
                        Loading ID card photo...
                      </span>
                    </div>
                  )}

                  {/* Fallback if image failed to load from CDN */}
                  {imageError ? (
                    <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-20 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                      <span className="text-xs font-bold text-primary mb-1">
                        Could not load ID photo
                      </span>
                      <span className="text-[10px] text-on-surface-variant mb-3 max-w-[180px]">
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
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
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
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-102 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                  )}

                  {/* Subtle Holographic Glass Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-75 transition duration-500" />

                  {/* Corner Badge Tag */}
                  <div className="absolute top-2.5 left-2.5 bg-primary/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{currentSide === 'front' ? 'FRONT' : 'BACK'}</span>
                  </div>

                  {/* Hover Zoom Prompt */}
                  {!imageError && !imageLoading && (
                    <div className="absolute bottom-2.5 right-2.5 bg-primary/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5 text-secondary-fixed" />
                      <span>Inspect</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Controls Toolbar: Clean full-width button matching card width */}
              <div className="w-full max-w-[245px] mt-3">
                <button
                  onClick={toggleSide}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-outline-variant/60 transition shadow-xs cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-secondary" />
                  <span>Flip to {currentSide === 'front' ? 'Back Side' : 'Front Side'}</span>
                </button>
              </div>
            </div>

            {/* Right: Verified Student Data Record */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-surface-container-low/40 p-5 sm:p-6 rounded-2xl border border-outline-variant/50 space-y-4">
                <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
                  <div>
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Harsha Institutions Student Record
                    </span>
                    <h4 className="text-xl font-bold text-primary mt-1">
                      {profile.name}
                    </h4>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Roll No */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors flex items-center justify-between">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                        Student Roll No
                      </span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {studentIdNumber}
                      </span>
                    </div>
                    {profile.studentIdNumber && (
                      <button
                        onClick={handleCopyId}
                        className="p-1.5 text-on-surface-variant hover:text-secondary rounded-lg hover:bg-surface-container-low transition cursor-pointer"
                        title="Copy Roll Number"
                      >
                        {copiedId ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Course */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Course / Department
                    </span>
                    <span className="font-semibold text-primary text-xs line-clamp-1">
                      {profile.department || 'Bachelor of Computer Application'}
                    </span>
                  </div>

                  {/* Batch */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Batch
                    </span>
                    <span className="font-semibold text-primary text-xs">
                      {profile.batch || '2023 - 2024'}
                    </span>
                  </div>

                  {/* Valid Upto / Expiry Date */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Valid Upto
                    </span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">
                      {profile.idCardValidUpto || (profile.idCardExpiresAt ? new Date(profile.idCardExpiresAt).getFullYear() : '2026')}
                    </span>
                  </div>

                  {/* Student Phone */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Student Phone
                    </span>
                    <span className="font-semibold text-primary font-mono text-xs">
                      {profile.phone || 'N/A'}
                    </span>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Emergency Contact
                    </span>
                    <span className="font-semibold text-primary font-mono text-xs">
                      {profile.emergencyPhone || 'N/A'}
                    </span>
                  </div>

                  {/* Academic Year */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Academic Year
                    </span>
                    <span className="font-semibold text-primary text-xs">
                      {profile.year || '3rd Year'}
                    </span>
                  </div>

                  {/* Verified Timestamp */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors">
                    <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Verified Date
                    </span>
                    <span className="font-semibold text-emerald-700 text-xs">
                      {profile.idCardVerifiedAt ? new Date(profile.idCardVerifiedAt).toLocaleDateString() : 'Verified Recently'}
                    </span>
                  </div>

                  {/* College Email */}
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs hover:border-outline-variant transition-colors sm:col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                        College Account Email
                      </span>
                      <span className="font-semibold text-primary text-xs">
                        {profile.email || 'N/A'}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
                      <CheckCircle2 size={13} className="text-emerald-600" /> Verified
                    </span>
                  </div>
                </div>

                {/* Trust Seal Banner */}
                <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-medium bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/90 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Your identity is fully verified. Every complaint you submit carries the official institutional student seal.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* UNVERIFIED STATE: MODERN ONBOARDING & SCANNER INVITATION */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Realistic Card Mockup Preview */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[240px] rounded-2xl border-2 border-dashed border-secondary/30 bg-surface-container-low/50 p-4 aspect-[1/1.58] flex flex-col justify-between shadow-xs">
                {/* Simulated Header */}
                <div className="border-b border-outline-variant/50 pb-2 text-center">
                  <span className="text-[10px] font-extrabold tracking-wider text-secondary uppercase block">
                    HARSHA INSTITUTIONS
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-medium">STUDENT IDENTITY CARD</span>
                </div>

                {/* Simulated Details & Photo silhouette */}
                <div className="my-auto space-y-3">
                  <div className="w-16 h-20 bg-secondary-fixed/50 rounded-lg mx-auto flex items-center justify-center border border-secondary-fixed text-secondary">
                    <User className="w-8 h-8 opacity-70" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <div className="h-2.5 w-24 bg-outline-variant/60 rounded mx-auto" />
                    <div className="h-2 w-32 bg-outline-variant/40 rounded mx-auto" />
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="border-t border-outline-variant/50 pt-2 text-center">
                  <div className="text-[8px] font-mono tracking-widest text-on-surface-variant font-semibold">||| 23BC023 |||</div>
                </div>

                {/* Overlay Prompt */}
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/40 mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    Portrait Card Format
                  </span>
                  <span className="text-[10px] text-white/90 drop-shadow-md">
                    Front & Back Scanner
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action & Feature Steps */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-primary">
                  Add Your Physical College ID Card
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                  Authenticate your account by scanning your official Harsha Institutions student ID card. Our smart scanner automatically extracts your Roll Number (e.g. <strong>23BC023</strong>), course, and emergency details.
                </p>
              </div>

              {/* 3 Step List */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 text-xs shadow-xs">
                  <span className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-primary block font-bold">Capture Front Side</strong>
                    <span className="text-on-surface-variant text-[11px]">
                      Align the side with your photo, name, and barcode (Roll No: 23BC023).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 text-xs shadow-xs">
                  <span className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-primary block font-bold">Capture Back Side</strong>
                    <span className="text-on-surface-variant text-[11px]">
                      Flip over to capture emergency phone and parent/guardian contact.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50 text-xs shadow-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-primary block font-bold">Instant Verification & Badge</strong>
                    <span className="text-on-surface-variant text-[11px]">
                      Your verified status will be reflected across all your complaints.
                    </span>
                  </div>
                </div>
              </div>

              {/* Call to action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={onOpenScanner}
                  className="bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs px-5 py-2.5 shadow-sm"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Live Camera Scan
                </Button>

                <Button
                  variant="outline"
                  onClick={onOpenScanner}
                  className="text-xs font-semibold border-outline-variant/70 text-primary hover:bg-surface-container-low shadow-xs"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div
            className="max-w-2xl w-full flex flex-col items-center bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 sm:p-6 shadow-2xl text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between w-full text-xs mb-3 border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-primary">
                  {profile.name} - Student ID
                </span>
                <span className="px-2.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded-md font-mono font-bold text-xs">
                  {studentIdNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSide}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Flip to {currentSide === 'front' ? 'Back' : 'Front'}</span>
                </button>
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg font-semibold text-xs transition border border-outline-variant/40 cursor-pointer"
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
                className="max-h-[70vh] w-auto rounded-xl shadow-lg border border-outline-variant/50 object-contain bg-surface-container-low"
              />
            </div>

            <div className="w-full flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/40 mt-3">
              <span>
                Showing: <strong className="text-primary uppercase font-mono font-bold">{currentSide} side</strong>
              </span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} /> Official College Record Verified
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
