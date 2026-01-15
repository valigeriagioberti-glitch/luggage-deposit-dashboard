
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
// Standardizing modular Firebase Auth import for signOut
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Booking, BookingStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import BookingDetailModal from '../components/BookingDetailModal';

type DateFilter = 'all' | 'today' | 'upcoming' | 'past';

const DashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const logoUrl = "https://cdn.shopify.com/s/files/1/0753/8144/0861/files/cropped-Untitled-design-2025-09-11T094640.576_1.png?v=1765462614&width=160&format=webp";

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

        // Not in your Firestore doc, keep safe
        bookedOnRome: "",

        customer: {
          name: String(data.customer?.name ?? ""),
          email: String(data.customer?.email ?? ""),
          phone: String(data.customer?.phone ?? ""),
        },

        dropOff: {
          date: String(data.dropOff?.date ?? ""),
          time: String(data.dropOff?.time ?? ""),
          datetime: data.dropOff?.datetime ?? null, // may not exist
        },

        pickUp: {
          date: String(data.pickUp?.date ?? ""),
          time: String(data.pickUp?.time ?? ""),
          datetime: data.pickUp?.datetime ?? null, // may not exist
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

        // your Firestore doc uses dropOff.notes, not notes
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

  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let result = bookings.filter(b => {
      // Search logic
      const s = search.toLowerCase();
      const matchesSearch = !search || 
        b.bookingRef.toLowerCase().includes(s) || 
        b.customer.email.toLowerCase().includes(s) || 
        b.customer.phone.toLowerCase().includes(s) ||
        b.customer.name.toLowerCase().includes(s);

      // Status logic
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

      // Date logic
      const bookingDate = b.dropOff.date;
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = bookingDate === todayStr;
      else if (dateFilter === 'upcoming') matchesDate = bookingDate > todayStr;
      else if (dateFilter === 'past') matchesDate = bookingDate < todayStr;

      return matchesSearch && matchesStatus && matchesDate;
    });

    setFilteredBookings(result);
  }, [bookings, search, dateFilter, statusFilter]);

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
            <h1 className="font-bold text-lg text-slate-900 hidden sm:block">Admin Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-medium hidden md:block">{auth.currentUser?.email}</span>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Bookings</h2>
            <p className="text-slate-500">Track and update luggage storage requests</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
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
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${dateFilter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['all', 'paid', 'checked_in', 'picked_up', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${statusFilter === s ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
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
                    <th className="px-6 py-4">Ref</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Drop-off</th>
                    <th className="px-6 py-4">Bags</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <tr 
                      key={booking.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900">#{booking.bookingRef}</span>
                        <div className="text-[10px] text-slate-400">{booking.bookedOnRome}</div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{booking.customer.name}</p>
                        <p className="text-xs text-slate-500">{booking.customer.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">{booking.dropOff.date}</p>
                        <p className="text-xs text-slate-400">{booking.dropOff.time}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm px-2 py-1 bg-slate-100 rounded-md font-medium text-slate-700">
                          {booking.bags.small + booking.bags.medium + booking.bags.large}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{booking.totalPaid} {booking.currency.toUpperCase()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
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
          onClose={() => setSelectedBooking(null)}
          onUpdate={() => setSelectedBooking(prev => bookings.find(b => b.id === prev?.id) || null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
