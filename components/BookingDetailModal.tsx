
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
        
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
      {/* Background overlay click-to-close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-300">
        {/* Header */}
        <div className="flex-none bg-white border-b px-6 py-5 flex items-center justify-between z-10 rounded-t-[2.5rem] sm:rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">Booking #{booking.bookingRef}</h2>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{booking.id} {isArchived && "• ARCHIVED"}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 sm:pb-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</p>
              <div className="flex justify-start">
                <StatusBadge status={booking.status} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Paid</p>
              <p className="font-black text-slate-900 text-base">{booking.totalPaid} {booking.currency.toUpperCase()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duration</p>
              <p className="font-black text-slate-900 text-base">{booking.billableDays} Days</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Bags</p>
              <p className="font-black text-slate-900 text-base">{booking.bags.small + booking.bags.medium + booking.bags.large}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Customer Profile</h3>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-lg">{booking.customer.name}</p>
                <p className="text-slate-500 text-sm truncate">{booking.customer.email}</p>
                <p className="text-blue-600 font-bold text-sm">{booking.customer.phone}</p>
              </div>
            </section>

            <section className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Time Window</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Drop-off</p>
                  <p className="font-black text-slate-900 text-sm">{booking.dropOff.date}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{booking.dropOff.time}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Pick-up</p>
                  <p className="font-black text-slate-900 text-sm">{booking.pickUp.date}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{booking.pickUp.time}</p>
                </div>
              </div>
            </section>
          </div>

          {!isArchived && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Staff Memo</h3>
              <div className="relative">
                <textarea
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl h-32 focus:ring-4 focus:ring-blue-100 border-transparent focus:border-blue-500 outline-none transition-all text-sm resize-none shadow-inner"
                  placeholder="Locker number, specific bag details, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button 
                  onClick={saveNotes} 
                  disabled={updating} 
                  className="absolute bottom-4 right-4 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-blue-600 hover:bg-blue-50 disabled:opacity-50 uppercase shadow-sm"
                >
                  {updating ? 'Saving...' : 'Update Memo'}
                </button>
              </div>
            </section>
          )}

          {isArchived && (
             <div className="p-6 bg-slate-900 rounded-3xl text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Archived Record</p>
                <p className="text-white font-black text-lg">Checkout Complete</p>
                <p className="text-slate-500 text-xs mt-2">
                   This booking was picked up and archived on {booking.archivedAt?.toDate ? booking.archivedAt.toDate().toLocaleString() : 'N/A'}.
                </p>
             </div>
          )}
        </div>

        {/* Sticky Action Footer (Mobile Priority) */}
        {!isArchived && (
          <div className="flex-none absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] sm:relative sm:border-t-0 sm:shadow-none sm:bg-transparent">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => updateStatus('checked_in')}
                disabled={updating || booking.status !== 'paid'}
                className="flex-1 h-14 sm:h-12 bg-blue-600 rounded-2xl text-white text-base font-black hover:bg-blue-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:scale-100 transition-all shadow-lg shadow-blue-100"
              >
                Mark Checked In
              </button>
              <button 
                onClick={() => updateStatus('picked_up')}
                disabled={updating || booking.status !== 'checked_in'}
                className="flex-1 h-14 sm:h-12 bg-emerald-600 rounded-2xl text-white text-base font-black hover:bg-emerald-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:scale-100 transition-all shadow-lg shadow-emerald-100"
              >
                Mark Picked Up
              </button>
              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating || booking.status === 'picked_up' || booking.status === 'cancelled'}
                className="sm:w-32 h-14 sm:h-12 bg-slate-100 rounded-2xl text-slate-500 text-sm font-bold hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
            
            <div className="mt-4 sm:hidden text-center">
               <button onClick={resendEmail} disabled={updating} className="text-[10px] font-bold text-slate-400 underline uppercase tracking-tighter">
                  Resend Confirmation Email
               </button>
            </div>
          </div>
        )}
        
        {/* Mobile Safe Area Spacer */}
        <div className="h-6 sm:hidden bg-white"></div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
