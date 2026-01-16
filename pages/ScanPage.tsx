
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { auth } from '../firebase';
import StatusBadge from '../components/StatusBadge';

interface BookingSummary {
  id: string;
  bookingRef: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  bags: {
    small: number;
    medium: number;
    large: number;
  };
  dropOff: {
    date: string;
    time: string;
  };
  status: any;
}

const ScanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialRef = searchParams.get('ref') || searchParams.get('token');
  const [bookingRef, setBookingRef] = useState<string | null>(initialRef);
  const [manualInput, setManualInput] = useState('');
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Auto-start camera on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    if (!bookingRef) {
      startCamera();
    } else {
      lookupBooking(bookingRef);
    }

    return () => {
      stopCamera();
      document.body.style.overflow = 'auto';
    };
  }, []);

  const extractBookingRef = (input: string): string | null => {
    let cleanInput = input.trim();
    
    // Case 1: URL containing ref=
    if (cleanInput.toLowerCase().includes('ref=')) {
      try {
        const normalized = cleanInput.replace('/#/', '/');
        const url = new URL(normalized);
        const param = url.searchParams.get('ref');
        if (param) return param.toUpperCase();
      } catch (e) {
        const parts = cleanInput.split(/[?&]ref=/i);
        if (parts.length > 1) return parts[1].split('&')[0].toUpperCase();
      }
    }

    // Case 2: Raw alphanumeric string (6-12 chars)
    const refRegex = /^[A-Z0-9]{6,12}$/i;
    if (refRegex.test(cleanInput)) {
      return cleanInput.toUpperCase();
    }

    return null;
  };

  const validateAndProcessInput = (rawInput: string) => {
    setError(null);
    setScanFeedback(`Scanned: ${rawInput.length > 20 ? rawInput.substring(0, 17) + '...' : rawInput}`);
    
    // Clear feedback toast after 2 seconds
    setTimeout(() => setScanFeedback(null), 2000);

    const extracted = extractBookingRef(rawInput);
    
    if (!extracted) {
      setError("Not a booking QR. Please scan the customer booking QR.");
      return;
    }

    setBookingRef(extracted);
    lookupBooking(extracted);
  };

  const lookupBooking = async (ref: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/booking/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef: ref }),
      });
      const data = await response.json();
      if (response.ok) {
        setBooking(data.booking);
        stopCamera();
      } else {
        setError(data.error || 'Booking not found.');
        setBooking(null);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    setCameraPermissionError(false);
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = html5QrCode;
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { 
          fps: 15, 
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          validateAndProcessInput(decodedText);
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraPermissionError(true);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsCameraActive(false);
    }
  };

  const triggerVibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const handleAction = async (action: 'checkin' | 'pickup') => {
    if (!bookingRef || !booking) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = action === 'checkin' ? '/api/booking/checkin' : '/api/booking/pickup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, adminEmail: auth.currentUser?.email }),
      });
      if (response.ok) {
        triggerVibrate();
        setSuccessMessage(action === 'checkin' ? 'Checked in successfully ✅' : 'Picked up successfully ✅');
        setTimeout(() => navigate('/'), 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Action failed.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* App Header */}
      <div className="flex-none bg-slate-900 px-6 py-6 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">Scanner</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Staff Terminal</p>
          </div>
        </div>
        {!booking && !successMessage && (
           <button 
            onClick={() => { setManualInput(''); setBooking(null); setBookingRef(null); startCamera(); }} 
            className="text-xs font-bold text-blue-400 hover:text-blue-300"
          >
             Reset
           </button>
        )}
      </div>

      <div className="flex-1 relative bg-slate-950 flex flex-col justify-center items-center">
        {/* Scan Feedback Toast */}
        {scanFeedback && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase text-white tracking-widest animate-in fade-in slide-in-from-top-2">
            {scanFeedback}
          </div>
        )}

        {successMessage ? (
          <div className="w-full max-w-sm px-8 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Success!</h2>
            <p className="text-emerald-400 font-bold text-lg">{successMessage}</p>
            <p className="text-slate-500 text-sm mt-8 animate-pulse">Returning to dashboard...</p>
          </div>
        ) : booking ? (
          <div className="w-full max-w-lg px-6 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
               <div className="p-8 space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">Booking Confirmed</p>
                      <h2 className="text-4xl font-black text-slate-900">#{booking.bookingRef}</h2>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                      <p className="font-black text-slate-900 text-lg">{booking.customer.name}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Schedule</p>
                          <p className="font-bold text-slate-900 text-sm">{booking.dropOff.date}</p>
                          <p className="text-xs text-slate-500">{booking.dropOff.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Bags</p>
                          <p className="font-black text-slate-900 text-xl">{booking.bags.small + booking.bags.medium + booking.bags.large}</p>
                        </div>
                      </div>
                      
                      {/* Luggage Inventory Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                         <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-sm">
                            <p className="text-lg font-black text-slate-900 leading-none">{booking.bags.small || 0}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Small</p>
                         </div>
                         <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-sm">
                            <p className="text-lg font-black text-slate-900 leading-none">{booking.bags.medium || 0}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Medium</p>
                         </div>
                         <div className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-sm">
                            <p className="text-lg font-black text-slate-900 leading-none">{booking.bags.large || 0}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Large</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {booking.status === 'paid' && (
                      <button
                        onClick={() => handleAction('checkin')}
                        disabled={loading}
                        className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? '...' : 'Confirm Check-In'}
                      </button>
                    )}

                    {booking.status === 'checked_in' && (
                      <button
                        onClick={() => handleAction('pickup')}
                        disabled={loading}
                        className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? '...' : 'Mark Picked Up'}
                      </button>
                    )}

                    {(booking.status === 'picked_up' || booking.status === 'cancelled') && (
                      <div className="p-6 bg-slate-100 rounded-3xl text-center text-slate-500 font-black italic border border-slate-200">
                        Booking is {booking.status.replace('_', ' ')}
                      </div>
                    )}
                  </div>
               </div>
            </div>
            <button 
              onClick={() => { setBooking(null); setBookingRef(null); startCamera(); }}
              className="w-full mt-6 text-white/50 font-bold text-sm uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              Scan Another
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* Scanner Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
               <div id="qr-reader" className="w-full h-full"></div>
               
               {/* Scanner Overlay Frame */}
               {isCameraActive && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[280px] h-[280px] border-2 border-white/30 rounded-[3rem] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)] relative overflow-hidden">
                       <div className="absolute inset-0 border-[3px] border-blue-500/80 rounded-[3rem] animate-pulse"></div>
                       {/* Scanning line animation */}
                       <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_3s_ease-in-out_infinite]"></div>
                    </div>
                    <style>{`
                      @keyframes scan {
                        0%, 100% { top: 10%; }
                        50% { top: 90%; }
                      }
                    `}</style>
                 </div>
               )}

               {cameraPermissionError && (
                 <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center z-20">
                    <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                       <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-white text-xl font-black mb-2">Camera Blocked</h3>
                    <p className="text-slate-400 text-sm mb-8">Access is required to scan QR codes. Please update your browser permissions.</p>
                    <button 
                      onClick={startCamera} 
                      className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                      Allow Camera
                    </button>
                 </div>
               )}
            </div>

            {/* Manual Entry Drawer */}
            <div className="flex-none bg-slate-900 p-8 pt-4 pb-12 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-slate-800">
               <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6"></div>
               <div className="relative mb-6">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                 <div className="relative flex justify-center text-[10px]"><span className="px-3 bg-slate-900 text-slate-500 font-black uppercase tracking-[0.3em]">Manual Lookup</span></div>
               </div>

               <form onSubmit={(e) => { e.preventDefault(); validateAndProcessInput(manualInput); }} className="space-y-4">
                  <input 
                    type="text" 
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="ENTER REFERENCE"
                    className="w-full h-16 bg-slate-800 border-2 border-slate-700 rounded-2xl text-white text-center text-xl font-black tracking-[0.2em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600"
                  />
                  <button type="submit" className="w-full h-12 bg-slate-100 text-slate-900 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white active:scale-98 transition-all">
                    Search Booking
                  </button>
               </form>

               {error && (
                 <div className="mt-4 p-4 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in">
                    {error}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;
