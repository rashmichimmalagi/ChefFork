import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  sizeClassName?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'Chef',
  sizeClassName = 'w-10 h-10',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (n: string) => {
    if (!n) return 'C';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const hasValidImage = src && !imgError && src.trim().length > 0;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 font-semibold select-none border border-stone-200/60 dark:border-stone-800 ${sizeClassName} ${className}`}
    >
      {hasValidImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : name ? (
        <span className="text-xs uppercase font-bold tracking-wider">{getInitials(name)}</span>
      ) : (
        <User className="w-1/2 h-1/2 opacity-70" />
      )}
    </div>
  );
};
