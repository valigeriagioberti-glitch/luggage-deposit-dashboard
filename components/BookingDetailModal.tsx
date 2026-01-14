
import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import StatusBadge from './StatusBadge';

interface BookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdate: () => void;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(booking.notes || '');
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: BookingStatus) => {
    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, { status: newStatus });
      onUpdate();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, { notes });
      onUpdate();
    } catch (err) {
      alert('Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const resendEmail = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef: booking.bookingRef }),
      });
      if (response.ok) alert('Confirmation email resent!');
      else alert('Failed to resend email');
    } catch (err) {
      alert('Network error resending email');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Booking #{booking.bookingRef}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Paid</p>
              <p className="font-bold">{booking.totalPaid} {booking.currency.toUpperCase()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Duration</p>
              <p className="font-bold">{booking.billableDays} Days</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Bags</p>
              <p className="font-bold">{booking.bags.small + booking.bags.medium + booking.bags.large}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Customer */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Customer Info</h3>
              <div className="space-y-2">
                <p className="font-medium text-lg">{booking.customer.name}</p>
                <p className="text-slate-600">{booking.customer.email}</p>
                <p className="text-slate-600">{booking.customer.phone}</p>
              </div>
            </section>

            {/* Schedule */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Schedule</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Drop-off</p>
                  <p className="font-medium">{booking.dropOff.date} @ {booking.dropOff.time}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pick-up</p>
                  <p className="font-medium">{booking.pickUp.date} @ {booking.pickUp.time}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Internal Notes */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Internal Notes</h3>
            <textarea
              className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Private admin notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={saveNotes}
              disabled={updating}
              className="mt-2 text-sm text-blue-600 font-semibold hover:text-blue-700 disabled:opacity-50"
            >
              Save Notes
            </button>
          </section>

          {/* Actions */}
          <section className="bg-slate-50 p-4 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-600">Administrative Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => updateStatus('checked_in')}
                disabled={updating || booking.status === 'checked_in'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Check In
              </button>
              <button 
                onClick={() => updateStatus('picked_up')}
                disabled={updating || booking.status === 'picked_up'}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Mark Picked Up
              </button>
              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating || booking.status === 'cancelled'}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200">
              <a 
                href={`https://booking.luggagedepositrome.com/api/r?session_id=${booking.stripeSessionId}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-center px-4 py-2 border rounded-lg text-sm font-medium text-slate-600 hover:bg-white"
              >
                View Success Page
              </a>
              <a 
                href={`https://booking.luggagedepositrome.com/api/google-wallet?session_id=${booking.stripeSessionId}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-center px-4 py-2 border rounded-lg text-sm font-medium text-slate-600 hover:bg-white"
              >
                Re-issue Wallet Pass
              </a>
              <button 
                onClick={resendEmail}
                disabled={updating}
                className="col-span-full px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
              >
                Resend Confirmation Email
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
