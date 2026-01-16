
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

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

  // Default to 0 days if not provided
  const days = req.body.days || 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTimestamp = Timestamp.fromDate(cutoff);

  try {
    // Query bookings that are picked_up and pickedUpAt is before the cutoff
    const snapshot = await db.collection('bookings')
      .where('status', '==', 'picked_up')
      .where('pickedUpAt', '<=', cutoffTimestamp)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ count: 0, message: 'No bookings match criteria.' });
    }

    const batch = db.batch();
    const count = snapshot.size;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const archiveRef = db.collection('bookings_archive').doc(doc.id);
      
      // Copy to archive with metadata
      batch.set(archiveRef, {
        ...data,
        archivedAt: FieldValue.serverTimestamp()
      });
      
      // Delete original
      batch.delete(doc.ref);
    });

    await batch.commit();

    return res.status(200).json({ 
      success: true, 
      count, 
      message: `Successfully archived ${count} bookings picked up before ${cutoff.toLocaleDateString()}.` 
    });

  } catch (err: any) {
    console.error('Archiving Error:', err.message);
    return res.status(500).json({ error: 'Internal server error during archive process.' });
  }
}
