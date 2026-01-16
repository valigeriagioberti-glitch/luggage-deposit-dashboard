
import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
      if (newStatus === 'picked_up') {
        // Use special archive API for picking up
        const response = await fetch('/api/archive/pickup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            bookingRef: booking.bookingRef,
            adminEmail: auth.currentUser?.email 
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to archive booking');
        }
        
        onClose(); // Close modal immediately as it's moved from current list
        return;
      }

      const bookingRef = doc(db, 'bookings', booking.id);
      const updateData: any = { status: newStatus, updatedAt: serverTimestamp() };
      
      if (newStatus === 'checked_in') updateData.checkedInAt = serverTimestamp();
      
      await updateDoc(bookingRef, updateData);
      onUpdate();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      // Notes are currently only editable on active bookings
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, { 'dropOff.notes': notes });
      onUpdate();
    } catch (err) {
      alert('Failed to save notes. Note: Archived bookings are read-only.');
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

  const isArchived = !!booking.archivedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold">Booking #{booking.bookingRef}</h2>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">{booking.id} {isArchived && "(Archived)"}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <div className="flex justify-start">
                <StatusBadge status={booking.status} />
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
              <p className="font-black text-slate-900 text-sm">{booking.totalPaid} {booking.currency.toUpperCase()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
              <p className="font-black text-slate-900 text-sm">{booking.billableDays} Days</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bags</p>
              <p className="font-black text-slate-900 text-sm">{booking.bags.small + booking.bags.medium + booking.bags.large}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Customer Info</h3>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900">{booking.customer.name}</p>
                <p className="text-slate-500 text-xs truncate">{booking.customer.email}</p>
                <p className="text-slate-500 text-xs">{booking.customer.phone}</p>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-300 uppercase mb-0.5">Drop-off</p>
                  <p className="font-bold text-slate-900 text-xs">{booking.dropOff.date}</p>
                  <p className="text-[10px] text-slate-500">{booking.dropOff.time}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-300 uppercase mb-0.5">Pick-up</p>
                  <p className="font-bold text-slate-900 text-xs">{booking.pickUp.date}</p>
                  <p className="text-[10px] text-slate-500">{booking.pickUp.time}</p>
                </div>
              </div>
              {booking.archivedAt && (
                <div className="mt-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Archived On</p>
                  <p className="text-[10px] text-slate-600">
                    {booking.archivedAt?.toDate ? booking.archivedAt.toDate().toLocaleString() : 'Recently'}
                  </p>
                </div>
              )}
            </section>
          </div>

          {!isArchived && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Internal Staff Notes</h3>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                placeholder="Internal notes about bags, locker #, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button onClick={saveNotes} disabled={updating} className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 uppercase">
                {updating ? 'Saving...' : 'Save Notes'}
              </button>
            </section>
          )}

          <section className={`p-6 rounded-2xl sm:rounded-3xl space-y-5 text-white ${isArchived ? 'bg-slate-700 opacity-80' : 'bg-slate-900'}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center sm:text-left">
              {isArchived ? 'Record is Archived (Read Only)' : 'Actions'}
            </h3>
            
            {!isArchived ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => updateStatus('checked_in')}
                    disabled={updating || booking.status !== 'paid'}
                    className="flex-1 px-4 py-4 bg-blue-600 rounded-xl text-sm font-black hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    Mark Checked In
                  </button>
                  <button 
                    onClick={() => updateStatus('picked_up')}
                    disabled={updating || booking.status !== 'checked_in'}
                    className="flex-1 px-4 py-4 bg-emerald-600 rounded-xl text-sm font-black hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    Mark Picked Up
                  </button>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    onClick={() => updateStatus('cancelled')}
                    disabled={updating || booking.status === 'picked_up' || booking.status === 'cancelled'}
                    className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white disabled:opacity-30 transition-all"
                  >
                    Cancel Booking
                  </button>
                  <button 
                    onClick={resendEmail} 
                    disabled={updating} 
                    className="w-full py-3 text-slate-400 text-[10px] font-bold hover:text-white transition-all underline decoration-slate-700"
                  >
                    Resend Confirmation Email
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-slate-300 italic text-sm">
                This booking was completed and archived. No further actions can be taken.
              </div>
            )}
          </section>
        </div>
        
        {/* Safe Area Padding for Mobile */}
        <div className={`h-6 sm:hidden ${isArchived ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
