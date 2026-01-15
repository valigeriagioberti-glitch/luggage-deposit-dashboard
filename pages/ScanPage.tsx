import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { auth } from '../firebase';

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
  status: string;
}

const ScanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(searchParams.get('token'));
  const [manualInput, setManualInput] = useState('');
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
    return () => {
      stopCamera();
    };
  }, [token]);

  const extractToken = (input: string): string => {
    let cleanInput = input.trim();
    if (cleanInput.includes('token=')) {
      try {
        // Handle hash URLs: replace /#/ with / to allow URL searchParams to work
        const normalized = cleanInput.replace('/#/', '/');
        const url = new URL(normalized);
        const param = url.searchParams.get('token');
        if (param) return decodeURIComponent(param);
      } catch (e) {
        // Manual split fallback if URL parsing fails
        const parts = cleanInput.split('token=');
        if (parts.length > 1) {
          return decodeURIComponent(parts[1].split('&')[0]);
        }
      }
    }
    return decodeURIComponent(cleanInput);
  };

  const validateAndProcessToken = (rawInput: string) => {
    setError(null);
    const extractedToken = extractToken(rawInput);
    
    // Validate JWT shape (three segments)
    if (extractedToken.split('.').length !== 3) {
      setError("Invalid token (not JWT).");
      return;
    }

    setToken(extractedToken);
  };

  const verifyToken = async (jwtToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/checkin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: jwtToken }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBooking(data.booking);
      } else {
        // Display specific error message from the API
        setError(data.error || `Server error: ${response.status}`);
      }
    } catch (err: any) {
      // Distinguish between network errors and logic errors
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        setError('Connection error: Please check your internet or try again.');
      } else {
        setError(err.message || 'An unexpected error occurred during verification.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput) return;
    validateAndProcessToken(manualInput);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setError(null);
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = html5QrCode;
    
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          validateAndProcessToken(decodedText);
          stopCamera();
        },
        () => {} // silent scan errors
      );
    } catch (err) {
      setError("Camera access denied or not available.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsCameraActive(false);
    }
  };

  const confirmCheckIn = async () => {
    if (!token || !booking) return;
    setLoading(true);
    try {
      const response = await fetch('/api/checkin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          adminEmail: auth.currentUser?.email 
        }),
      });
      
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error || 'Check-in failed.');
      }
    } catch (err: any) {
      setError('Connection error during check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <button 
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white">
            <h1 className="text-xl font-bold">Secure Check-in</h1>
            <p className="text-slate-400 text-sm">Scan QR or enter token manually</p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Check-in Success!</h2>
                <p className="text-slate-500">Booking status updated to Checked In.</p>
              </div>
            ) : booking ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Reference</span>
                    <h2 className="text-3xl font-black text-slate-900">#{booking.bookingRef}</h2>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${booking.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {booking.status}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Customer</p>
                    <p className="font-bold text-slate-900">{booking.customer.name}</p>
                    <p className="text-sm text-slate-500">{booking.customer.phone}</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Drop-off</p>
                      <p className="font-bold text-slate-900">{booking.dropOff.date}</p>
                      <p className="text-xs text-slate-500">{booking.dropOff.time}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Bags</p>
                      <p className="font-bold text-slate-900">{booking.bags.small + booking.bags.medium + booking.bags.large} Total</p>
                      <p className="text-xs text-slate-500">
                        {booking.bags.small}S {booking.bags.medium}M {booking.bags.large}L
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={confirmCheckIn}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Complete Check-in'}
                </button>
                
                <button 
                  onClick={() => { setBooking(null); setToken(null); }}
                  className="w-full text-slate-400 font-semibold text-sm hover:text-slate-600"
                >
                  Cancel & Scan New
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div id="qr-reader" className={`${isCameraActive ? 'block' : 'hidden'} overflow-hidden rounded-2xl bg-black aspect-square`}></div>
                
                {!isCameraActive && (
                  <div className="space-y-6">
                    <button
                      onClick={startCamera}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Open QR Scanner
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                      <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400 font-medium">or paste code</span></div>
                    </div>

                    <form onSubmit={handleManualSubmit} className="space-y-3">
                      <input 
                        type="text" 
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Paste URL or Token here"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      />
                      <button 
                        type="submit"
                        className="w-full py-3 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Verify Manual Code
                      </button>
                    </form>
                  </div>
                )}

                {isCameraActive && (
                  <button 
                    onClick={stopCamera}
                    className="w-full text-red-500 font-bold py-2"
                  >
                    Close Camera
                  </button>
                )}

                {loading && <div className="text-center text-slate-400 py-4 animate-pulse font-medium">Verifying booking details...</div>}
                
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;