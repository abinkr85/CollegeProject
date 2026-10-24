import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FlipHorizontal,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  X,
  ZoomIn
} from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import { parseIdCardText } from '../../utils/idCardParser';
import { scanAndCropIdCardApi } from '../../api/userApi';

// Lazy loader for OCR to keep mobile load instant & zero-lag
let tesseractWorkerPromise = null;
async function extractTextFromCard(imageSrc) {
  try {
    const { createWorker } = await import('tesseract.js');
    if (!tesseractWorkerPromise) {
      tesseractWorkerPromise = (async () => {
        const worker = await createWorker('eng');
        return worker;
      })();
    }
    const worker = await tesseractWorkerPromise;
    // Fast recognition without blocking
    const ret = await Promise.race([
      worker.recognize(imageSrc),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout')), 6000))
    ]);
    return ret?.data?.text || '';
  } catch (err) {
    console.warn('OCR background extract notice:', err?.message || err);
    return '';
  }
}

export default function IdCardScannerModal({
  isOpen,
  onClose,
  onSuccess,
  currentStudentId = '',
  currentName = '',
  currentPhone = '',
  currentDepartment = '',
  currentBatch = '',
  currentYear = '',
  currentValidUpto = '',
  currentEmergencyPhone = ''
}) {
  // Navigation: 'front' (1) -> 'back' (2) -> 'review' (3)
  const [step, setStep] = useState('front');

  // Captured card images
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontDetected, setFrontDetected] = useState(false);
  const [backDetected, setBackDetected] = useState(false);

  // Loading & status states
  const [isProcessingFront, setIsProcessingFront] = useState(false);
  const [isProcessingBack, setIsProcessingBack] = useState(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  // Step 3 Review Form Fields (All 7 Red-Highlighted details from Physical ID Card)
  const [studentIdInput, setStudentIdInput] = useState(currentStudentId || '');
  const [nameInput, setNameInput] = useState(currentName || '');
  const [phoneInput, setPhoneInput] = useState(currentPhone || '');
  const [departmentInput, setDepartmentInput] = useState(currentDepartment || '');
  const [batchInput, setBatchInput] = useState(currentBatch || '');
  const [yearInput, setYearInput] = useState(currentYear || '');
  const [validUptoInput, setValidUptoInput] = useState(currentValidUpto || '');
  const [emergencyPhoneInput, setEmergencyPhoneInput] = useState(currentEmergencyPhone || '');

  const [reviewSide, setReviewSide] = useState('front'); // 'front' | 'back'
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Hidden native file input refs (triggers native iOS / Android camera & gallery)
  const frontCameraRef = useRef(null);
  const frontGalleryRef = useRef(null);
  const backCameraRef = useRef(null);
  const backGalleryRef = useRef(null);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      setStep('front');
      setFrontImage(null);
      setBackImage(null);
      setFrontDetected(false);
      setBackDetected(false);
      setStudentIdInput(currentStudentId || '');
      setNameInput(currentName || '');
      setPhoneInput(currentPhone || '');
      setDepartmentInput(currentDepartment || 'Bachelor of Computer Application (BCA)');
      setBatchInput(currentBatch || '2023 - 2024');
      setYearInput(currentYear || '3rd Year');
      setValidUptoInput(currentValidUpto || '2026');
      setEmergencyPhoneInput(currentEmergencyPhone || '');
      setStatusNotice('');
      setReviewSide('front');
    }
  }, [
    isOpen,
    currentStudentId,
    currentName,
    currentPhone,
    currentDepartment,
    currentBatch,
    currentYear,
    currentValidUpto,
    currentEmergencyPhone
  ]);

  if (!isOpen) return null;

  // Process captured/selected file with Python OpenCV Service
  const handleFileSelected = (file, side) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please choose a valid ID card photo (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target.result;

      if (side === 'front') {
        setIsProcessingFront(true);
        setStatusNotice('🔍 Straightening & deskewing card edges...');
        try {
          const res = await scanAndCropIdCardApi({ image: rawDataUrl, orientation: 'vertical' });
          const finalUrl = res?.image || rawDataUrl;
          const detected = Boolean(res?.detected);
          setFrontImage(finalUrl);
          setFrontDetected(detected);
          setStatusNotice(detected ? '✓ 4-Corner Card Straightened!' : '✓ Card Photo Loaded');

          // Run background OCR on Front for Roll No, Name, Phone, Course, Batch & Validity
          setIsExtractingOcr(true);
          extractTextFromCard(finalUrl)
            .then((text) => {
              if (text) {
                const parsed = parseIdCardText(text);
                if (parsed.studentIdNumber) {
                  setStudentIdInput(parsed.studentIdNumber);
                  toast.success(`Detected Roll No: ${parsed.studentIdNumber}`);
                }
                if (parsed.name) {
                  setNameInput(parsed.name);
                }
                if (parsed.phone) {
                  setPhoneInput(parsed.phone);
                }
                if (parsed.department) {
                  setDepartmentInput(parsed.department);
                }
                if (parsed.batch) {
                  setBatchInput(parsed.batch);
                }
                if (parsed.validUpto) {
                  setValidUptoInput(parsed.validUpto);
                  setYearInput(parsed.validUpto.includes('2026') ? '3rd Year' : 'Current Year');
                }
              }
            })
            .finally(() => setIsExtractingOcr(false));
        } catch (err) {
          console.warn('OpenCV deskew fallback:', err);
          setFrontImage(rawDataUrl);
        } finally {
          setIsProcessingFront(false);
          setTimeout(() => setStatusNotice(''), 2500);
        }
      } else {
        setIsProcessingBack(true);
        setStatusNotice('🔍 Straightening & deskewing card edges...');
        try {
          const res = await scanAndCropIdCardApi({ image: rawDataUrl, orientation: 'vertical' });
          const finalUrl = res?.image || rawDataUrl;
          const detected = Boolean(res?.detected);
          setBackImage(finalUrl);
          setBackDetected(detected);
          setStatusNotice(detected ? '✓ 4-Corner Card Straightened!' : '✓ Card Photo Loaded');

          // Run background OCR on Back for Emergency Phone
          extractTextFromCard(finalUrl).then((text) => {
            if (text) {
              const parsed = parseIdCardText(text);
              if (parsed.emergencyPhone || parsed.emergencyContact) {
                setEmergencyPhoneInput(parsed.emergencyPhone || parsed.emergencyContact);
              }
            }
          });
        } catch (err) {
          console.warn('OpenCV deskew fallback:', err);
          setBackImage(rawDataUrl);
        } finally {
          setIsProcessingBack(false);
          setTimeout(() => setStatusNotice(''), 2500);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit verified ID Card payload to backend
  const handleFinalSubmit = async () => {
    if (!frontImage || !backImage) {
      toast.error('Both front and back ID card images are required.');
      return;
    }

    if (!studentIdInput || studentIdInput.trim().length < 2) {
      toast.error('Please confirm your Student Roll Number (e.g. 23BC023).');
      return;
    }

    try {
      setIsUploading(true);
      await onSuccess({
        studentIdNumber: studentIdInput.trim().toUpperCase(),
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        department: departmentInput.trim(),
        batch: batchInput.trim(),
        year: yearInput.trim(),
        validUpto: validUptoInput.trim(),
        emergencyPhone: emergencyPhoneInput.trim(),
        frontImage,
        backImage
      });
      setIsUploading(false);
      toast.success('Institutional Student ID successfully verified! 🛡️');
      onClose();
    } catch (err) {
      setIsUploading(false);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save student ID. Please try again.';
      toast.error(errorMsg);
    }
  };

  const handleCopyRollNo = () => {
    if (!studentIdInput) return;
    navigator.clipboard.writeText(studentIdInput);
    setCopiedId(true);
    toast.success(`Copied: ${studentIdInput}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in">
      {/* Hidden Native File Inputs */}
      {/* Front */}
      <input
        ref={frontCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'front');
          e.target.value = '';
        }}
      />
      <input
        ref={frontGalleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'front');
          e.target.value = '';
        }}
      />
      {/* Back */}
      <input
        ref={backCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'back');
          e.target.value = '';
        }}
      />
      <input
        ref={backGalleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'back');
          e.target.value = '';
        }}
      />

      {/* FULL-SCREEN CONTAINER (Mobile-Native full bleed, clean rounded box on desktop) */}
      <div className="relative w-full h-full sm:h-auto sm:max-w-xl sm:max-h-[92vh] bg-slate-900 border-0 sm:border sm:border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* COMPACT TOP NAVIGATION BAR */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center space-x-2.5">
            {step !== 'front' ? (
              <button
                type="button"
                onClick={() => setStep(step === 'review' ? 'back' : 'front')}
                className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Previous Step"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-2 bg-blue-600/90 text-white rounded-xl shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Student ID Verification
              </h2>
              <p className="text-[11px] text-slate-400">
                {step === 'front'
                  ? 'Step 1 of 3: Front Side'
                  : step === 'back'
                  ? 'Step 2 of 3: Back Side'
                  : 'Step 3 of 3: Confirm Details'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODERN 3-STEP SEGMENTED PROGRESS BAR */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-[11px] sm:text-xs font-semibold select-none bg-slate-950/60 shrink-0">
          <button
            type="button"
            onClick={() => setStep('front')}
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'front'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : frontImage
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                frontImage ? 'bg-emerald-500 text-slate-950' : step === 'front' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {frontImage ? '✓' : '1'}
            </span>
            <span>Front</span>
          </button>

          <button
            type="button"
            disabled={!frontImage}
            onClick={() => frontImage && setStep('back')}
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'back'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : backImage
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                backImage ? 'bg-emerald-500 text-slate-950' : step === 'back' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {backImage ? '✓' : '2'}
            </span>
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={!frontImage || !backImage}
            onClick={() => frontImage && backImage && setStep('review')}
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'review'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>
            <span>Verify</span>
          </button>
        </div>

        {/* MAIN INTERACTIVE BODY (Scrollable on small mobile screens) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between">
          
          {/* STEP 1: FRONT SIDE CAPTURE */}
          {step === 'front' && (
            <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Front Side of ID Card
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Align the front of your student ID showing your <strong>Photo</strong>, <strong>Roll No (e.g. 23BC023)</strong>, and <strong>Barcode</strong>.
                </p>
              </div>

              {/* CARD PREVIEW / CAPTURE FRAME */}
              <div className="flex items-center justify-center py-1">
                <div className="relative w-full max-w-[260px] aspect-[1/1.58] rounded-2xl border-2 border-dashed border-blue-500/50 bg-slate-950 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-3 transition-all duration-300">
                  {isProcessingFront ? (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      <span className="text-xs font-semibold text-blue-200">
                        Detecting & Deskewing Card...
                      </span>
                    </div>
                  ) : frontImage ? (
                    <>
                      <img
                        src={frontImage}
                        alt="ID Card Front"
                        className="w-full h-full object-contain rounded-xl"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-emerald-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Check className="w-3 h-3" />
                        <span>Front Saved</span>
                      </div>
                      {frontDetected && (
                        <div className="absolute bottom-2.5 inset-x-2 text-center">
                          <span className="bg-slate-900/90 text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/40 shadow backdrop-blur-sm">
                            ✓ 4-Corner Deskewed
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Blank Card Silhouette */
                    <div className="flex flex-col items-center justify-between h-full w-full py-3 text-slate-600 select-none">
                      <div className="w-full border-b border-slate-800 pb-1 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          HARSHA INSTITUTIONS
                        </span>
                      </div>
                      <div className="w-20 h-24 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <User className="w-10 h-10 opacity-40" />
                      </div>
                      <div className="space-y-1 w-full flex flex-col items-center">
                        <div className="h-2 w-28 bg-slate-800 rounded" />
                        <div className="h-2 w-20 bg-slate-800/80 rounded" />
                      </div>
                      <div className="w-full border-t border-slate-800 pt-1 text-center">
                        <span className="text-[8px] font-mono tracking-widest text-slate-500">
                          |||| 23BC023 ||||
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status / Deskew notification */}
              {statusNotice && (
                <div className="text-center">
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                    {statusNotice}
                  </span>
                </div>
              )}

              {/* ACTION BUTTONS (Thumb-friendly & responsive) */}
              <div className="space-y-2.5 pt-2">
                {!frontImage ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => frontCameraRef.current?.click()}
                      className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 transition"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Take Photo with Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => frontGalleryRef.current?.click()}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-98 transition"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Choose from Gallery</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => frontCameraRef.current?.click()}
                      className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retake Front</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('back')}
                      className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Next: Scan Back</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: BACK SIDE CAPTURE */}
          {step === 'back' && (
            <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Back Side of ID Card
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Flip your student card to scan <strong>Emergency Contact</strong>, parent information, and validity.
                </p>
              </div>

              {/* CARD PREVIEW / CAPTURE FRAME */}
              <div className="flex items-center justify-center py-1">
                <div className="relative w-full max-w-[260px] aspect-[1/1.58] rounded-2xl border-2 border-dashed border-blue-500/50 bg-slate-950 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-3 transition-all duration-300">
                  {isProcessingBack ? (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      <span className="text-xs font-semibold text-blue-200">
                        Detecting & Deskewing Back...
                      </span>
                    </div>
                  ) : backImage ? (
                    <>
                      <img
                        src={backImage}
                        alt="ID Card Back"
                        className="w-full h-full object-contain rounded-xl"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-emerald-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Check className="w-3 h-3" />
                        <span>Back Saved</span>
                      </div>
                      {backDetected && (
                        <div className="absolute bottom-2.5 inset-x-2 text-center">
                          <span className="bg-slate-900/90 text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/40 shadow backdrop-blur-sm">
                            ✓ 4-Corner Deskewed
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Blank Back Silhouette */
                    <div className="flex flex-col items-center justify-between h-full w-full py-4 text-slate-600 select-none">
                      <div className="w-full border-b border-slate-800 pb-1 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          STUDENT ADDRESS & EMERGENCY
                        </span>
                      </div>
                      <div className="space-y-2 w-full px-2">
                        <div className="h-2 w-full bg-slate-800 rounded" />
                        <div className="h-2 w-4/5 bg-slate-800 rounded" />
                        <div className="h-2 w-3/4 bg-slate-800/80 rounded" />
                        <div className="h-2 w-2/3 bg-slate-800/60 rounded" />
                      </div>
                      <div className="w-full border-t border-slate-800 pt-1 text-center">
                        <span className="text-[8px] font-medium text-slate-500">
                          Emergency No: 9448040825
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status / Deskew notification */}
              {statusNotice && (
                <div className="text-center">
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                    {statusNotice}
                  </span>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="space-y-2.5 pt-2">
                {!backImage ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => backCameraRef.current?.click()}
                      className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 transition"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Take Photo with Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => backGalleryRef.current?.click()}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-98 transition"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Choose from Gallery</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => backCameraRef.current?.click()}
                      className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retake Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('review')}
                      className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Continue to Verify</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW DETAILS (NO SQUISHED SIDE-BY-SIDE BOXES!) */}
          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              {/* Status Header */}
              {isExtractingOcr ? (
                <div className="bg-blue-950/40 border border-blue-800/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  <div className="text-xs text-blue-200">
                    <p className="font-bold">Extracting Student Information...</p>
                    <p className="text-blue-400 text-[11px]">
                      Analyzing roll number 23BC023 & course details.
                    </p>
                  </div>
                </div>
              ) : studentIdInput ? (
                <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold">Roll Number Detected!</p>
                      <p className="text-emerald-400 text-[11px]">
                        ID <strong>{studentIdInput}</strong> ({departmentInput || 'BCA'})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRollNo}
                    className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/50 transition"
                    title="Copy Roll No"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <p className="font-bold text-white">Review Cropped ID Card</p>
                    <p className="text-slate-400 text-[11px]">
                      Confirm your Roll Number before saving your verified credentials.
                    </p>
                  </div>
                </div>
              )}

              {/* FULL-WIDTH CARD PREVIEW WITH SEGMENTED SWITCHER (Solves squishing on mobile!) */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 flex flex-col items-center">
                {/* Segmented Front / Back Switcher */}
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setReviewSide('front')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        reviewSide === 'front'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewSide('back')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        reviewSide === 'back'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Back Side
                    </button>
                  </div>

                  {/* Retake Button for Active Side */}
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewSide === 'front') {
                        setStep('front');
                        frontCameraRef.current?.click();
                      } else {
                        setStep('back');
                        backCameraRef.current?.click();
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Retake {reviewSide === 'front' ? 'Front' : 'Back'}</span>
                  </button>
                </div>

                {/* Big Clean Card Preview (Aspect Ratio 1:1.58, NO SIDE-BY-SIDE SQUISHING!) */}
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="relative w-full max-w-[220px] aspect-[1/1.58] rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg cursor-zoom-in group"
                >
                  <img
                    src={reviewSide === 'front' ? frontImage : backImage}
                    alt={`ID Card ${reviewSide}`}
                    className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-102"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-medium text-white flex items-center gap-1 shadow">
                    <ZoomIn className="w-3 h-3 text-blue-400" />
                    <span>Inspect</span>
                  </div>
                </div>
              </div>

              {/* STUDENT ID INFORMATION FORM */}
              <div className="space-y-3.5 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Student Institutional Record
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                    Auto-Extracted from ID
                  </span>
                </div>

                {/* Row 1: Roll No & Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="studentIdInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Student ID / Roll No <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="studentIdInput"
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 23BC023"
                      className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Unique institutional ID (e.g. 23BC023).
                    </span>
                  </div>

                  <div>
                    <label htmlFor="nameInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Student Full Name
                    </label>
                    <input
                      id="nameInput"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value.toUpperCase())}
                      placeholder="e.g. ABIN K R"
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      As printed on physical ID card.
                    </span>
                  </div>
                </div>

                {/* Row 2: Department / Course & Batch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="departmentInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Course / Department
                    </label>
                    <input
                      id="departmentInput"
                      type="text"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      placeholder="Bachelor of Computer Application (BCA)"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="batchInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Batch
                    </label>
                    <input
                      id="batchInput"
                      type="text"
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value)}
                      placeholder="2023 - 2024"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Row 3: Academic Year & Valid Upto */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="yearInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Academic Year
                    </label>
                    <input
                      id="yearInput"
                      type="text"
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      placeholder="3rd Year"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="validUptoInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Valid Upto / Expiry
                    </label>
                    <input
                      id="validUptoInput"
                      type="text"
                      value={validUptoInput}
                      onChange={(e) => setValidUptoInput(e.target.value)}
                      placeholder="2026"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Row 4: Student Phone & Emergency Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="phoneInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Student Phone (Front)
                    </label>
                    <input
                      id="phoneInput"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="9947923223"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergencyPhoneInput" className="text-xs font-semibold text-slate-300 block mb-1">
                      Emergency No (Back)
                    </label>
                    <input
                      id="emergencyPhoneInput"
                      type="tel"
                      value={emergencyPhoneInput}
                      onChange={(e) => setEmergencyPhoneInput(e.target.value)}
                      placeholder="9448040825"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Your Roll Number will be checked against the database to guarantee uniqueness and prevent duplicate profiles.
                  </span>
                </div>
              </div>

              {/* STICKY BOTTOM SUBMIT BUTTON */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isUploading || !studentIdInput.trim()}
                  className="w-full py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Student ID...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Save Student ID</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL-RESOLUTION ZOOM INSPECT LIGHTBOX */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={reviewSide === 'front' ? frontImage : backImage}
            alt="Inspect Card"
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-2xl border-2 border-slate-700 shadow-2xl"
          />
          <span className="text-xs text-slate-400 mt-3">
            Showing {reviewSide === 'front' ? 'Front Side' : 'Back Side'} — Tap anywhere to dismiss
          </span>
        </div>
      )}
    </div>
  );
}
