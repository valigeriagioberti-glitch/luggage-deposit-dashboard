import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
  // Allow GET or POST for cron jobs
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Optional: Add some authorization header check if you want to secure it
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    const now = new Date();
    let updatedCount = 0;

    // 1. Check active bookings
    const activeBookingsSnap = await db.collection('bookings')
      .where('pickUp.datetime', '<', now)
      .limit(200) // Limit to avoid batch limits
      .get();

    let batch = db.batch();
    let opCount = 0;

    activeBookingsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'picked_up' && data.status !== 'cancelled') {
        const archiveRef = db.collection('bookings_archive').doc(doc.id);
        batch.set(archiveRef, {
          ...data,
          status: 'picked_up',
          pickedUpAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          archivedAt: FieldValue.serverTimestamp(),
          pickedUpBy: 'system_auto_pickup'
        });
        batch.delete(doc.ref);
        opCount += 2;
        updatedCount++;
      }
    });

    // 2. Check archived bookings
    const archivedBookingsSnap = await db.collection('bookings_archive')
      .where('pickUp.datetime', '<', now)
      .limit(200) // Limit to avoid batch limits
      .get();

    archivedBookingsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'picked_up' && data.status !== 'cancelled') {
        batch.update(doc.ref, {
          status: 'picked_up',
          pickedUpAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          pickedUpBy: 'system_auto_pickup'
        });
        opCount++;
        updatedCount++;
      }
    });

    if (opCount > 0) {
      await batch.commit();
    }

    return res.status(200).json({ success: true, updatedCount });

  } catch (err: any) {
    console.error('Auto-pickup Cron Error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
