
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
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12 overflow-x-hidden">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
            <h1 className="font-black text-lg text-slate-900 hidden sm:block tracking-tight">Admin Terminal</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-4 mr-4 border-r pr-4 border-slate-200">
               <Link to="/" className="text-sm font-bold text-blue-600">Bookings</Link>
               <Link to="/reports" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Reports</Link>
            </div>
            <button 
              onClick={() => navigate('/scan')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              <span className="hidden sm:inline">Scan QR</span>
            </button>
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {queryError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="font-bold text-xs uppercase tracking-widest">Service Alert</h3>
            </div>
            <p className="text-[10px] font-mono leading-relaxed opacity-80">{queryError}</p>
          </div>
        )}

        {/* Action Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Records</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                  onClick={() => setViewMode('active')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setViewMode('archived')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Archive
                </button>
              </div>
            </div>
            <p className="text-slate-500 font-medium text-sm">Reviewing {viewMode} luggage storage data</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <input
                type="text"
                placeholder="Name, Ref, Phone..."
                className="pl-12 pr-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 w-full sm:w-80 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Flexible Filter Tabs (Wrapped for Mobile) */}
        <div className="space-y-3 mb-8">
          <div className="flex flex-wrap gap-2">
            {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl border-2 transition-all capitalize ${dateFilter === f ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
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
                className={`px-5 py-2.5 text-xs font-bold rounded-xl border-2 transition-all capitalize ${statusFilter === s ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Main List Container */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
          {loading ? (
            <div className="p-32 text-center">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Querying Records...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-32 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-slate-500 font-bold mb-4">No results for this selection</p>
              <button onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Reset All Filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-6 py-5">Reference</th>
                    <th className="px-6 py-5">Guest</th>
                    <th className="hidden md:table-cell px-6 py-5">Drop-off</th>
                    <th className="hidden sm:table-cell px-6 py-5 text-center">Bags</th>
                    <th className="hidden md:table-cell px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBookings.map((booking) => (
                    <tr 
                      key={booking.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer active:bg-slate-100"
                      onClick={() => setSelectedBookingId(booking.id)}
                    >
                      <td className="px-6 py-5 align-top">
                        <span className="font-mono font-black text-slate-900 block text-sm">#{booking.bookingRef}</span>
                        {/* Mobile Status + Time */}
                        <div className="md:hidden mt-2 flex flex-col gap-2 items-start">
                          <StatusBadge status={booking.status} />
                          <p className="text-[10px] text-slate-500 font-bold">
                            {booking.dropOff.date} • {booking.dropOff.time}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <p className="font-black text-slate-900 text-sm truncate max-w-[120px] sm:max-w-none">{booking.customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold hidden sm:block mt-0.5">{booking.customer.email}</p>
                      </td>
                      <td className="hidden md:table-cell px-6 py-5 align-top">
                        <p className="text-sm font-black text-slate-900">{booking.dropOff.date}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">{booking.dropOff.time}</p>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-5 align-top text-center">
                        <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-lg font-black text-slate-600">
                          {booking.bags.small + booking.bags.medium + booking.bags.large}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-5 align-top">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-5 font-black text-slate-900 text-sm align-top text-right">
                        {booking.totalPaid} <span className="text-[10px] text-slate-400 uppercase">{booking.currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Floating Scan Button (Mobile Only) */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
         <button 
           onClick={() => navigate('/scan')}
           className="px-8 py-5 bg-blue-600 text-white rounded-full font-black text-lg shadow-2xl shadow-blue-500/40 active:scale-95 transition-all flex items-center gap-3 border-4 border-white"
         >
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
           Scan QR
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
