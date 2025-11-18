import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string;
  className?: string;
  onExpired?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ endDate, className = "", onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = (targetDate: string): TimeLeft => {
    const difference = new Date(targetDate).getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endDate);
      setTimeLeft(newTimeLeft);
      
      const isExpiredNow = newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
                          newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0;
      
      if (isExpiredNow && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, isExpired, onExpired]);

  if (isExpired) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm font-medium text-red-600 ${className}`} data-testid="countdown-timer">
      <Clock className="h-4 w-4" />
      <div className="flex items-center gap-1">
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-xs">left</span>
      </div>
    </div>
  );
}