import * as jwt from 'jsonwebtoken';
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const secret = process.env.CHECKIN_JWT_SECRET;
    if (!secret) throw new Error('JWT Secret missing');

    const decoded: any = jwt.verify(token, secret);
    
    if (decoded.type !== 'checkin' || !decoded.bookingRef) {
      return res.status(400).json({ error: 'Invalid token structure' });
    }

    // Query by bookingRef field instead of doc ID
    const bookingSnap = await db.collection('bookings')
      .where('bookingRef', '==', decoded.bookingRef)
      .limit(1)
      .get();
    
    if (bookingSnap.empty) {
      return res.status(404).json({ error: 'Booking not found in database.' });
    }

    const doc = bookingSnap.docs[0];
    const data = doc.data();
    
    return res.status(200).json({
      booking: {
        id: doc.id,
        bookingRef: data?.bookingRef,
        customer: data?.customer,
        bags: data?.bags,
        dropOff: data?.dropOff,
        status: data?.status
      }
    });

  } catch (err: any) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ error: 'QR code is expired or invalid.' });
  }
}