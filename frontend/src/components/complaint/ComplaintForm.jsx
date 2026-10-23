import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useSubmitComplaint } from '../../hooks/useComplaints';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, HelpCircle, CloudUpload, X, ArrowRight, GraduationCap, AlertCircle } from 'lucide-react';

const complaintSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000, 'Description cannot exceed 5000 characters'),
  category: z.string().optional(),
  image: z.instanceof(FileList).optional()
});

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 5 * 1024 * 1024;

function sanitizeText(value) {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

function validateImage(file) {
  if (!file) return null;
  if (!allowedTypes.has(file.type)) return 'Only JPEG, PNG, and WebP images are allowed.';
  if (file.size > maxFileSize) return 'Image size must be 5MB or below.';
  return null;
}

function AutoClassifiedField({ id, label }) {
  return (
    <div className="space-y-1.5">
      <span id={`${id}-label`} className="label-base text-[#0a1422] font-semibold !mb-0">{label}</span>
      <div
        id={id}
        aria-labelledby={`${id}-label`}
        className="h-[46px] w-full rounded-xl border border-outline-variant/60 bg-surface-container-low/50 px-3.5 text-on-surface shadow-sm flex items-center gap-2.5 cursor-not-allowed"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 text-sm font-semibold leading-tight text-on-surface/80 truncate">
          Auto-detected by AI
        </span>
      </div>
    </div>
  );
}

export default function ComplaintForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const mutation = useSubmitComplaint();

  const isProfileIncomplete = !user?.department || !user?.year;
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      image: undefined
    }
  });
  const imageField = register('image');

  const imageFile = watch('image')?.[0] || null;
  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function assignFile(file) {
    const imageError = validateImage(file);
    if (imageError) {
      setError('image', { type: 'manual', message: imageError });
      return;
    }

    const transfer = new DataTransfer();
    if (file) {
      transfer.items.add(file);
    }
    clearErrors('image');
    setValue('image', transfer.files, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(values) {
    if (isProfileIncomplete) {
      toast.error('You must complete your Academic Department and Current Year before filing a complaint.');
      navigate('/settings');
      return;
    }

    const imageError = validateImage(values.image?.[0]);
    if (imageError) {
      setError('image', { type: 'manual', message: imageError });
      return;
    }

    const formData = new FormData();
    formData.append('title', sanitizeText(values.title));
    formData.append('description', sanitizeText(values.description));
    if (values.category && values.category.trim()) {
      formData.append('category', values.category.trim());
    }
    if (values.image?.[0]) {
      formData.append('image', values.image[0]);
    }

    try {
      await mutation.mutateAsync(formData);
      toast.success('Complaint submitted successfully. The admin team will review it and update the status.');
      reset();
      navigate('/history');
    } catch {
      // Error toast is handled centrally in the mutation hook.
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Profile Incomplete Blocking Banner */}
      {isProfileIncomplete && (
        <div className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <GraduationCap size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">
                Please Complete Your Profile
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                Please select your college and current year in Settings before filing a complaint.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="shrink-0 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>Update in Settings</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Form Area */}
      <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 relative z-10">
          <div>
            <label className="label-base text-[#0a1422] font-semibold" htmlFor="title">Complaint Title *</label>
            <input
              type="text"
              id="title"
              placeholder="Example: Water leak near Block A"
              className={`input-base ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="category" className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-[#0a1422] uppercase tracking-wider !mb-0">
                <span>Category</span>
                <span className="text-[11px] font-normal text-secondary flex items-center gap-1 shrink-0 normal-case tracking-normal">
                  <Sparkles size={12} /> AI auto-classifies
                </span>
              </label>
              <select
                id="category"
                {...register('category')}
                className="select-base"
              >
                <option value="">✨ Auto-detect with AI (Recommended)</option>
                <option value="Electrical">⚡ Electrical & Power</option>
                <option value="Plumbing">🚰 Plumbing & Water</option>
                <option value="IT">💻 IT & Network</option>
                <option value="Cleaning">🧹 Cleaning & Sanitation</option>
                <option value="Maintenance">🛠️ Maintenance & Furniture</option>
                <option value="Administration">🏢 Administration & Academics</option>
                <option value="Other">📌 Other / General</option>
              </select>
            </div>
            <AutoClassifiedField id="priority" label="Priority Level" />
          </div>

          <hr className="border-t border-outline-variant border-opacity-40" />

          <div>
            <label className="label-base text-[#0a1422] font-semibold" htmlFor="description">Complaint Description *</label>
            <textarea
              id="description"
              rows="5"
              placeholder="Explain what happened, where it happened, and how urgent it is."
              className={`w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl font-body-md text-body-md text-on-surface p-4 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all duration-200 resize-y min-h-[160px] shadow-sm hover:border-outline ${
                errors.description ? 'border-red-500' : ''
              }`}
              {...register('description')}
            ></textarea>
            {errors.description && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.description.message}</p>}
          </div>

          {/* Evidence Upload */}
          <div>
            <span className="label-base text-[#0a1422] font-semibold mb-2 block">Upload Proof Image</span>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                assignFile(file);
              }}
              className="w-full border-2 border-dashed border-outline-variant hover:border-secondary rounded-2xl bg-surface-container-low/40 hover:bg-surface transition-all duration-300 cursor-pointer p-6 flex flex-col items-center justify-center text-center group"
            >
              <div className="h-12 w-12 rounded-xl bg-surface-container-highest flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#0a1422]">
                <CloudUpload size={24} />
              </div>
              <p className="font-body-md text-body-md text-on-surface mb-1">
                <span className="font-bold text-secondary">Click to upload</span> or drag and drop
              </p>
              <p className="font-label-md text-label-md text-outline px-4">
                Add a clear photo to help the admin team understand the issue faster. (PNG, JPG, or WebP up to 5MB)
              </p>
              <input
                id="image"
                ref={(element) => {
                  fileInputRef.current = element;
                  imageField.ref(element);
                }}
                name={imageField.name}
                onBlur={imageField.onBlur}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => assignFile(event.target.files?.[0])}
              />
            </div>

            {imageFile && (
              <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/60 bg-white p-2.5 relative shadow-sm">
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="max-h-48 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue('image', undefined);
                  }}
                  className="absolute top-4 right-4 bg-primary/80 hover:bg-primary text-white p-1 rounded-full text-xs font-semibold focus:outline-none"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {errors.image && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.image.message}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-6 border-t border-outline-variant/40">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 h-[46px] rounded-xl border border-outline-variant/60 text-[#0a1422] font-semibold text-sm hover:bg-surface-container-low transition-colors text-center cursor-pointer flex items-center justify-center"
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={mutation.isPending || isProfileIncomplete}
              className={`px-6 h-[46px] rounded-xl font-semibold text-sm transition-colors text-center shadow-sm flex items-center justify-center gap-1.5 ${
                isProfileIncomplete
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-gray-800 cursor-pointer disabled:opacity-50'
              }`}
              type="submit"
            >
              {mutation.isPending
                ? 'Submitting Complaint...'
                : isProfileIncomplete
                ? 'Complete Profile to Submit'
                : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>

      {/* Workflow Information Panel */}
      <div className="space-y-6">
        {/* Card: AI classification explanation */}
        <div className="bg-[#0a1422] text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-outline/20">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 bg-secondary rounded-full filter blur-xl opacity-30" />
          <div className="flex items-center gap-2 mb-3 text-secondary-fixed">
            <Sparkles size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">AI Classification</h3>
          </div>
          <h4 className="text-base font-bold text-white mb-2 leading-snug">Smart Complaint Triage</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your title and description help the system suggest the complaint category, priority, and department. Clear issue words and impact details help urgent cases reach the right team faster, while admins can still review and update the ticket.
          </p>
        </div>

        {/* Card: Workflow Guide */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-[#0a1422]">
            <HelpCircle size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Lodge Guidelines</h3>
          </div>
          <ol className="space-y-4 text-xs text-on-surface-variant leading-relaxed">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">1</span>
              <div>
                <p className="font-semibold text-primary">Add Exact Location</p>
                <p>Include block, floor, room or lab, nearby landmark, and how many people are affected.</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">2</span>
              <div>
                <p className="font-semibold text-primary">Help AI Classify Correctly</p>
                <p>Use clear issue words like fire, water leak, Wi-Fi down, electricity failure, or broken equipment.</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-[10px]">3</span>
              <div>
                <p className="font-semibold text-primary">Track and Follow Up</p>
                <p>Check History for status, public updates, assigned department, and add follow-up details if needed.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
