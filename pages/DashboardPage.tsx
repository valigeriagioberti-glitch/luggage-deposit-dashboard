
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Booking, BookingStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import BookingDetailModal from '../components/BookingDetailModal';

type DateFilter = 'all' | 'today' | 'upcoming' | 'past';
type ViewMode = 'active' | 'archived';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

  const selectedBooking = useMemo(() => 
    bookings.find(b => b.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  useEffect(() => {
    setLoading(true);
    setQueryError(null);
    const collectionName = viewMode === 'active' ? "bookings" : "bookings_archive";
    const sortField = viewMode === 'active' ? "createdAt" : "archivedAt";
    
    try {
      const q = query(collection(db, collectionName), orderBy(sortField, "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs: Booking[] = snapshot.docs.map((d) => {
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
              status: (data.status ?? "paid") as any,
              notes: String(data.notes ?? data.dropOff?.notes ?? ""),
              walletIssued: Boolean(data.walletIssued ?? false),
            };
          });

          setBookings(docs);
          setLoading(false);
          setQueryError(null);
        },
        (err) => {
          console.error(`Firestore ${collectionName} snapshot error:`, err);
          setQueryError(`${err.name}: ${err.message}`);
          setBookings([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setQueryError(err.message);
      setLoading(false);
      return () => {};
    }
  }, [viewMode]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return bookings.filter(b => {
      const s = search.toLowerCase();
      const matchesSearch = !search || 
        b.bookingRef.toLowerCase().includes(s) || 
        b.customer.email.toLowerCase().includes(s) || 
        b.customer.phone.toLowerCase().includes(s) ||
        b.customer.name.toLowerCase().includes(s);

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

      const bookingDate = b.dropOff.date;
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = bookingDate === todayStr;
      else if (dateFilter === 'upcoming') matchesDate = bookingDate > todayStr;
      else if (dateFilter === 'past') matchesDate = bookingDate < todayStr;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, search, dateFilter, statusFilter]);

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-slate-50 pb-32 sm:pb-32 overflow-x-hidden flex flex-col">
      {/* App Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
            <h1 className="font-black text-lg text-slate-900 hidden sm:block tracking-tighter uppercase">Terminal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-6 mr-6 border-r pr-6 border-slate-100">
               <Link to="/" className="text-sm font-black text-blue-600 uppercase tracking-widest">Bookings</Link>
               <Link to="/reports" className="text-sm font-black text-slate-300 hover:text-blue-600 transition-colors uppercase tracking-widest">Reports</Link>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-3 py-2 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 w-full flex-1">
        {queryError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-3xl text-red-600 animate-in fade-in duration-300 flex gap-3 items-center">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-[10px] font-mono leading-relaxed">{queryError}</p>
          </div>
        )}

        {/* Page Heading & Search */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Orders</h2>
                <div className="bg-slate-200 p-1 rounded-2xl flex shadow-inner">
                   <button 
                    onClick={() => setViewMode('active')}
                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setViewMode('archived')}
                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'archived' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
            
            <div className="relative group w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search Guest or Ref..."
                className="pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 w-full sm:w-80 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* HIERARCHICAL FILTERS */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-5 py-2.5 text-[10px] font-black rounded-2xl border-2 transition-all capitalize shadow-sm ${dateFilter === f ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'paid', 'checked_in', 'picked_up', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-[9px] font-black rounded-xl border transition-all capitalize uppercase tracking-widest ${statusFilter === s ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Container - Table fixed for mobile, zero horizontal scroll */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[400px] mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-32 space-y-4">
               <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Syncing...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-200">
                 <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
              <p className="text-slate-900 font-black text-xl mb-2">Empty Records</p>
              <button onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Reset Filters</button>
            </div>
          ) : (
            <div className="sm:overflow-x-auto overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-6 py-5 w-[42%] sm:w-auto">Reference</th>
                    <th className="px-6 py-5 w-[58%] sm:w-auto">Guest</th>
                    <th className="hidden lg:table-cell px-8 py-6">Drop-off</th>
                    <th className="hidden sm:table-cell px-8 py-6 text-center">Bags</th>
                    <th className="hidden sm:table-cell px-8 py-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBookings.map((booking) => (
                    <tr 
                      key={booking.id} 
                      className="hover:bg-blue-50/30 transition-all cursor-pointer group active:bg-slate-100"
                      onClick={() => setSelectedBookingId(booking.id)}
                    >
                      <td className="px-6 py-5 align-top">
                        <span className="font-mono font-black text-slate-900 block text-sm mb-2">#{booking.bookingRef}</span>
                        <div className="flex items-center gap-1.5">
                           <StatusBadge status={booking.status} />
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <p className="font-black text-slate-900 text-sm mb-0.5 truncate">{booking.customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{booking.dropOff.date} • {booking.dropOff.time}</p>
                      </td>
                      <td className="hidden lg:table-cell px-8 py-6 align-top">
                        <p className="text-sm font-black text-slate-900">{booking.dropOff.date}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{booking.dropOff.time}</p>
                      </td>
                      <td className="hidden sm:table-cell px-8 py-6 align-top text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-xl font-black text-xs text-slate-600 border border-slate-200">
                          {booking.bags.small + booking.bags.medium + booking.bags.large}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-8 py-6 align-top text-right">
                        <p className="font-black text-slate-900 text-sm">{booking.totalPaid} {booking.currency}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{booking.billableDays}d</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer Compliance Spacer */}
        <div className="h-32 sm:hidden"></div>
      </main>

      {/* MOBILE STICKY FOOTER ACTION (Recommended UX) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-5 bg-white/90 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-15px_40px_rgba(0,0,0,0.08)]">
         <button 
           onClick={() => navigate('/scan')}
           className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
         >
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
           SCAN
         </button>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
};

export default DashboardPage;
