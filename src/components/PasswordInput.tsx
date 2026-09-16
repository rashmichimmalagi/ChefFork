import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ id, className = '', disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 pr-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500 disabled:opacity-50 ${className}`}
        />
        <button
          type="button"
          id={`${id}-toggle-visibility-btn`}
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={0}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
        >
          {visible ? (
            <EyeOff className="w-4 h-4 text-stone-500 dark:text-stone-400" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4 text-stone-500 dark:text-stone-400" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
