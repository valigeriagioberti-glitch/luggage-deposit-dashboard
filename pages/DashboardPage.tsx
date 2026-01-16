
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Booking, BookingStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import BookingDetailModal from '../components/BookingDetailModal';

type DateFilter = 'all' | 'today' | 'upcoming' | 'past';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

  // Derive the selected booking from the main bookings list for real-time updates in modal
  const selectedBooking = useMemo(() => 
    bookings.find(b => b.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

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
            notes: String(data.dropOff?.notes ?? ""),
            walletIssued: Boolean(data.walletIssued ?? false),
          };
        });

        setBookings(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore bookings snapshot error:", err);
        setBookings([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
    <div className="min-h-screen bg-slate-50 pb-12 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
            <h1 className="font-bold text-lg text-slate-900 hidden sm:block">Admin Console</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Desktop-only Nav Links */}
            <div className="hidden md:flex items-center gap-4 mr-4 border-r pr-4 border-slate-200">
               <Link to="/" className="text-sm font-bold text-blue-600">Bookings</Link>
               <Link to="/reports" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Reports</Link>
            </div>

            {/* Desktop-only Scan Button */}
            <button 
              onClick={() => navigate('/scan')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              <span>Scan QR</span>
            </button>

            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Mobile-only Big Scan QR Button */}
        <div className="sm:hidden mb-6 flex flex-col gap-3">
          <button 
            onClick={() => navigate('/scan')}
            className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl text-xl font-black shadow-xl shadow-blue-200 active:scale-[0.98] transition-all"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            <span>Scan QR Code</span>
          </button>
          <Link to="/reports" className="w-full text-center py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 text-sm">View Stats & Reports</Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Bookings</h2>
            <p className="text-slate-500">Track and update luggage storage requests</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ref, Email, Phone..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full hide-scrollbar">
            {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`whitespace-nowrap px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${dateFilter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full hide-scrollbar">
            {(['all', 'paid', 'checked_in', 'picked_up', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`whitespace-nowrap px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${statusFilter === s ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table/List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-slate-400">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-slate-500 mb-2">No bookings found matching your criteria</p>
              <button onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }} className="text-blue-600 font-semibold text-sm underline">Clear all filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-4 md:px-6">Ref</th>
                    <th className="px-4 py-4 md:px-6">Customer</th>
                    <th className="hidden md:table-cell px-6 py-4">Drop-off</th>
                    <th className="hidden sm:table-cell px-6 py-4">Bags</th>
                    <th className="hidden md:table-cell px-6 py-4">Status</th>
                    <th className="px-4 py-4 md:px-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <tr 
                      key={booking.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedBookingId(booking.id)}
                    >
                      <td className="px-4 py-4 md:px-6 align-top">
                        <span className="font-mono font-bold text-slate-900 block">#{booking.bookingRef}</span>
                        {/* Mobile Details Block */}
                        <div className="md:hidden mt-2 flex flex-col gap-1.5 items-start">
                          <StatusBadge status={booking.status} />
                          <p className="text-[10px] text-slate-500 font-medium">
                            {booking.dropOff.date} {booking.dropOff.time}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:px-6 align-top">
                        <p className="font-semibold text-slate-900 text-sm truncate max-w-[100px] sm:max-w-none">{booking.customer.name}</p>
                        <p className="text-[10px] text-slate-400 hidden sm:block">{booking.customer.email}</p>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 align-top">
                        <p className="text-sm font-medium">{booking.dropOff.date}</p>
                        <p className="text-xs text-slate-400">{booking.dropOff.time}</p>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 align-top">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                          {booking.bags.small + booking.bags.medium + booking.bags.large}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 align-top">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-4 md:px-6 font-bold text-slate-900 text-sm align-top">
                        {booking.totalPaid} {booking.currency.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
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
