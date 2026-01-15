import * as jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const secret = process.env.CHECKIN_JWT_SECRET;
    if (!secret) throw new Error('JWT Secret missing');

    const decoded: any = jwt.verify(token, secret);
    
    if (decoded.type !== 'checkin') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const bookingDoc = await db.collection('bookings').doc(decoded.bookingId).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking document not found' });
    }

    const data = bookingDoc.data();
    return res.status(200).json({
      booking: {
        id: bookingDoc.id,
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