import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      const updateData: any = { status: newStatus, updatedAt: serverTimestamp() };
      
      if (newStatus === 'checked_in') updateData.checkedInAt = serverTimestamp();
      if (newStatus === 'picked_up') updateData.pickedUpAt = serverTimestamp();
      
      await updateDoc(bookingRef, updateData);
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
      await updateDoc(bookingRef, { 'dropOff.notes': notes });
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">Booking #{booking.bookingRef}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Status</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
              <p className="font-black text-slate-900">{booking.totalPaid} {booking.currency.toUpperCase()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Storage</p>
              <p className="font-black text-slate-900">{booking.billableDays} Days</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bag Count</p>
              <p className="font-black text-slate-900">{booking.bags.small + booking.bags.medium + booking.bags.large}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Customer Information</h3>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-lg">{booking.customer.name}</p>
                <p className="text-slate-600 text-sm">{booking.customer.email}</p>
                <p className="text-slate-600 text-sm">{booking.customer.phone}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Drop-off</p>
                  <p className="font-bold text-slate-900 text-sm">{booking.dropOff.date}</p>
                  <p className="text-xs text-slate-500">{booking.dropOff.time}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pick-up</p>
                  <p className="font-bold text-slate-900 text-sm">{booking.pickUp.date}</p>
                  <p className="text-xs text-slate-500">{booking.pickUp.time}</p>
                </div>
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Staff Notes</h3>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              placeholder="Internal notes about this luggage..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button onClick={saveNotes} disabled={updating} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50">
              Save Notes
            </button>
          </section>

          <section className="bg-slate-900 p-6 rounded-2xl space-y-4 text-white">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Management Workflow</h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => updateStatus('checked_in')}
                disabled={updating || booking.status !== 'paid'}
                className="flex-1 px-4 py-3 bg-blue-600 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-30 transition-all"
              >
                Mark Checked In
              </button>
              <button 
                onClick={() => updateStatus('picked_up')}
                disabled={updating || booking.status !== 'checked_in'}
                className="flex-1 px-4 py-3 bg-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-30 transition-all"
              >
                Mark Picked Up
              </button>
              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating || booking.status === 'picked_up'}
                className="px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-30 transition-all"
              >
                Cancel
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button onClick={resendEmail} disabled={updating} className="col-span-2 py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all">
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