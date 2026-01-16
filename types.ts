
export type BookingStatus = 'paid' | 'checked_in' | 'picked_up' | 'cancelled';

export interface Customer {
  name: string;
  email: string;
  phone: string;
}

export interface BagCount {
  small: number;
  medium: number;
  large: number;
}

export interface BookingDateTime {
  date: string;
  time: string;
  datetime: any; // Firestore Timestamp
}

export interface Booking {
  id: string; // Document ID
  bookingRef: string;
  stripeSessionId: string;
  createdAt: any; // Firestore Timestamp
  archivedAt?: any; // Firestore Timestamp
  bookedOnRome: string;
  customer: Customer;
  dropOff: BookingDateTime;
  pickUp: BookingDateTime;
  billableDays: number;
  bags: BagCount;
  totalPaid: number;
  currency: string;
  status: BookingStatus;
  notes: string;
  walletIssued: boolean;
}

export interface AdminUser {
  email: string;
  role: 'admin';
}
