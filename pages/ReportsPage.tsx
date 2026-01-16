
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Booking } from '../types';
import { signOut } from 'firebase/auth';

type ReportMode = 'day' | 'month' | 'year';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReportMode>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0].substring(0, 7); // Default to current month YYYY-MM
  });
  
  const [archiveStatus, setArchiveStatus] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});
  const [archiving, setArchiving] = useState(false);

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Booking[] = snapshot.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          bookingRef: String(data.bookingRef ?? ""),
          stripeSessionId: String(data.stripeSessionId ?? ""),
          createdAt: data.createdAt ?? null,
          bookedOnRome: "",
          customer: data.customer,
          dropOff: data.dropOff,
          pickUp: data.pickUp,
          billableDays: Number(data.billableDays ?? 0),
          bags: data.bags,
          totalPaid: Number(data.totalPaid ?? 0),
          currency: String(data.currency ?? "EUR"),
          status: data.status,
          notes: data.notes ?? "",
          walletIssued: Boolean(data.walletIssued ?? false),
        };
      });
      setBookings(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const filtered = bookings.filter(b => {
      const bDate = b.dropOff.date; // Filtering by dropOff date for revenue reporting
      if (mode === 'day') return bDate === selectedDate;
      if (mode === 'month') return bDate.startsWith(selectedDate);
      if (mode === 'year') return bDate.startsWith(selectedDate.substring(0, 4));
      return false;
    });

    const totalBookings = filtered.length;
    const revenue = filtered.reduce((acc, b) => b.status !== 'cancelled' ? acc + b.totalPaid : acc, 0);
    
    const byStatus = {
      paid: filtered.filter(b => b.status === 'paid').length,
      checked_in: filtered.filter(b => b.status === 'checked_in').length,
      picked_up: filtered.filter(b => b.status === 'picked_up').length,
      cancelled: filtered.filter(b => b.status === 'cancelled').length,
    };

    return { totalBookings, revenue, byStatus };
  }, [bookings, mode, selectedDate]);

  const handleArchive = async () => {
    if (!window.confirm("Are you sure you want to archive picked-up bookings older than 7 days? This action moves records to the archive collection and clears the main dashboard.")) return;
    
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
    <div className="min-h-screen bg-slate-50 pb-12 overflow-x-hidden">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><img src={logoUrl} alt="Logo" className="h-8 w-auto" /></Link>
            <h1 className="font-bold text-lg text-slate-900 hidden sm:block">Admin Reports</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 mr-4 border-r pr-4 border-slate-200">
               <Link to="/" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Bookings</Link>
               <Link to="/reports" className="text-sm font-bold text-blue-600">Reports</Link>
            </div>
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Performance Stats</h2>
            <p className="text-slate-500">Analyze revenue and booking volume</p>
        </div>

        {/* Report Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
           <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
              {(['day', 'month', 'year'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === 'year') setSelectedDate(new Date().getFullYear().toString());
                    else if (m === 'month') setSelectedDate(new Date().toISOString().substring(0, 7));
                    else setSelectedDate(new Date().toISOString().substring(0, 10));
                  }}
                  className={`px-6 py-2 text-sm font-bold rounded-xl transition-all capitalize ${mode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {m}
                </button>
              ))}
           </div>

           <div className="flex items-center gap-3">
              <input 
                type={mode === 'day' ? 'date' : mode === 'month' ? 'month' : 'number'}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedDate}
                min={mode === 'year' ? 2024 : undefined}
                max={mode === 'year' ? 2030 : undefined}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Selected Period</span>
           </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Revenue</p>
              <p className="text-4xl font-black text-emerald-600">{stats.revenue.toLocaleString()} EUR</p>
              <p className="text-xs text-slate-400 mt-2">Sum of non-cancelled payments</p>
           </div>
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Bookings</p>
              <p className="text-4xl font-black text-slate-900">{stats.totalBookings}</p>
              <p className="text-xs text-slate-400 mt-2">Total requests in selected period</p>
           </div>
           <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Avg. Per Booking</p>
              <p className="text-4xl font-black">{stats.totalBookings > 0 ? (stats.revenue / stats.totalBookings).toFixed(2) : '0'} <span className="text-lg opacity-50">EUR</span></p>
              <p className="text-xs text-slate-500 mt-2">Revenue / Bookings ratio</p>
           </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-12">
           <div className="p-6 border-b border-slate-50">
              <h3 className="font-bold text-slate-900">Status Distribution</h3>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-50">
              <div className="p-8 text-center">
                 <p className="text-2xl font-black text-emerald-600">{stats.byStatus.paid}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Paid</p>
              </div>
              <div className="p-8 text-center">
                 <p className="text-2xl font-black text-blue-600">{stats.byStatus.checked_in}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">In Storage</p>
              </div>
              <div className="p-8 text-center">
                 <p className="text-2xl font-black text-slate-800">{stats.byStatus.picked_up}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Picked Up</p>
              </div>
              <div className="p-8 text-center">
                 <p className="text-2xl font-black text-red-500">{stats.byStatus.cancelled}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Cancelled</p>
              </div>
           </div>
        </div>

        {/* Archive Section */}
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-lg">
                 <h3 className="text-orange-900 font-bold text-lg mb-1">Database Maintenance</h3>
                 <p className="text-orange-700 text-sm">Keep your dashboard fast by archiving old completed records. Archived bookings are moved to the <code>bookings_archive</code> collection and removed from the active view.</p>
              </div>
              <div>
                 <button 
                  onClick={handleArchive}
                  disabled={archiving}
                  className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-200 whitespace-nowrap"
                 >
                    {archiving ? 'Archiving...' : 'Archive Picked-Up (> 7 days)'}
                 </button>
              </div>
           </div>
           {archiveStatus.type && (
             <div className={`mt-4 p-4 rounded-xl text-sm font-bold ${archiveStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {archiveStatus.message}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
