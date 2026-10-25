import { useState, useRef, useEffect } from 'react';
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
import LanyardBadge from '../ui/lanyard-badge';

export default function IdCardBadgeWidget({
  profile,
  onOpenScanner,
  onRefresh
}) {
  const lanyardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [zoomFlipped, setZoomFlipped] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [frontLoaded, setFrontLoaded] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);
  const [frontError, setFrontError] = useState(false);
  const [backError, setBackError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const isVerified = profile?.idCardStatus === 'VERIFIED';
  const isRejected = profile?.idCardStatus === 'REJECTED';
  const hasFrontImage = Boolean(profile?.idCardFrontUrl);
  const hasBackImage = Boolean(profile?.idCardBackUrl);
  const studentIdNumber = profile?.studentIdNumber || 'Not specified';

  const frontUrl = profile?.idCardFrontUrl;
  const backUrl = profile?.idCardBackUrl || profile?.idCardFrontUrl;
  const frontImageUrl = frontUrl ? (retryNonce ? `${frontUrl}?r=${retryNonce}` : frontUrl) : '';
  const backImageUrl = backUrl ? (retryNonce ? `${backUrl}?r=${retryNonce}` : backUrl) : '';

  const handleCopyId = () => {
    if (!profile?.studentIdNumber) return;
    navigator.clipboard.writeText(profile.studentIdNumber);
    setCopiedId(true);
    toast.success(`Copied Roll No: ${profile.studentIdNumber}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Close inspect modal on ESC key
  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsZoomOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen]);

  const toggleSide = () => {
    if (lanyardRef.current?.flip) {
      lanyardRef.current.flip();
    } else {
      setIsFlipped((prev) => !prev);
    }
  };

  const handleReload = (e) => {
    e?.stopPropagation();
    setFrontError(false);
    setBackError(false);
    setFrontLoaded(false);
    setBackLoaded(false);
    setRetryNonce((prev) => prev + 1);
    onRefresh?.();
  };

  const frontFace = (
    <div className="relative w-full h-full bg-white select-none">
      {!frontLoaded && !frontError && (
        <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-10 animate-pulse">
          <RefreshCw className="w-6 h-6 text-secondary animate-spin mb-2 opacity-80" />
          <span className="text-[11px] font-semibold text-on-surface-variant text-center">
            Loading photo...
          </span>
        </div>
      )}

      {frontError ? (
        <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-20 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <span className="text-xs font-bold text-primary mb-1">
            Front photo unavailable
          </span>
          <button
            type="button"
            onClick={handleReload}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer mt-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>
      ) : null}

      {frontImageUrl && (
        <img
          key={`front-${retryNonce}-${frontImageUrl}`}
          src={frontImageUrl}
          alt="Student ID Front"
          onLoad={() => {
            setFrontLoaded(true);
            setFrontError(false);
          }}
          onError={() => {
            setFrontLoaded(false);
            setFrontError(true);
          }}
          className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 ${
            frontLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 transition duration-500" />
    </div>
  );

  const backFace = (
    <div className="relative w-full h-full bg-white select-none">
      {!backLoaded && !backError && (
        <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-10 animate-pulse">
          <RefreshCw className="w-6 h-6 text-secondary animate-spin mb-2 opacity-80" />
          <span className="text-[11px] font-semibold text-on-surface-variant text-center">
            Loading photo...
          </span>
        </div>
      )}

      {backError ? (
        <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-4 z-20 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <span className="text-xs font-bold text-primary mb-1">
            Back photo unavailable
          </span>
          <button
            type="button"
            onClick={handleReload}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer mt-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>
      ) : null}

      {backImageUrl && (
        <img
          key={`back-${retryNonce}-${backImageUrl}`}
          src={backImageUrl}
          alt="Student ID Back"
          onLoad={() => {
            setBackLoaded(true);
            setBackError(false);
          }}
          onError={() => {
            setBackLoaded(false);
            setBackError(true);
          }}
          className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 ${
            backLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 transition duration-500" />
    </div>
  );

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Widget Header: Clean, spacious, and uncluttered */}
      <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between gap-4 bg-surface-container-low/30">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`p-2 rounded-xl shadow-xs shrink-0 ${
              isVerified
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-secondary-fixed/50 text-secondary border border-secondary-fixed/80'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-4.5 h-4.5" />
            ) : (
              <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h3 className="text-base font-bold text-primary truncate">
              Institutional Student ID Card
            </h3>
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified
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
        </div>

        {isVerified && (
          <div className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenScanner}
              className="text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 text-secondary" />
              Re-Scan
            </Button>
          </div>
        )}
      </div>

      <div className="p-6">
        {isVerified && hasFrontImage ? (
          /* VERIFIED STATE: BALANCED DUAL-COLUMN LAYOUT ALIGNED AT TOP */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Interactive Physics Lanyard Badge Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex justify-center">
                <LanyardBadge
                  ref={lanyardRef}
                  front={frontFace}
                  back={backFace}
                  cardWidth={225}
                  height="480px"
                  strapLength="compact"
                  strapText="HARSHA INSTITUTIONS"
                  strapLabel="CAMPUS ID"
                  strapColor="#1e3a8a"
                  inkColor="#fbbf24"
                  onFlipChange={setIsFlipped}
                  className="mx-auto"
                />
              </div>

              {/* Card Controls Toolbar: Clean full-width button matching card width */}
              <div className="w-full max-w-[245px] mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSide}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-outline-variant/60 transition shadow-xs cursor-pointer active:scale-98"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-secondary transition-transform duration-700 ${isFlipped ? 'rotate-180' : ''}`} />
                  <span>Flip to {isFlipped ? 'Front Side' : 'Back Side'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoomFlipped(isFlipped);
                    setIsZoomOpen(true);
                  }}
                  title="Inspect high-resolution ID card"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-outline-variant/60 transition shadow-xs cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4 text-on-surface-variant hover:text-primary" />
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
            <div className="flex items-center justify-between w-full text-xs mb-3 border-b border-outline-variant/40 pb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-sm text-primary truncate">
                  {profile.name}
                </span>
                <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded-md font-mono font-bold text-xs shrink-0">
                  {studentIdNumber}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={zoomFlipped ? backImageUrl : frontImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant/40 rounded-lg text-xs font-semibold transition"
                  title="Open original high-res image in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open HD</span>
                </a>

                <button
                  type="button"
                  onClick={() => setZoomFlipped((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98"
                >
                  <RotateCw className={`w-3.5 h-3.5 transition-transform duration-700 ${zoomFlipped ? 'rotate-180' : ''}`} />
                  <span>Flip to {zoomFlipped ? 'Front' : 'Back'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg font-semibold text-xs transition border border-outline-variant/40 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* High-res 3D Flippable Image Stage */}
            <div className="relative w-full flex flex-col items-center justify-center py-2 perspective-1000">
              <div
                onClick={() => setZoomFlipped((prev) => !prev)}
                className={`relative w-[280px] sm:w-[320px] aspect-[1/1.58] transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-style-3d cursor-pointer select-none rounded-2xl shadow-xl hover:shadow-2xl ${
                  zoomFlipped ? 'rotate-y-180' : ''
                }`}
                title="Click card to flip side"
              >
                {/* Modal Front Face */}
                <div className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-md border border-slate-300 bg-white group">
                  <img
                    src={frontImageUrl}
                    alt="Zoomed Student ID Front"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  {/* Subtle glossy sheen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-60 transition duration-300" />

                  {/* Corner Badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>FRONT SIDE</span>
                  </div>
                </div>

                {/* Modal Back Face */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden shadow-md border border-slate-300 bg-white group">
                  <img
                    src={backImageUrl}
                    alt="Zoomed Student ID Back"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  {/* Subtle glossy sheen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-60 transition duration-300" />

                  {/* Corner Badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>BACK SIDE</span>
                  </div>
                </div>
              </div>

              {/* Tap to flip hint */}
              <span className="text-[11px] text-on-surface-variant/75 mt-3 select-none flex items-center gap-1.5">
                <RotateCw className="w-3 h-3 text-secondary" />
                Click card or use button above to flip side
              </span>
            </div>

            {/* Modal Footer */}
            <div className="w-full flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/40 mt-2">
              <span>
                Viewing: <strong className="text-primary uppercase font-mono font-bold">{zoomFlipped ? 'back' : 'front'} side</strong>
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
