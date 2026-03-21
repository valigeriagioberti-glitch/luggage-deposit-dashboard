
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { bookingRef, adminEmail } = req.body;
  if (!bookingRef) return res.status(400).json({ error: 'Booking Reference is required' });

  try {
    // First check active collection
    let bookingSnap = await db.collection('bookings')
      .where('bookingRef', '==', bookingRef.toUpperCase())
      .limit(1)
      .get();
    
    let isArchived = false;

    if (bookingSnap.empty) {
      // Check archive collection
      bookingSnap = await db.collection('bookings_archive')
        .where('bookingRef', '==', bookingRef.toUpperCase())
        .limit(1)
        .get();
        
      if (bookingSnap.empty) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      isArchived = true;
    }

    const doc = bookingSnap.docs[0];
    const data = doc.data();
    const docId = doc.id;
    const originalRef = doc.ref;

    const batch = db.batch();
    
    if (isArchived) {
      // Just update the archive document
      batch.update(originalRef, {
        status: 'picked_up',
        pickedUpAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        pickedUpBy: adminEmail || 'unknown_admin'
      });
    } else {
      // Move from active to archive
      const archiveRef = db.collection('bookings_archive').doc(docId);
      const updatedData = {
        ...data,
        status: 'picked_up',
        pickedUpAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        archivedAt: FieldValue.serverTimestamp(),
        pickedUpBy: adminEmail || 'unknown_admin'
      };
      // 1. Write to archive
      batch.set(archiveRef, updatedData);
      // 2. Delete from active
      batch.delete(originalRef);
    }

    await batch.commit();

    return res.status(200).json({ 
      success: true, 
      message: 'Booking archived successfully.',
      id: docId 
    });

  } catch (err: any) {
    console.error('Archive Pickup Error:', err.message);
    return res.status(500).json({ error: 'Internal server error during archiving.' });
  }
}
