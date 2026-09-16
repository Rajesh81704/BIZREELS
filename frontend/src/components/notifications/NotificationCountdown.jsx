import React, { useState, useEffect, memo } from 'react';
import { FiClock } from 'react-icons/fi';

function NotificationCountdownComponent({ validTill }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!validTill) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(validTill) - +new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [validTill]);

  if (!timeLeft) return null;

  if (timeLeft === 'Expired') {
    return (
      <span className="text-red-500 font-bold text-[10px] uppercase bg-red-500/10 px-2 py-0.5 rounded shadow-xs shrink-0">
        Expired
      </span>
    );
  }

  return (
    <span className="text-brand-orange font-bold text-[10px] bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded flex items-center gap-1 w-fit animate-pulse shrink-0">
      <FiClock className="animate-spin-slow" /> {timeLeft}
    </span>
  );
}

export const NotificationCountdown = memo(NotificationCountdownComponent);
export default NotificationCountdown;
