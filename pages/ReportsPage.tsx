
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Booking } from '../types';
import { signOut } from 'firebase/auth';

type ReportMode = 'day' | 'month' | 'year';

interface ExtendedBooking extends Booking {
  _isArchive: boolean;
}

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeBookings, setActiveBookings] = useState<ExtendedBooking[]>([]);
  const [archivedBookings, setArchivedBookings] = useState<ExtendedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReportMode>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0].substring(0, 7); // Default to current month YYYY-MM
  });
  
  const [archiveStatus, setArchiveStatus] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});
  const [archiving, setArchiving] = useState(false);

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const qActive = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
      const qArchive = query(collection(db, "bookings_archive"), orderBy("createdAt", "desc"));

      const [snapActive, snapArchive] = await Promise.all([
        getDocs(qActive),
        getDocs(qArchive)
      ]);

      const mapDocs = (snapshot: any, isArchive: boolean): ExtendedBooking[] => 
        snapshot.docs.map((d: any) => {
          const data: any = d.data();
          return {
            id: d.id,
            bookingRef: String(data.bookingRef ?? ""),
            stripeSessionId: String(data.stripeSessionId ?? ""),
            createdAt: data.createdAt ?? null,
            archivedAt: data.archivedAt ?? null,
            bookedOnRome: "",
            customer: {
              name: String(data.customer?.name ?? ""),
              email: String(data.customer?.email ?? ""),
              phone: String(data.customer?.phone ?? ""),
            },
            dropOff: {
              date: String(data.dropOff?.date ?? ""),
              time: String(data.dropOff?.time ?? ""),
              datetime: data.dropOff?.datetime ?? null,
            },
            pickUp: {
              date: String(data.pickUp?.date ?? ""),
              time: String(data.pickUp?.time ?? ""),
              datetime: data.pickUp?.datetime ?? null,
            },
            billableDays: Number(data.billableDays ?? 0),
            bags: {
              small: Number(data.bags?.small ?? 0),
              medium: Number(data.bags?.medium ?? 0),
              large: Number(data.bags?.large ?? 0),
            },
            totalPaid: Number(data.totalPaid ?? 0),
            currency: String(data.currency ?? "EUR"),
            status: data.status,
            notes: data.notes ?? data.dropOff?.notes ?? "",
            walletIssued: Boolean(data.walletIssued ?? false),
            _isArchive: isArchive
          };
        });

      setActiveBookings(mapDocs(snapActive, false));
      setArchivedBookings(mapDocs(snapArchive, true));
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const stats = useMemo(() => {
    const filterFn = (b: ExtendedBooking) => {
      const bDate = b.dropOff.date;
      if (mode === 'day') return bDate === selectedDate;
      if (mode === 'month') return bDate.startsWith(selectedDate);
      if (mode === 'year') return bDate.startsWith(selectedDate.substring(0, 4));
      return false;
    };

    const activeFiltered = activeBookings.filter(filterFn);
    const archivedFiltered = archivedBookings.filter(filterFn);
    const combined = [...activeFiltered, ...archivedFiltered];

    const totalBookings = combined.length;
    const revenue = combined.reduce((acc, b) => b.status !== 'cancelled' ? acc + b.totalPaid : acc, 0);
    
    const activeRevenue = activeFiltered.reduce((acc, b) => b.status !== 'cancelled' ? acc + b.totalPaid : acc, 0);
    const archivedRevenue = archivedFiltered.reduce((acc, b) => b.status !== 'cancelled' ? acc + b.totalPaid : acc, 0);

    const byStatus = {
      paid: combined.filter(b => b.status === 'paid').length,
      checked_in: combined.filter(b => b.status === 'checked_in').length,
      picked_up: combined.filter(b => b.status === 'picked_up').length,
      cancelled: combined.filter(b => b.status === 'cancelled').length,
    };

    return { 
      totalBookings, 
      revenue, 
      byStatus,
      breakdown: {
        active: { count: activeFiltered.length, rev: activeRevenue },
        archived: { count: archivedFiltered.length, rev: archivedRevenue }
      }
    };
  }, [activeBookings, archivedBookings, mode, selectedDate]);

  const handleArchiveAll = async () => {
    if (!window.confirm("Archive all checked-out bookings older than 7 days?")) return;
    setArchiving(true);
    setArchiveStatus({message: '', type: null});
    try {
      const response = await fetch('/api/archive/picked-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 })
      });
      const data = await response.json();
      if (response.ok) {
        setArchiveStatus({message: `Success! Archived ${data.count} bookings.`, type: 'success'});
        fetchAllData();
      } else {
        setArchiveStatus({message: data.error || 'Archive failed.', type: 'error'});
      }
    } catch (err) {
      setArchiveStatus({message: 'Network error.', type: 'error'});
    } finally {
      setArchiving(false);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 lg:pb-24 overflow-x-hidden">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><img src={logoUrl} alt="Logo" className="h-8 lg:h-10 w-auto" /></Link>
            <h1 className="font-bold text-lg lg:text-xl text-slate-900 hidden sm:block">Admin Reports</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 lg:gap-8 mr-4 border-r pr-4 border-slate-200">
               <Link to="/" className="text-sm lg:text-base font-bold text-slate-500 hover:text-blue-600 transition-colors">Bookings</Link>
               <Link to="/reports" className="text-sm lg:text-base font-bold text-blue-600">Reports</Link>
            </div>
            <button onClick={handleLogout} className="text-sm lg:text-base font-semibold text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 lg:px-5 lg:py-2.5 hover:bg-red-50 rounded-lg lg:rounded-xl">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 lg:mt-10">
        {error && (
          <div className="mb-6 p-4 lg:p-6 bg-red-50 border border-red-200 rounded-2xl lg:rounded-3xl text-red-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="font-bold text-sm lg:text-base uppercase tracking-wider">Reports Data Error</h3>
            </div>
            <p className="text-xs lg:text-sm font-mono break-words">{error}</p>
          </div>
        )}

        <div className="mb-8 lg:mb-12">
            <h2 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">Performance Stats</h2>
            <p className="text-slate-500 lg:text-lg">Analyze combined revenue from active and archived bookings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 mb-8 lg:mb-12">
           <div className="flex bg-white p-1.5 lg:p-2 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm w-fit">
              {(['day', 'month', 'year'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === 'year') setSelectedDate(new Date().getFullYear().toString());
                    else if (m === 'month') setSelectedDate(new Date().toISOString().substring(0, 7));
                    else setSelectedDate(new Date().toISOString().substring(0, 10));
                  }}
                  className={`px-6 py-2 lg:px-10 lg:py-3.5 text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl transition-all capitalize ${mode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {m}
                </button>
              ))}
           </div>
           <div className="flex items-center gap-3 lg:gap-5">
              <input 
                type={mode === 'day' ? 'date' : mode === 'month' ? 'month' : 'number'}
                className="bg-white border border-slate-200 rounded-xl lg:rounded-2xl px-4 py-2.5 lg:px-8 lg:py-4 font-black lg:text-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                value={selectedDate}
                min={mode === 'year' ? 2024 : undefined}
                max={mode === 'year' ? 2030 : undefined}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <span className="text-slate-400 text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]">Period</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 mb-12 lg:mb-20">
           <div className="bg-white p-8 lg:p-12 rounded-3xl lg:rounded-[3rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 lg:mb-4">Total Revenue</p>
              <p className="text-4xl lg:text-6xl font-black text-emerald-600">{stats.revenue.toLocaleString()} EUR</p>
              <div className="mt-4 lg:mt-6 space-y-1 lg:space-y-2">
                 <p className="text-[10px] lg:text-xs text-slate-500 flex justify-between"><span>Active:</span> <span className="font-bold">{stats.breakdown.active.rev} EUR</span></p>
                 <p className="text-[10px] lg:text-xs text-slate-500 flex justify-between"><span>Archived:</span> <span className="font-bold">{stats.breakdown.archived.rev} EUR</span></p>
              </div>
           </div>
           <div className="bg-white p-8 lg:p-12 rounded-3xl lg:rounded-[3rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 lg:mb-4">Total Bookings</p>
              <p className="text-4xl lg:text-6xl font-black text-slate-900">{stats.totalBookings}</p>
              <div className="mt-4 lg:mt-6 space-y-1 lg:space-y-2">
                 <p className="text-[10px] lg:text-xs text-slate-500 flex justify-between"><span>Active:</span> <span className="font-bold">{stats.breakdown.active.count}</span></p>
                 <p className="text-[10px] lg:text-xs text-slate-500 flex justify-between"><span>Archived:</span> <span className="font-bold">{stats.breakdown.archived.count}</span></p>
              </div>
           </div>
           <div className="bg-slate-900 p-8 lg:p-12 rounded-3xl lg:rounded-[3rem] text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 lg:mb-4">Avg. Per Booking</p>
              <p className="text-4xl lg:text-6xl font-black">{stats.totalBookings > 0 ? (stats.revenue / stats.totalBookings).toFixed(2) : '0'} <span className="text-lg lg:text-2xl opacity-50 font-medium">EUR</span></p>
              <p className="text-xs lg:text-base text-slate-500 mt-2 lg:mt-4">Combined lifecycle average</p>
           </div>
        </div>

        <div className="bg-white rounded-3xl lg:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden mb-12 lg:mb-20">
           <div className="p-6 lg:p-10 border-b border-slate-50">
              <h3 className="font-black text-slate-900 lg:text-xl">Status Distribution (Combined)</h3>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-50">
              <div className="p-8 lg:p-16 text-center">
                 <p className="text-2xl lg:text-5xl font-black text-emerald-600">{stats.byStatus.paid}</p>
                 <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Paid</p>
              </div>
              <div className="p-8 lg:p-16 text-center">
                 <p className="text-2xl lg:text-5xl font-black text-blue-600">{stats.byStatus.checked_in}</p>
                 <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">In Storage</p>
              </div>
              <div className="p-8 lg:p-16 text-center">
                 <p className="text-2xl lg:text-5xl font-black text-slate-800">{stats.byStatus.picked_up}</p>
                 <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Picked Up</p>
              </div>
              <div className="p-8 lg:p-16 text-center">
                 <p className="text-2xl lg:text-5xl font-black text-red-500">{stats.byStatus.cancelled}</p>
                 <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Cancelled</p>
              </div>
           </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-3xl lg:rounded-[4rem] p-8 lg:p-16">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-12">
              <div className="max-w-2xl">
                 <h3 className="text-orange-900 font-black text-lg lg:text-3xl mb-1 lg:mb-3">Database Maintenance</h3>
                 <p className="text-orange-700 text-sm lg:text-lg opacity-80 leading-relaxed">Use this tool to archive legacy picked-up data that wasn't automatically moved to the archive collection.</p>
              </div>
              <div>
                 <button 
                  onClick={handleArchiveAll}
                  disabled={archiving}
                  className="px-8 py-4 lg:px-14 lg:py-7 bg-orange-600 text-white rounded-2xl lg:rounded-[2rem] font-black lg:text-xl hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-200 active:scale-95 whitespace-nowrap"
                 >
                    {archiving ? 'Archiving...' : 'Run Catch-up Archive'}
                 </button>
              </div>
           </div>
           {archiveStatus.type && (
             <div className={`mt-6 lg:mt-10 p-4 lg:p-8 rounded-2xl lg:rounded-3xl text-sm lg:text-lg font-black uppercase tracking-widest text-center ${archiveStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {archiveStatus.message}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
