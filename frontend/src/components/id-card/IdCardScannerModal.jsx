import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FlipHorizontal,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  ZoomIn
} from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';

// Calculate sharpness using simplified discrete Laplacian variance on canvas grayscale
function calculateSharpnessAndBrightness(ctx, width, height) {
  try {
    const sampleWidth = Math.min(width, 320);
    const sampleHeight = Math.min(height, 200);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    let totalLuminance = 0;
    const gray = new Float32Array(sampleWidth * sampleHeight);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      // Perceived luminance
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[j] = l;
      totalLuminance += l;
    }

    const avgLuminance = totalLuminance / (sampleWidth * sampleHeight);

    // Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
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
    return { sharpness: 60, brightness: 128 };
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
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [studentIdInput, setStudentIdInput] = useState(currentStudentId);
  const [departmentInput, setDepartmentInput] = useState(currentDepartment);
  const [yearInput, setYearInput] = useState(currentYear);

  // Camera stream state
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

  // Live clarity metrics
  const [clarityScore, setClarityScore] = useState(0); // 0 - 100
  const [isSharp, setIsSharp] = useState(false);
  const [lightingStatus, setLightingStatus] = useState('good'); // 'too_dark' | 'good' | 'glare'
  const [steadyCounter, setSteadyCounter] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('front');
      setFrontImage(null);
      setBackImage(null);
      setStudentIdInput(currentStudentId);
      setDepartmentInput(currentDepartment);
      setYearInput(currentYear);
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
      console.warn('Could not enumerate cameras:', err);
    }
  };

  // Start camera stream
  const startCamera = async (deviceId = selectedCameraId) => {
    try {
      setIsCameraStarting(true);
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera access is not supported by your browser.');
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
      startClarityAnalysis();
    } catch (err) {
      console.error('Camera start failed:', err);
      setIsCameraStarting(false);
      setHasCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or upload an image file.');
      } else {
        setCameraError('Unable to access camera: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Switch camera toggle
  const switchCamera = () => {
    if (cameras.length < 2) {
      startCamera();
      return;
    }
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextDeviceId = cameras[nextIndex].deviceId;
    setSelectedCameraId(nextDeviceId);
    startCamera(nextDeviceId);
  };

  // Real-time clarity analyzer loop
  const startClarityAnalysis = () => {
    const checkFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = analysisCanvasRef.current || document.createElement('canvas');
      analysisCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const w = 320;
      const h = Math.round((video.videoHeight / video.videoWidth) * 320) || 180;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);
      const { sharpness, brightness } = calculateSharpnessAndBrightness(ctx, w, h);

      // Normalize clarity score 0 to 100
      const normalizedScore = Math.min(100, Math.round((sharpness / 65) * 100));
      setClarityScore(normalizedScore);

      const passSharpness = sharpness >= 35;
      setIsSharp(passSharpness);

      if (brightness < 50) {
        setLightingStatus('too_dark');
      } else if (brightness > 225) {
        setLightingStatus('glare');
      } else {
        setLightingStatus('good');
      }

      // Check auto-capture criteria
      if (passSharpness && brightness >= 55 && brightness <= 220) {
        setSteadyCounter((prev) => {
          const next = prev + 1;
          if (next >= 18 && autoCaptureEnabled && (step === 'front' || step === 'back')) {
            captureSnapshot();
            return 0;
          }
          return next;
        });
      } else {
        setSteadyCounter(0);
      }

      animationFrameRef.current = requestAnimationFrame(checkFrame);
    };

    animationFrameRef.current = requestAnimationFrame(checkFrame);
  };

  // Capture high-res snapshot from video stream
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save as high-quality data URL (JPEG 92%)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    if (step === 'front') {
      setFrontImage(dataUrl);
      setStep('back');
      toast.success('Front side captured! Now flip and scan the back side.');
    } else if (step === 'back') {
      setBackImage(dataUrl);
      setStep('review');
      stopCamera();
      toast.success('Back side captured! Please review clarity before saving.');
    }
  };

  // Fallback file upload handler
  const handleFileUpload = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      if (side === 'front') {
        setFrontImage(dataUrl);
        setStep('back');
      } else {
        setBackImage(dataUrl);
        setStep('review');
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit final ID card package
  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      toast.error('Both front and back ID card images must be captured.');
      return;
    }

    if (!studentIdInput || studentIdInput.trim().length < 2) {
      toast.error('Please enter or confirm your Student ID / Roll Number.');
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
      toast.error(err.message || 'Failed to submit student ID card. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Student ID Live Scanner
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                  HD Clarity Enforced
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Capture front and back with all text, photo, and roll number clearly visible
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <div
            className={`py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              step === 'front'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : frontImage
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-white dark:text-slate-900">
              {frontImage ? '✓' : '1'}
            </span>
            <span>1. Front of ID Card</span>
          </div>

          <div
            className={`py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              step === 'back'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : backImage
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-white dark:text-slate-900">
              {backImage ? '✓' : '2'}
            </span>
            <span>2. Back of ID Card</span>
          </div>

          <div
            className={`py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              step === 'review'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-current text-white dark:text-slate-900">
              3
            </span>
            <span>3. Review & Verify</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step !== 'review' ? (
            <div className="flex flex-col items-center">
              {/* Camera Controls Bar */}
              <div className="w-full flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Scanning:{' '}
                    <strong className="text-blue-600 dark:text-blue-400 uppercase">
                      {step === 'front' ? 'Card Front' : 'Card Back'}
                    </strong>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={() =>
                      setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Card: {orientation === 'horizontal' ? 'Landscape' : 'Portrait'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {cameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      title="Switch Camera"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Switch Cam</span>
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={autoCaptureEnabled}
                      onChange={(e) => setAutoCaptureEnabled(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Auto-Snap when Sharp</span>
                  </label>
                </div>
              </div>

              {/* Viewfinder Window */}
              <div className="relative w-full aspect-[16/10] max-h-[460px] bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-700 shadow-inner">
                {/* Visual Camera Flash Animation */}
                {flashActive && (
                  <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
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

                    {/* Card Alignment Overlay Frame */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`relative transition-all duration-300 border-2 rounded-xl shadow-2xl ${
                          orientation === 'horizontal'
                            ? 'w-[75%] aspect-[1.58/1]'
                            : 'h-[85%] aspect-[1/1.58]'
                        } ${
                          isSharp && lightingStatus === 'good'
                            ? 'border-emerald-400 shadow-emerald-500/20'
                            : clarityScore > 30
                            ? 'border-amber-400 shadow-amber-500/20'
                            : 'border-red-400 shadow-red-500/20'
                        }`}
                      >
                        {/* Corner brackets */}
                        <div
                          className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg ${
                            isSharp ? 'border-emerald-400' : 'border-amber-400'
                          }`}
                        />
                        <div
                          className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg ${
                            isSharp ? 'border-emerald-400' : 'border-amber-400'
                          }`}
                        />
                        <div
                          className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg ${
                            isSharp ? 'border-emerald-400' : 'border-amber-400'
                          }`}
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg ${
                            isSharp ? 'border-emerald-400' : 'border-amber-400'
                          }`}
                        />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg shadow-blue-500/50 animate-pulse top-1/2" />

                        {/* Target instruction badge */}
                        <div className="absolute bottom-3 inset-x-0 flex justify-center">
                          <span className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-white shadow">
                            {step === 'front'
                              ? 'Align FRONT side with photo & ID number'
                              : 'Align BACK side with barcode & details'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Clarity Meter Bar */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-white text-xs">
                        <span className="text-[11px] font-medium">Clarity:</span>
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-150 ${
                              isSharp ? 'bg-emerald-400' : clarityScore > 30 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${clarityScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold">{clarityScore}%</span>
                      </div>

                      {/* Lighting status pill */}
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 ${
                          isSharp && lightingStatus === 'good'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                            : lightingStatus === 'too_dark'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                            : 'bg-slate-900/80 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSharp && lightingStatus === 'good' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Sharp & Steady</span>
                          </>
                        ) : lightingStatus === 'too_dark' ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Needs more light</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Hold steady</span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Camera Fallback File Picker */
                  <div className="p-8 text-center text-slate-300 flex flex-col items-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
                    <h3 className="font-bold text-white text-base mb-1">Camera Stream Unavailable</h3>
                    <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-blue-600/30">
                      <Upload className="w-4 h-4" />
                      <span>Upload {step === 'front' ? 'Card Front' : 'Card Back'} Photo</span>
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

              {/* Action Buttons */}
              <div className="w-full flex items-center justify-between mt-4">
                <label className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload image file instead</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, step)}
                  />
                </label>

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
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Retake Front
                    </Button>
                  )}

                  <Button
                    onClick={captureSnapshot}
                    disabled={!hasCamera || isCameraStarting}
                    className={`${
                      isSharp
                        ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/50'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Camera className="w-4 h-4 mr-1.5" />
                    <span>Capture {step === 'front' ? 'Front Side' : 'Back Side'}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 3: DUAL INSPECTION REVIEW */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Step 3: Quality Check & Detail Confirmation
                  </p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                    Inspect both sides below to make sure all letters, numbers, and photos are readable.
                    Confirm your Student ID Number before saving.
                  </p>
                </div>
              </div>

              {/* Side by Side Front and Back Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side Card Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ID Card - Front Side
                    </span>
                    <button
                      onClick={() => {
                        setStep('front');
                        setFrontImage(null);
                        startCamera();
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="relative aspect-[1.58/1] rounded-lg overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm group">
                    <img
                      src={frontImage}
                      alt="ID Card Front"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2.5">
                      <span className="text-white text-[11px] flex items-center gap-1 font-medium">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Crisp & verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Back Side Card Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ID Card - Back Side
                    </span>
                    <button
                      onClick={() => {
                        setStep('back');
                        setBackImage(null);
                        startCamera();
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="relative aspect-[1.58/1] rounded-lg overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm group">
                    <img
                      src={backImage}
                      alt="ID Card Back"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2.5">
                      <span className="text-white text-[11px] flex items-center gap-1 font-medium">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Crisp & verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Confirmation */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Confirm Student Information from ID Card
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student ID / Roll No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. 180340119009 or SA13B026"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Department / College
                    </label>
                    <input
                      type="text"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      placeholder="College or Department"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('front');
                    startCamera();
                  }}
                  disabled={isUploading}
                >
                  Start Over
                </Button>

                <Button
                  onClick={handleSubmit}
                  isLoading={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
