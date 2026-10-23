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
  Zap,
  ZapOff,
  ZoomIn
} from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import { parseIdCardText } from '../../utils/idCardParser';

// Dynamic import or fallback for client-side OCR
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
    const sampleWidth = Math.min(width, 160);
    const sampleHeight = Math.min(height, 120);
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
  const stepRef = useRef('front');
  const [orientation, setOrientation] = useState('vertical'); // 'vertical' | 'horizontal'
  const [autoCapture, setAutoCapture] = useState(true); // Auto camera scan active by default
  const autoCaptureRef = useRef(true);

  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const frontImageRef = useRef(null);
  const backImageRef = useRef(null);
  const [stepNotice, setStepNotice] = useState('');

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

  // Live quality & auto-capture metrics
  const [isSteady, setIsSteady] = useState(false);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const reticleRef = useRef(null);

  const autoCaptureCounterRef = useRef(0);
  const warmupFramesRef = useRef(8); // Warmup frames to let camera exposure stabilize
  const isCapturingRef = useRef(false);
  const lastClarityCheckRef = useRef(0);

  // Sync stepRef with step
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Sync autoCaptureRef with autoCapture
  useEffect(() => {
    autoCaptureRef.current = autoCapture;
  }, [autoCapture]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      toast.dismiss();
      setStep('front');
      stepRef.current = 'front';
      setFrontImage(null);
      setBackImage(null);
      frontImageRef.current = null;
      backImageRef.current = null;
      setStepNotice('');
      setStudentIdInput(currentStudentId);
      setDepartmentInput(currentDepartment);
      setYearInput(currentYear);
      setExtractedData(null);
      setAutoCapture(true);
      autoCaptureRef.current = true;
      setAutoCaptureProgress(0);
      autoCaptureCounterRef.current = 0;
      warmupFramesRef.current = 8;
      isCapturingRef.current = false;
      lastClarityCheckRef.current = 0;
      startCamera();
    } else {
      stopCamera();
      frontImageRef.current = null;
      backImageRef.current = null;
      setStepNotice('');
      toast.dismiss();
    }
    return () => {
      stopCamera();
      toast.dismiss();
    };
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
        setCameraError('Camera permission was denied. You can upload your ID card photos directly below.');
      } else {
        setCameraError('Camera unavailable: ' + (err.message || 'Please use file upload.'));
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

  // Real-time clarity check & auto-capture loop
  const startClarityLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastClarityCheckRef.current = 0;

    const loop = (timestamp) => {
      if (stepRef.current === 'review' || !videoRef.current) {
        return;
      }

      if (videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Throttle sharpness calculation to every 120ms to prevent mobile CPU/thread stalling
      if (timestamp - lastClarityCheckRef.current >= 120) {
        lastClarityCheckRef.current = timestamp;

        const video = videoRef.current;
        const canvas = analysisCanvasRef.current || document.createElement('canvas');
        analysisCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const w = 160;
        const h = Math.round((video.videoHeight / video.videoWidth) * 160) || 120;
        canvas.width = w;
        canvas.height = h;

        ctx.drawImage(video, 0, 0, w, h);
        const { sharpness } = calculateSharpness(ctx, w, h);

        // Quality score: calibrated for steady ID alignment
        const score = Math.min(100, Math.max(20, Math.round((sharpness / 35) * 100)));

        // Camera warmup period to allow sensor exposure/focus to settle
        if (warmupFramesRef.current > 0) {
          warmupFramesRef.current -= 1;
        } else {
          const steady = score >= 35;
          setIsSteady((prev) => (prev !== steady ? steady : prev));

          // WhatsApp-style Auto Capture Logic
          if (autoCaptureRef.current && steady && !isCapturingRef.current && stepRef.current !== 'review') {
            autoCaptureCounterRef.current += 1;
            // 7 checks at 120ms = ~840ms of steady card alignment
            const pct = Math.min(100, Math.round((autoCaptureCounterRef.current / 7) * 100));
            setAutoCaptureProgress(pct);

            if (pct >= 100) {
              autoCaptureCounterRef.current = 0;
              setAutoCaptureProgress(0);
              takeSnapshot();
            }
          } else {
            if (autoCaptureCounterRef.current > 0) {
              autoCaptureCounterRef.current = Math.max(0, autoCaptureCounterRef.current - 1);
              const pct = Math.min(100, Math.round((autoCaptureCounterRef.current / 7) * 100));
              setAutoCaptureProgress(pct);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  /**
   * WhatsApp Document Scan: Crop out background room & save ONLY the card rectangle!
   */
  const takeSnapshot = () => {
    if (isCapturingRef.current) return;
    if (stepRef.current === 'review') return;
    if (stepRef.current === 'front' && frontImageRef.current) return;
    if (stepRef.current === 'back' && backImageRef.current) return;
    if (!videoRef.current || !containerRef.current || !reticleRef.current) return;
    isCapturingRef.current = true;

    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        isCapturingRef.current = false;
        return;
      }

      // Visual camera shutter flash & haptic feedback
      setFlashActive(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([50, 40, 50]); } catch (_) {}
      }
      setTimeout(() => setFlashActive(false), 180);

      const containerRect = containerRef.current.getBoundingClientRect();
      const reticleRect = reticleRef.current.getBoundingClientRect();

      const vWidth = video.videoWidth || 1920;
      const vHeight = video.videoHeight || 1080;

      // Calculate object-cover scale and offsets
      const videoAspect = vWidth / vHeight;
      const containerAspect = containerRect.width / containerRect.height;

      let renderedWidth, renderedHeight, offsetX = 0, offsetY = 0;

      if (videoAspect > containerAspect) {
        renderedHeight = containerRect.height;
        renderedWidth = containerRect.height * videoAspect;
        offsetX = (renderedWidth - containerRect.width) / 2;
      } else {
        renderedWidth = containerRect.width;
        renderedHeight = containerRect.width / videoAspect;
        offsetY = (renderedHeight - containerRect.height) / 2;
      }

      const scaleX = vWidth / renderedWidth;
      const scaleY = vHeight / renderedHeight;

      // Calculate crop rectangle strictly inside the video source
      const cropX = Math.max(0, Math.round(((reticleRect.left - containerRect.left) + offsetX) * scaleX));
      const cropY = Math.max(0, Math.round(((reticleRect.top - containerRect.top) + offsetY) * scaleY));
      const cropW = Math.min(vWidth - cropX, Math.round(reticleRect.width * scaleX));
      const cropH = Math.min(vHeight - cropY, Math.round(reticleRect.height * scaleY));

      // Target canvas: Card dimensions only (Background completely removed!)
      const canvas = document.createElement('canvas');
      const targetW = orientation === 'vertical' ? 760 : 1200;
      const targetH = orientation === 'vertical' ? 1200 : 760;

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Draw only the cropped reticle area (background discarded!)
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      // Apply smart contrast/brightness enhancement
      try {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const d = imgData.data;
        const contrast = 1.08;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < d.length; i += 4) {
          d[i] = factor * (d[i] - 128) + 128;
          d[i + 1] = factor * (d[i + 1] - 128) + 128;
          d[i + 2] = factor * (d[i + 2] - 128) + 128;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (_) {}

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const activeStep = stepRef.current;
      processCapturedImage(dataUrl, activeStep);
    } catch (err) {
      console.error('Take snapshot error:', err);
      isCapturingRef.current = false;
    }
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
    toast.dismiss();

    if (currentStep === 'front') {
      if (frontImageRef.current) return;
      frontImageRef.current = dataUrl;
      setFrontImage(dataUrl);
      setStep('back');
      stepRef.current = 'back';

      warmupFramesRef.current = 10;
      setStepNotice('✓ Front Captured! Align and scan Back Side');
      setTimeout(() => setStepNotice(''), 2500);

      // Keep auto-capture locked for 1.8s so user has time to flip card
      setTimeout(() => {
        isCapturingRef.current = false;
        autoCaptureCounterRef.current = 0;
      }, 1800);

      // Run background OCR extraction on Front side (cropped card)
      setIsProcessingOcr(true);
      setOcrStatusText('Scanning Roll No & Course details...');

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
          setYearInput(parsed.validUpto.includes('2026') ? '3rd Year' : 'Current Year');
        }
        setExtractedData(parsed);
      } catch (err) {
        console.warn('OCR processing notice:', err);
      } finally {
        setIsProcessingOcr(false);
      }
    } else if (currentStep === 'back') {
      if (backImageRef.current) return;
      backImageRef.current = dataUrl;
      setBackImage(dataUrl);
      setStep('review');
      stepRef.current = 'review';
      setStepNotice('');
      stopCamera();
      isCapturingRef.current = false;

      // Run OCR on Back side to capture emergency contact / parent info
      try {
        const backText = await runOcrOnImage(dataUrl);
        const backParsed = parseIdCardText(backText);
        if (backParsed.emergencyContact) {
          setEmergencyPhoneInput(backParsed.emergencyContact);
        }
      } catch (err) {
        console.warn('Back OCR notice:', err);
      }
    } else {
      isCapturingRef.current = false;
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
      toast.error('Please confirm your Student ID / Roll Number (e.g. 23BC023).');
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
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save student ID. Please try again.';
      toast.error(errorMsg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[92vh] bg-slate-900 border-0 sm:border sm:border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* COMPACT CLEAN HEADER (Optimized for Mobile) */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/90 text-white rounded-xl shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Student ID Scanner
              </h2>
              <p className="text-[11px] text-slate-400">
                {step === 'front' ? 'Step 1 of 2: Front Side' : step === 'back' ? 'Step 2 of 2: Back Side' : 'Step 3: Review Details'}
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

        {/* RESPONSIVE SEGMENTED STEP BAR (No Truncation) */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-[11px] sm:text-xs font-semibold select-none bg-slate-950/40 shrink-0">
          <div
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'front'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : frontImage
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-slate-950">
              {frontImage ? '✓' : '1'}
            </span>
            <span>Front Side</span>
          </div>

          <div
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'back'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : backImage
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-slate-950">
              {backImage ? '✓' : '2'}
            </span>
            <span>Back Side</span>
          </div>

          <div
            className={`py-2 px-1 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              step === 'review'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-slate-950">
              3
            </span>
            <span>Verify</span>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col justify-between">
          {step !== 'review' ? (
            <div className="flex-1 flex flex-col items-center justify-between">
              
              {/* VIEWFINDER CONTAINER */}
              <div
                ref={containerRef}
                className="relative w-full flex-1 min-h-[320px] max-h-[58vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl"
              >
                {/* Visual Camera Shutter Flash */}
                {flashActive && (
                  <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
                )}

                {/* In-viewfinder floating status badge */}
                {stepNotice && (
                  <div className="absolute top-12 inset-x-4 flex justify-center z-30 pointer-events-none animate-bounce">
                    <div className="bg-emerald-600/95 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 border border-emerald-300 backdrop-blur-md">
                      <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                      <span>{stepNotice}</span>
                    </div>
                  </div>
                )}

                {/* Countdown Timer Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
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

                    {/* Translucent Dark Mask Outside Reticle (WhatsApp Document Style) */}
                    <div className="absolute inset-0 bg-black/55 pointer-events-none" />

                    {/* CARD RETICLE CUTOUT (Aspect 1 : 1.58 Portrait) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                      <div
                        ref={reticleRef}
                        className={`relative transition-all duration-300 rounded-2xl border-2 shadow-2xl ${
                          orientation === 'vertical'
                            ? 'h-[92%] aspect-[1/1.58] max-w-[270px]'
                            : 'w-[88%] aspect-[1.58/1] max-h-[260px]'
                        } ${
                          isSteady
                            ? 'border-emerald-400 ring-4 ring-emerald-500/25'
                            : 'border-cyan-400/80 ring-2 ring-cyan-500/20'
                        }`}
                      >
                        {/* Clear Cutout */}
                        <div className="absolute inset-0 bg-transparent" />

                        {/* WhatsApp Document Scanning Corner Brackets */}
                        <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors ${isSteady ? 'border-emerald-400' : 'border-cyan-400'}`} />
                        <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors ${isSteady ? 'border-emerald-400' : 'border-cyan-400'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors ${isSteady ? 'border-emerald-400' : 'border-cyan-400'}`} />
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors ${isSteady ? 'border-emerald-400' : 'border-cyan-400'}`} />

                        {/* Animated Laser Scanning Beam */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/80 animate-pulse top-1/2" />

                        {/* Top Alignment Guide Title */}
                        <div className="absolute top-2 inset-x-0 flex justify-center">
                          <span className="bg-slate-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-slate-700/80 shadow">
                            {step === 'front' ? 'ALIGN FRONT (PHOTO & 23BC023)' : 'ALIGN BACK (EMERGENCY NO)'}
                          </span>
                        </div>

                        {/* Auto-Capture Progress Bar / Status Pill */}
                        <div className="absolute bottom-2 inset-x-0 flex justify-center px-2">
                          {autoCapture ? (
                            <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-slate-700 shadow flex items-center gap-1.5">
                              {autoCaptureProgress > 0 ? (
                                <>
                                  <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-400 transition-all duration-75"
                                      style={{ width: `${autoCaptureProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-emerald-400 font-mono text-[10px]">
                                    Capturing...
                                  </span>
                                </>
                              ) : isSteady ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Hold still...
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  Fit card in frame
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-slate-950/85 px-3 py-1 rounded-full text-[10px] font-semibold text-slate-300 border border-slate-700">
                              Tap shutter to capture
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SLEEK FLOATING TOP HUD (Mobile-friendly pills) */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-20 text-xs">
                      {/* Auto Capture Toggle */}
                      <button
                        onClick={() => {
                          const nextVal = !autoCapture;
                          setAutoCapture(nextVal);
                          autoCaptureRef.current = nextVal;
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-semibold border transition ${
                          autoCapture
                            ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                            : 'bg-slate-950/80 border-slate-700 text-slate-400'
                        }`}
                        title="Toggle automatic capture when steady"
                      >
                        {autoCapture ? <Zap className="w-3 h-3 text-emerald-400" /> : <ZapOff className="w-3 h-3" />}
                        <span>Auto {autoCapture ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Right icons: Flip camera, Orientation, Upload */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')}
                          className="p-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md"
                          title="Switch portrait/landscape orientation"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {cameras.length > 1 && (
                          <button
                            onClick={switchCamera}
                            className="p-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md"
                            title="Switch front/rear camera"
                          >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, step)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* No Camera Fallback */
                  <div className="p-6 text-center text-slate-300 flex flex-col items-center max-w-sm">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <h3 className="font-bold text-white text-sm mb-1">Camera Permission Needed</h3>
                    <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition">
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

              {/* BOTTOM CONTROLS (Ergonomic for Thumbs) */}
              <div className="w-full flex items-center justify-between px-2 pt-3 shrink-0">
                <div className="w-24">
                  {step === 'back' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('front');
                        stepRef.current = 'front';
                        setFrontImage(null);
                        frontImageRef.current = null;
                        setStepNotice('');
                        startCamera();
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Front</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Gallery</span>
                    </button>
                  )}
                </div>

                {/* Tactile Shutter Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleShutterClick(true)}
                    className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="3-second timer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleShutterClick(false)}
                    disabled={isCameraStarting}
                    className="group relative flex items-center justify-center w-15 h-15 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/40 ring-4 ring-blue-500/20 active:scale-95 transition"
                    title="Capture ID Card Now"
                  >
                    <Camera className="w-6 h-6 group-hover:scale-110 transition" />
                  </button>
                </div>

                <div className="w-24 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {step === 'front' ? '1 of 2' : '2 of 2'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 3: REVIEW & VERIFY SCREEN */
            <div className="space-y-4 animate-fade-in">
              {/* OCR Status banner */}
              {isProcessingOcr ? (
                <div className="bg-blue-950/40 border border-blue-800 p-3 rounded-xl flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  <div className="text-xs text-blue-200">
                    <p className="font-bold">{ocrStatusText}</p>
                    <p className="text-blue-400 text-[11px]">
                      Extracting roll number 23BC023 & course details...
                    </p>
                  </div>
                </div>
              ) : extractedData?.studentIdNumber ? (
                <div className="bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-xs text-emerald-200">
                    <p className="font-bold">Roll Number Auto-Detected!</p>
                    <p className="text-emerald-400 text-[11px]">
                      Recognized Roll No <strong>{extractedData.studentIdNumber}</strong> ({extractedData.department || 'BCA'}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <p className="font-bold text-white">Review Cropped ID Card</p>
                    <p className="text-slate-400 text-[11px]">
                      Background removed. Please confirm your Roll Number (e.g. 23BC023) before saving.
                    </p>
                  </div>
                </div>
              )}

              {/* Cropped Front & Back Preview Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Front */}
                <div className="border border-slate-800 rounded-xl p-2.5 bg-slate-950/50 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Front Side
                    </span>
                    <button
                      onClick={() => {
                        setStep('front');
                        stepRef.current = 'front';
                        setFrontImage(null);
                        frontImageRef.current = null;
                        setStepNotice('');
                        startCamera();
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Retake
                    </button>
                  </div>
                  <div className="relative h-44 sm:h-52 aspect-[1/1.58] rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shadow">
                    <img
                      src={frontImage}
                      alt="ID Card Front"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Back */}
                <div className="border border-slate-800 rounded-xl p-2.5 bg-slate-950/50 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Back Side
                    </span>
                    <button
                      onClick={() => {
                        setStep('back');
                        stepRef.current = 'back';
                        setBackImage(null);
                        backImageRef.current = null;
                        setStepNotice('');
                        startCamera();
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Retake
                    </button>
                  </div>
                  <div className="relative h-44 sm:h-52 aspect-[1/1.58] rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shadow">
                    <img
                      src={backImage}
                      alt="ID Card Back"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Form Confirmation */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Student ID Information
                  </span>
                  {extractedData?.studentIdNumber && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Auto-detected
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Student ID / Roll No <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. 23BC023"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Found above barcode (e.g. 23BC023)</p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Course / Department
                    </label>
                    <input
                      type="text"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      placeholder="e.g. Bachelor of Computer Application (BCA)"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      placeholder="e.g. 3rd Year"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Emergency Phone
                    </label>
                    <input
                      type="text"
                      value={emergencyPhoneInput}
                      onChange={(e) => setEmergencyPhoneInput(e.target.value)}
                      placeholder="e.g. 9448040825"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('front');
                    stepRef.current = 'front';
                    setFrontImage(null);
                    setBackImage(null);
                    frontImageRef.current = null;
                    backImageRef.current = null;
                    setStepNotice('');
                    startCamera();
                  }}
                  disabled={isUploading}
                  className="text-xs"
                >
                  Start Over
                </Button>

                <Button
                  onClick={handleSubmit}
                  isLoading={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 text-xs shadow-lg shadow-emerald-600/30"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
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
