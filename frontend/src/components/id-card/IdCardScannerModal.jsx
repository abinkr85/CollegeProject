import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FlipHorizontal,
  Info,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCcw,
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

// Dynamic import or fallback for tesseract
let tesseractWorkerPromise = null;
async function runOcrOnImage(imageSrc) {
  try {
    const { createWorker } = await import('tesseract.js');
    if (!tesseractWorkerPromise) {
      tesseractWorkerPromise = (async () => {
        const worker = await createWorker('eng');
        return worker;
      })();
    }
    const worker = await tesseractWorkerPromise;
    const ret = await worker.recognize(imageSrc);
    return ret.data.text || '';
  } catch (err) {
    console.warn('Client OCR notice:', err);
    return '';
  }
}

// Discrete Laplacian edge sharpness calculation on canvas
function calculateSharpness(ctx, width, height) {
  try {
    const sampleWidth = Math.min(width, 240);
    const sampleHeight = Math.min(height, 360);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    let totalLuminance = 0;
    const gray = new Float32Array(sampleWidth * sampleHeight);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[j] = l;
      totalLuminance += l;
    }

    const avgLuminance = totalLuminance / (sampleWidth * sampleHeight);

    let sumLaplacian = 0;
    let sumLaplacianSq = 0;
    let count = 0;

    for (let y = 1; y < sampleHeight - 1; y += 2) {
      for (let x = 1; x < sampleWidth - 1; x += 2) {
        const idx = y * sampleWidth + x;
        const lap =
          gray[idx - sampleWidth] +
          gray[idx + sampleWidth] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];

        sumLaplacian += lap;
        sumLaplacianSq += lap * lap;
        count++;
      }
    }

    const meanLaplacian = sumLaplacian / count;
    const variance = sumLaplacianSq / count - meanLaplacian * meanLaplacian;

    return {
      sharpness: Math.round(variance),
      brightness: Math.round(avgLuminance)
    };
  } catch {
    return { sharpness: 50, brightness: 120 };
  }
}

export default function IdCardScannerModal({
  isOpen,
  onClose,
  onSuccess,
  currentStudentId = '',
  currentDepartment = '',
  currentYear = ''
}) {
  const [step, setStep] = useState('front'); // 'front' | 'back' | 'review'
  // Default to portrait (vertical) since real Harsha ID cards are vertical!
  const [orientation, setOrientation] = useState('vertical'); // 'vertical' | 'horizontal'

  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // Extracted and form values
  const [studentIdInput, setStudentIdInput] = useState(currentStudentId);
  const [nameInput, setNameInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState(currentDepartment);
  const [batchInput, setBatchInput] = useState('');
  const [yearInput, setYearInput] = useState(currentYear);
  const [bloodGroupInput, setBloodGroupInput] = useState('');
  const [emergencyPhoneInput, setEmergencyPhoneInput] = useState('');

  // OCR state
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [extractedData, setExtractedData] = useState(null);

  // Camera & Shutter state
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);

  // Live quality metrics
  const [clarityScore, setClarityScore] = useState(65);
  const [isSteady, setIsSteady] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('front');
      setFrontImage(null);
      setBackImage(null);
      setStudentIdInput(currentStudentId);
      setDepartmentInput(currentDepartment);
      setYearInput(currentYear);
      setExtractedData(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // Discover camera devices
  const discoverCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        const backCam = videoDevices.find((d) =>
          /back|rear|environment/i.test(d.label)
        );
        setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not list cameras:', err);
    }
  };

  // Start HD camera stream
  const startCamera = async (deviceId = selectedCameraId) => {
    try {
      setIsCameraStarting(true);
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera is not supported on this browser.');
        setIsCameraStarting(false);
        return;
      }

      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' })
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasCamera(true);
      setIsCameraStarting(false);
      await discoverCameras();
      startClarityLoop();
    } catch (err) {
      console.error('Camera start error:', err);
      setIsCameraStarting(false);
      setHasCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please click "Upload Photo" below to upload your card directly.');
      } else {
        setCameraError('Camera error: ' + (err.message || 'Please use image upload fallback.'));
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Switch camera toggle
  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextDeviceId = cameras[(currentIndex + 1) % cameras.length].deviceId;
    setSelectedCameraId(nextDeviceId);
    startCamera(nextDeviceId);
  };

  // Real-time clarity check
  const startClarityLoop = () => {
    const loop = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;
      const canvas = analysisCanvasRef.current || document.createElement('canvas');
      analysisCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const w = 240;
      const h = Math.round((video.videoHeight / video.videoWidth) * 240) || 320;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);
      const { sharpness } = calculateSharpness(ctx, w, h);

      // Map score smoothly (30 to 70 range)
      const score = Math.min(100, Math.max(25, Math.round((sharpness / 50) * 100)));
      setClarityScore(score);
      setIsSteady(score >= 45);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  // Take snapshot from video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Visual camera shutter flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    processCapturedImage(dataUrl, step);
  };

  // Shutter with optional 3-sec timer
  const handleShutterClick = (useTimer = false) => {
    if (useTimer) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            takeSnapshot();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      takeSnapshot();
    }
  };

  // Process captured image and run OCR pattern extraction
  const processCapturedImage = async (dataUrl, currentStep) => {
    if (currentStep === 'front') {
      setFrontImage(dataUrl);
      setStep('back');
      toast.success('Front side captured! Now scan the back side.');

      // Run background OCR extraction on Front side
      setIsProcessingOcr(true);
      setOcrStatusText('Reading card details (Roll No, Name, Course)...');

      try {
        const text = await runOcrOnImage(dataUrl);
        const parsed = parseIdCardText(text);
        if (parsed.studentIdNumber) {
          setStudentIdInput(parsed.studentIdNumber);
        }
        if (parsed.name) {
          setNameInput(parsed.name);
        }
        if (parsed.department) {
          setDepartmentInput(parsed.department);
        }
        if (parsed.batch) {
          setBatchInput(parsed.batch);
        }
        if (parsed.bloodGroup) {
          setBloodGroupInput(parsed.bloodGroup);
        }
        if (parsed.validUpto) {
          // If valid upto 2026 and current year is 2026, or estimate
          setYearInput(parsed.validUpto.includes('2026') ? '3rd Year' : 'Current Year');
        }
        setExtractedData(parsed);
      } catch (err) {
        console.warn('OCR processing skipped:', err);
      } finally {
        setIsProcessingOcr(false);
      }
    } else if (currentStep === 'back') {
      setBackImage(dataUrl);
      setStep('review');
      stopCamera();
      toast.success('Both sides captured! Please review details.');

      // Run OCR on Back side to capture emergency contact / parent info
      try {
        const backText = await runOcrOnImage(dataUrl);
        const backParsed = parseIdCardText(backText);
        if (backParsed.emergencyContact) {
          setEmergencyPhoneInput(backParsed.emergencyContact);
        }
      } catch (err) {
        console.warn('Back OCR skipped:', err);
      }
    }
  };

  // File upload handler
  const handleFileUpload = (e, targetSide) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please choose a valid photo (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      processCapturedImage(dataUrl, targetSide);
    };
    reader.readAsDataURL(file);
  };

  // Final submission
  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      toast.error('Both front and back ID card images are required.');
      return;
    }

    if (!studentIdInput || studentIdInput.trim().length < 2) {
      toast.error('Please provide or confirm your Student ID / Roll Number (e.g. 23BC023).');
      return;
    }

    try {
      setIsUploading(true);
      await onSuccess({
        studentIdNumber: studentIdInput.trim(),
        frontImage,
        backImage,
        department: departmentInput,
        year: yearInput
      });
      setIsUploading(false);
      onClose();
    } catch (err) {
      setIsUploading(false);
      toast.error(err.message || 'Failed to save student ID. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Student ID Live Scanner
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Harsha Institutions Pattern Support
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-definition live scan for vertical & horizontal student identity cards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold select-none">
          <div
            className={`py-3 px-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              step === 'front'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20'
                : frontImage
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-current text-white dark:text-slate-900">
              {frontImage ? '✓' : '1'}
            </span>
            <span className="truncate">1. Front Side (Photo & ID)</span>
          </div>

          <div
            className={`py-3 px-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              step === 'back'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20'
                : backImage
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-current text-white dark:text-slate-900">
              {backImage ? '✓' : '2'}
            </span>
            <span className="truncate">2. Back Side (Emergency Info)</span>
          </div>

          <div
            className={`py-3 px-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              step === 'review'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-current text-white dark:text-slate-900">
              3
            </span>
            <span className="truncate">3. Review & Verify</span>
          </div>
        </div>

        {/* Modal Main View */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {step !== 'review' ? (
            <div className="flex flex-col items-center">
              {/* Controls Toolbar */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    Target:
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase">
                      {step === 'front' ? 'Card Front' : 'Card Back'}
                    </span>
                  </span>

                  {/* Orientation Switcher */}
                  <button
                    onClick={() =>
                      setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')
                    }
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
                    title="Change card framing orientation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Card Shape: <strong>{orientation === 'vertical' ? 'Vertical (Portrait)' : 'Horizontal (Landscape)'}</strong></span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {cameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                      title="Switch camera device"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Switch Camera</span>
                    </button>
                  )}

                  {/* Upload photo button in toolbar */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, step)}
                  />
                </div>
              </div>

              {/* Camera Viewfinder Box */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[460px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-700 shadow-2xl">
                {/* Visual Shutter Flash */}
                {flashActive && (
                  <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
                )}

                {/* Countdown Timer Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <span className="text-7xl font-extrabold text-white animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}

                {hasCamera ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Darkened Vignette Outside Card Frame */}
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                    {/* Target Card Reticle (Vertical or Horizontal) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`relative transition-all duration-300 rounded-2xl border-2 shadow-2xl ${
                          orientation === 'vertical'
                            ? 'h-[88%] aspect-[1/1.58] max-w-[310px]'
                            : 'w-[82%] aspect-[1.58/1] max-h-[300px]'
                        } ${
                          isSteady
                            ? 'border-emerald-400 ring-4 ring-emerald-500/20'
                            : 'border-blue-400 ring-4 ring-blue-500/20'
                        }`}
                      >
                        {/* Clear Cutout Window */}
                        <div className="absolute inset-0 bg-transparent" />

                        {/* Corner Reticle Brackets */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl border-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl border-emerald-400" />

                        {/* Harsha Portrait Card Overlay Visual Hints */}
                        {orientation === 'vertical' && step === 'front' && (
                          <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-60 text-white">
                            {/* Top: Institution name guide */}
                            <div className="h-6 border-b border-dashed border-white/40 flex items-center justify-center">
                              <span className="text-[9px] font-bold tracking-wider uppercase">HARSHA INSTITUTIONS</span>
                            </div>

                            {/* Middle: Photo & details silhouette */}
                            <div className="flex-1 flex items-center justify-between py-2">
                              <div className="space-y-1 w-3/5">
                                <div className="h-2 w-16 bg-white/30 rounded" />
                                <div className="h-2 w-28 bg-white/20 rounded" />
                                <div className="h-2 w-20 bg-white/20 rounded" />
                              </div>
                              <div className="w-16 h-20 border border-dashed border-white/60 rounded-md flex items-center justify-center bg-white/10">
                                <User className="w-6 h-6 text-white/50" />
                              </div>
                            </div>

                            {/* Bottom: Barcode and Roll No zone */}
                            <div className="h-8 border-t border-dashed border-white/40 flex flex-col items-center justify-center">
                              <span className="text-[8px] font-mono tracking-widest">||| 23BC023 |||</span>
                            </div>
                          </div>
                        )}

                        {/* Animated Laser Scanning Beam */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-500/60 animate-pulse top-1/2" />

                        {/* Card Instruction Badge */}
                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                          <span className="bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white shadow border border-slate-700">
                            {step === 'front'
                              ? 'Align FRONT side with photo & 23BC023 roll number'
                              : 'Align BACK side with emergency & guardian info'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Metric HUD */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-white text-xs">
                        <span className="text-[11px] font-medium text-slate-300">Clarity:</span>
                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              isSteady ? 'bg-emerald-400' : 'bg-blue-400'
                            }`}
                            style={{ width: `${clarityScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold">{clarityScore}%</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-white text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ready to capture</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* No Camera Fallback Dropzone */
                  <div className="p-8 text-center text-slate-300 flex flex-col items-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-amber-400 mb-2.5" />
                    <h3 className="font-bold text-white text-base mb-1">Upload Card Photo Directly</h3>
                    <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/30">
                      <Upload className="w-4 h-4" />
                      <span>Choose {step === 'front' ? 'Card Front' : 'Card Back'} Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, step)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Shutter & Controls Bottom Bar */}
              <div className="w-full flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose file from device</span>
                </button>

                {/* Shutter Center Controls */}
                <div className="flex items-center gap-3">
                  {step === 'back' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep('front');
                        setFrontImage(null);
                        startCamera();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Retake Front
                    </Button>
                  )}

                  {/* 3s Timer Shutter Option */}
                  <button
                    onClick={() => handleShutterClick(true)}
                    className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    title="Capture with 3-second timer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  {/* Instant Capture Shutter Button */}
                  <button
                    onClick={() => handleShutterClick(false)}
                    disabled={isCameraStarting}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/40 ring-4 ring-blue-500/20 active:scale-95 transition"
                    title="Capture Photo Now"
                  >
                    <Camera className="w-7 h-7 group-hover:scale-110 transition" />
                  </button>
                </div>

                <div className="w-28 text-right">
                  <span className="text-[11px] text-slate-400">
                    Step {step === 'front' ? '1 of 2' : '2 of 2'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 3: DUAL INSPECTION REVIEW & HARSHA PATTERN EXTRACTION */
            <div className="space-y-6 animate-fade-in">
              {/* OCR Status banner */}
              {isProcessingOcr ? (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div className="text-xs text-blue-900 dark:text-blue-200">
                    <p className="font-bold">{ocrStatusText}</p>
                    <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                      Extracting roll number, student name, and course automatically...
                    </p>
                  </div>
                </div>
              ) : extractedData?.studentIdNumber ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold">ID Details Detected Successfully!</p>
                    <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Recognized Roll No <strong>{extractedData.studentIdNumber}</strong> and auto-filled your profile fields. You can confirm or adjust them below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Inspect Both Sides Before Saving
                    </p>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                      Ensure your Roll Number (e.g. 23BC023), Photo, and Department are clearly visible.
                    </p>
                  </div>
                </div>
              )}

              {/* Front & Back Vertical Cards Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Front Side (Photo & Roll No)
                    </span>
                    <button
                      onClick={() => {
                        setStep('front');
                        setFrontImage(null);
                        startCamera();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="relative h-64 aspect-[1/1.58] rounded-xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-700 shadow-md">
                    <img
                      src={frontImage}
                      alt="ID Card Front"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Back Side */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Back Side (Emergency Contacts)
                    </span>
                    <button
                      onClick={() => {
                        setStep('back');
                        setBackImage(null);
                        startCamera();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="relative h-64 aspect-[1/1.58] rounded-xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-700 shadow-md">
                    <img
                      src={backImage}
                      alt="ID Card Back"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Form Confirmation with Harsha Patterns */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>Student ID Information</span>
                  {extractedData?.studentIdNumber && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Auto-detected
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student ID / Roll No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. 23BC023"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Found above barcode (e.g. 23BC023)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Course / Department
                    </label>
                    <input
                      type="text"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      placeholder="e.g. Bachelor of Computer Application"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      placeholder="e.g. 3rd Year"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Optional additional details from Harsha card */}
                {(batchInput || bloodGroupInput || emergencyPhoneInput) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                    {batchInput && (
                      <div className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-500">Batch: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{batchInput}</strong>
                      </div>
                    )}
                    {bloodGroupInput && (
                      <div className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-500">Blood Group: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{bloodGroupInput}</strong>
                      </div>
                    )}
                    {emergencyPhoneInput && (
                      <div className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-500">Emergency Ph: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{emergencyPhoneInput}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('front');
                    setFrontImage(null);
                    setBackImage(null);
                    startCamera();
                  }}
                  disabled={isUploading}
                >
                  Start Over
                </Button>

                <Button
                  onClick={handleSubmit}
                  isLoading={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Save & Verify Student ID
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
