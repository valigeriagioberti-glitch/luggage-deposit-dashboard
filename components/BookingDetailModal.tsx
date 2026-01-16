
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

  const isArchived = !!booking.archivedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
           <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header - Fixed */}
        <div className="flex-none px-6 py-5 flex items-center justify-between border-b border-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">#{booking.bookingRef}</h2>
              {isArchived && <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Archive</span>}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Guest Information</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors active:scale-90">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-56 sm:pb-8 custom-scrollbar">
          
          {/* Profile Header */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
             <div className="flex justify-between items-start mb-4">
                <StatusBadge status={booking.status} />
                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Deposit Active</p>
             </div>
             <h3 className="text-2xl font-black mb-1 truncate">{booking.customer.name}</h3>
             <p className="text-slate-400 text-sm font-medium mb-4 truncate">{booking.customer.email}</p>
             <div className="flex items-center gap-2 text-blue-400 font-black text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {booking.customer.phone}
             </div>
          </div>

          {/* Logistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Drop-off</p>
              <p className="font-black text-slate-900 text-sm">{booking.dropOff.date}</p>
              <p className="text-[10px] text-blue-600 font-bold">{booking.dropOff.time}</p>
            </div>
            <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Pick-up</p>
              <p className="font-black text-slate-900 text-sm">{booking.pickUp.date}</p>
              <p className="text-[10px] text-emerald-600 font-bold">{booking.pickUp.time}</p>
            </div>
          </div>

          {/* Bag Inventory */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory</h4>
                <span className="text-xs font-black text-slate-900">{booking.bags.small + booking.bags.medium + booking.bags.large} Items</span>
             </div>
             <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-lg font-black text-slate-900">{booking.bags.small}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase">S</p>
                </div>
                <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-lg font-black text-slate-900">{booking.bags.medium}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase">M</p>
                </div>
                <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-lg font-black text-slate-900">{booking.bags.large}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase">L</p>
                </div>
             </div>
          </div>

          {/* Memo Section */}
          {!isArchived && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Memo</h4>
              <div className="relative group">
                <textarea
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl h-24 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium placeholder:text-slate-300 resize-none"
                  placeholder="Storage details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button 
                  onClick={saveNotes} 
                  disabled={updating}
                  className="absolute bottom-3 right-3 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black active:scale-95 disabled:opacity-30 transition-all shadow-lg"
                >
                  {updating ? '...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS (Refined for Thumb-Reach) */}
        {!isArchived && (
          <div className="flex-none p-5 pb-10 sm:p-8 bg-white border-t border-slate-100 shadow-[0_-20px_40px_rgba(0,0,0,0.06)] rounded-t-[2.5rem] sm:rounded-none z-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
              {/* Primary High-Impact Actions */}
              <button 
                onClick={() => updateStatus('checked_in')}
                disabled={updating || booking.status !== 'paid'}
                className={`w-full h-16 sm:h-14 rounded-2xl text-lg sm:text-base font-black transition-all active:scale-95 
                  ${booking.status === 'paid' 
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30' 
                    : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-40 shadow-none pointer-events-none'}`}
              >
                Mark Checked In
              </button>
              
              <button 
                onClick={() => updateStatus('picked_up')}
                disabled={updating || booking.status !== 'checked_in'}
                className={`w-full h-16 sm:h-14 rounded-2xl text-lg sm:text-base font-black transition-all active:scale-95
                  ${booking.status === 'checked_in'
                    ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30'
                    : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-40 shadow-none pointer-events-none'}`}
              >
                Mark Picked Up
              </button>

              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating || booking.status === 'picked_up' || booking.status === 'cancelled'}
                className="w-full sm:w-auto px-6 h-14 bg-slate-50 text-slate-400 rounded-2xl text-sm font-black hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        )}

        {/* Browser Safe Area */}
        <div className="h-4 sm:hidden bg-white"></div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
