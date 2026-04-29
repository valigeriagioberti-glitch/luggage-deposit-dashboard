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

  const { bookingRef } = req.body;
  if (!bookingRef) return res.status(400).json({ error: 'Booking Reference is required' });

  try {
    let bookingSnap = await db.collection('bookings')
      .where('bookingRef', '==', bookingRef.toUpperCase())
      .limit(1)
      .get();
    
    if (bookingSnap.empty) {
      // Check archive if not found in active
      bookingSnap = await db.collection('bookings_archive')
        .where('bookingRef', '==', bookingRef.toUpperCase())
        .limit(1)
        .get();
        
      if (bookingSnap.empty) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
    }

    const doc = bookingSnap.docs[0];
    const data = doc.data();
    
    const raw = data?.pickUp || data?.pickup || {};
    let pickupDate = "";
    let pickupTime = "";

    if (raw.datetime) {
      // Firebase Timestamp or ISO string
      const dObj = raw.datetime.toDate ? raw.datetime.toDate() : new Date(raw.datetime.seconds ? raw.datetime.seconds * 1000 : raw.datetime);
      
      pickupDate = dObj.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
      pickupTime = dObj.toLocaleTimeString('it-IT', {
        timeZone: 'Europe/Rome',
        hour: "2-digit",
        minute: "2-digit"
      });
    } else {
      pickupDate = raw.date || "";
      pickupTime = raw.time || "";
    }

    return res.status(200).json({
      booking: {
        id: doc.id,
        bookingRef: data?.bookingRef,
        customer: data?.customer,
        bags: data?.bags,
        dropOff: {
          date: data?.dropOff?.date || "",
          time: data?.dropOff?.time || ""
        },
        pickUp: {
          date: pickupDate,
          time: pickupTime,
          datetime: raw.datetime || null
        },
        pickedUpAt: data?.pickedUpAt || null,
        status: data?.status
      }
    });

  } catch (err: any) {
    console.error('Booking Lookup Error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}