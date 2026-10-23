import { forwardRef, useEffect, useRef, useState } from 'react';

const OtpInput = forwardRef(function OtpInput(
  { id, label, error, onChange, value = '', length = 6, ...props },
  ref
) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  // Sync internal state with external value
  useEffect(() => {
    const newDigits = (value || '').split('').slice(0, length);
    while (newDigits.length < length) newDigits.push('');
    setDigits(newDigits);
  }, [value, length]);

  const triggerChange = (newDigits) => {
    const newValue = newDigits.join('');
    if (onChange) {
      // Mock an event object for react-hook-form
      onChange({ target: { value: newValue } });
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1].focus();
    }
  };

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Only allow digits

    const newDigits = [...digits];
    
    // Handle paste of multiple characters
    if (val.length > 1) {
      const pastedDigits = val.split('').slice(0, length - index);
      for (let i = 0; i < pastedDigits.length; i++) {
        newDigits[index + i] = pastedDigits[i];
      }
      setDigits(newDigits);
      triggerChange(newDigits);
      
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      inputRefs.current[nextIndex].focus();
      return;
    }

    newDigits[index] = val;
    setDigits(newDigits);
    triggerChange(newDigits);

    if (val && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/\D/g, '');
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < length; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);
    triggerChange(newDigits);
    
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex].focus();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="label-base">
          {label}
        </label>
      )}
      
      {/* Hidden input for react-hook-form registration */}
      <input
        type="hidden"
        id={id}
        ref={ref}
        value={digits.join('')}
        {...props}
      />
      
      <div className="flex gap-2 sm:gap-3 justify-center w-full">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-lg border bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
              error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-600 text-center w-full">{error}</p>}
    </div>
  );
});

export default OtpInput;
