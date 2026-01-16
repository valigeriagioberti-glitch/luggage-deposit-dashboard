
import React from 'react';
import { BookingStatus } from '../types';

interface StatusBadgeProps {
  status: BookingStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<BookingStatus, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
    picked_up: 'bg-slate-800 text-white border-slate-900',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const labels: Record<BookingStatus, string> = {
    paid: 'Paid',
    checked_in: 'In Storage',
    picked_up: 'Picked', // Shortened for mobile-first single line
    cancelled: 'Cancelled',
  };

  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-sm transition-all ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default StatusBadge;
