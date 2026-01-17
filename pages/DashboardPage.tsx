
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
    <div className="h-full grid grid-rows-[auto_1fr_auto] overflow-hidden bg-slate-50">
      
      {/* SECTION 1: TOP FIXED PANEL (NAVBAR + FILTERS) */}
      <div className="flex-none bg-white border-b border-slate-100 shadow-sm z-30">
        <header className="h-16 lg:h-24 flex items-center justify-between px-4 lg:px-12">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 lg:h-12 w-auto" />
            <h1 className="font-black text-lg lg:text-2xl text-slate-900 tracking-tighter uppercase">Terminal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-6 mr-6 border-r pr-6 border-slate-100 lg:mr-10 lg:pr-10 lg:gap-10">
               <Link to="/" className="text-sm lg:text-lg font-black text-blue-600 uppercase tracking-widest px-2 lg:px-6 py-1 lg:py-2">Bookings</Link>
               <Link to="/reports" className="text-sm lg:text-lg font-black text-slate-300 hover:text-blue-600 transition-colors uppercase tracking-widest px-2 lg:px-6 py-1 lg:py-2">Reports</Link>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] lg:text-sm font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-3 py-2 lg:px-8 lg:py-3 transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Search & Header Controls - Compact for App Shell */}
        <div className="max-w-7xl mx-auto px-4 lg:px-12 pb-4 lg:pb-8 space-y-3 lg:space-y-8">
          {queryError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 flex gap-2 items-center">
              <p className="text-[9px] font-mono leading-relaxed truncate">{queryError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-8">
            <div className="flex items-center gap-4 lg:gap-8">
              <h2 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">Orders</h2>
              <div className="bg-slate-100 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl flex lg:gap-1.5">
                 <button 
                  onClick={() => setViewMode('active')}
                  className={`px-3 py-1 lg:px-8 lg:py-2.5 text-[8px] lg:text-xs font-black uppercase tracking-widest rounded-lg lg:rounded-xl transition-all ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setViewMode('archived')}
                  className={`px-3 py-1 lg:px-8 lg:py-2.5 text-[8px] lg:text-xs font-black uppercase tracking-widest rounded-lg lg:rounded-xl transition-all ${viewMode === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Archive
                </button>
              </div>
            </div>
            
            <div className="relative group w-full sm:w-auto">
              <input
                type="text"
                placeholder="Find Guest..."
                className="pl-10 pr-4 py-2 lg:pl-14 lg:pr-8 lg:py-5 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-3xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-64 lg:w-[450px] transition-all font-bold text-sm lg:text-lg text-slate-700 placeholder:text-slate-300 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="w-5 h-5 lg:w-7 lg:h-7 absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            <div className="flex gap-1 lg:gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 lg:px-8 lg:py-4 text-[9px] lg:text-[11px] font-black rounded-lg lg:rounded-2xl border transition-all capitalize whitespace-nowrap ${dateFilter === f ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="h-4 lg:h-8 w-[1px] bg-slate-200 hidden sm:block mx-1 lg:mx-2"></div>
            <div className="flex gap-1 lg:gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {(['all', 'paid', 'checked_in', 'picked_up', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 lg:px-8 lg:py-4 text-[8px] lg:text-[10px] font-black rounded-lg lg:rounded-2xl border transition-all uppercase tracking-tighter whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SCROLLABLE LIST AREA */}
      <main className="app-scroller flex-1 overflow-y-auto bg-slate-50 px-4 py-4 lg:px-12 lg:py-10 overscroll-contain">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 lg:py-40 space-y-4 lg:space-y-6">
                 <div className="w-8 h-8 lg:w-16 lg:h-16 border-3 lg:border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[9px] lg:text-sm text-slate-400 font-black uppercase tracking-[0.2em]">Syncing Terminal...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 lg:py-40 text-center px-6">
                <p className="text-slate-900 font-black text-lg lg:text-3xl mb-1 lg:mb-3">No Orders Found</p>
                <p className="text-slate-400 text-xs lg:text-base mb-4 lg:mb-8">Try adjusting your filters.</p>
                <button onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }} className="text-blue-600 font-black text-[10px] lg:text-sm uppercase tracking-widest hover:underline px-6 py-2">Reset All</button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[8px] lg:text-xs font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="px-4 py-3 lg:px-10 lg:py-6 w-[45%] sm:w-auto">Reference</th>
                      <th className="px-4 py-3 lg:px-10 lg:py-6 w-[55%] sm:w-auto">Guest</th>
                      <th className="hidden lg:table-cell px-10 py-6">Drop-off</th>
                      <th className="hidden sm:table-cell px-6 py-4 lg:px-10 lg:py-6 text-center">Bags</th>
                      <th className="hidden sm:table-cell px-6 py-4 lg:px-10 lg:py-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBookings.map((booking) => (
                      <tr 
                        key={booking.id} 
                        className="hover:bg-blue-50/30 transition-all cursor-pointer group active:bg-slate-100"
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <td className="px-4 py-4 lg:px-10 lg:py-8 align-middle">
                          <span className="font-mono font-black text-slate-900 block text-xs lg:text-base mb-1">#{booking.bookingRef}</span>
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="px-4 py-4 lg:px-10 lg:py-8 align-middle">
                          <p className="font-black text-slate-900 text-xs lg:text-base mb-0.5 truncate">{booking.customer.name}</p>
                          <p className="text-[9px] lg:text-sm text-slate-400 font-bold uppercase tracking-tight truncate">{booking.dropOff.date} • {booking.dropOff.time}</p>
                        </td>
                        <td className="hidden lg:table-cell px-10 py-8 align-middle">
                          <p className="text-xs lg:text-base font-black text-slate-900">{booking.dropOff.date}</p>
                          <p className="text-[9px] lg:text-sm text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">{booking.dropOff.time}</p>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 lg:px-10 lg:py-8 align-middle text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 lg:w-11 lg:h-11 bg-slate-50 rounded-lg lg:rounded-2xl font-black text-[10px] lg:text-sm text-slate-600 border border-slate-100">
                            {booking.bags.small + booking.bags.medium + booking.bags.large}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 lg:px-10 lg:py-8 align-middle text-right">
                          <p className="font-black text-slate-900 text-xs lg:text-base">{booking.totalPaid} {booking.currency}</p>
                          <p className="text-[8px] lg:text-xs text-slate-400 font-bold uppercase">{booking.billableDays}d</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* SECTION 3: BOTTOM FIXED FOOTER (MOBILE SCAN) */}
      <footer className="flex-none sm:hidden p-4 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <button 
           onClick={() => navigate('/scan')}
           className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-base shadow-lg shadow-blue-500/20 active:scale-[0.97] transition-all flex items-center justify-center gap-3"
         >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
           SCAN QR CODE
         </button>
      </footer>

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
