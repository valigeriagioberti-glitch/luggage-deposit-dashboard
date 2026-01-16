
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
      
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
        
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden w-full flex-none flex justify-center pt-3 pb-1">
           <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header - Fixed (flex-none) */}
        <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-50 bg-white">
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

        {/* Scrollable Content Area - Use flex-1 min-h-0 to force internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 pb-[240px] sm:pb-8 custom-scrollbar">
          
          {/* Profile Header */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
             <div className="flex justify-between items-start mb-4">
                <StatusBadge status={booking.status} />
                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Deposit Active</p>
             </div>
             <h3 className="text-xl font-black mb-1 truncate">{booking.customer.name}</h3>
             <p className="text-slate-400 text-xs font-medium mb-4 truncate">{booking.customer.email}</p>
             <div className="flex items-center gap-2 text-blue-400 font-black text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {booking.customer.phone}
             </div>
          </div>

          {/* Logistics Grid - Ensure visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Drop-off</p>
              <p className="font-black text-slate-900 text-xs">{booking.dropOff.date}</p>
              <p className="text-[9px] text-blue-600 font-bold">{booking.dropOff.time}</p>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Pick-up</p>
              <p className="font-black text-slate-900 text-xs">{booking.pickUp.date}</p>
              <p className="text-[9px] text-emerald-600 font-bold">{booking.pickUp.time}</p>
            </div>
          </div>

          {/* Bag Inventory */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
             <div className="flex justify-between items-center mb-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory</h4>
                <span className="text-[10px] font-black text-slate-900">{booking.bags.small + booking.bags.medium + booking.bags.large} Items</span>
             </div>
             <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white rounded-xl border border-slate-100">
                   <p className="text-base font-black text-slate-900">{booking.bags.small}</p>
                   <p className="text-[7px] font-bold text-slate-400 uppercase">S</p>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-slate-100">
                   <p className="text-base font-black text-slate-900">{booking.bags.medium}</p>
                   <p className="text-[7px] font-bold text-slate-400 uppercase">M</p>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-slate-100">
                   <p className="text-base font-black text-slate-900">{booking.bags.large}</p>
                   <p className="text-[7px] font-bold text-slate-400 uppercase">L</p>
                </div>
             </div>
          </div>

          {/* Memo Section */}
          {!isArchived && (
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff Memo</h4>
              <div className="relative">
                <textarea
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-20 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium placeholder:text-slate-300 resize-none"
                  placeholder="Details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button 
                  onClick={saveNotes} 
                  disabled={updating}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg disabled:opacity-30"
                >
                  {updating ? '...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS - standardized sizing */}
        {!isArchived && (
          <div className="flex-none p-4 pb-8 sm:p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] sm:rounded-none z-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 max-w-lg mx-auto">
              <button 
                onClick={() => updateStatus('checked_in')}
                disabled={updating || booking.status !== 'paid'}
                className={`w-full h-14 rounded-xl text-base font-black transition-all active:scale-95 
                  ${booking.status === 'paid' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-40 pointer-events-none'}`}
              >
                Mark Checked In
              </button>
              
              <button 
                onClick={() => updateStatus('picked_up')}
                disabled={updating || booking.status !== 'checked_in'}
                className={`w-full h-14 rounded-xl text-base font-black transition-all active:scale-95
                  ${booking.status === 'checked_in'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-40 pointer-events-none'}`}
              >
                Mark Picked Up
              </button>

              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating || booking.status === 'picked_up' || booking.status === 'cancelled'}
                className="w-full sm:w-auto px-6 h-12 bg-slate-50 text-slate-400 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-20 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailModal;
