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
    checked_in: 'Checked In',
    picked_up: 'Picked Up',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default StatusBadge;