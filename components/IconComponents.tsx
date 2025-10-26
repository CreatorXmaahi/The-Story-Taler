
import React from 'react';

export const NextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A1 1 0 0 0 5 3v18a1 1 0 0 0 .536.886z" />
  </svg>
);

export const PrevIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.464 2.114a1.004 1.004 0 0 0-1.033.064l-13 9a1 1 0 0 0 0 1.644l13 9A1 1 0 0 0 19 21V3a1 1 0 0 0-.536-.886z" />
  </svg>
);

export const ReplayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5c-3.859 0-7 3.141-7 7s3.141 7 7 7 7-3.141 7-7-3.141-7-7-7zm0 12c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" />
    <path d="M12 8.414V6l-4 4 4 4v-2.414A2.5 2.5 0 0 1 14.5 12a2.5 2.5 0 0 1-2.5 2.5z" />
  </svg>
);
