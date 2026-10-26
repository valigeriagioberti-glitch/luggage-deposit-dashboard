import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { parseScheduledPickupDate } from "../archive/auto-archive";

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

  try {
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let archivedCheckedInCount = 0;
    let archivedPickedUpCount = 0;

    let batch = db.batch();
    let opCount = 0;

    // 1. Auto-archive bookings that were checked in but not checked out 7 days after scheduled pickup
    const checkedInSnap = await db.collection('bookings')
      .where('status', '==', 'checked_in')
      .get();

    for (const doc of checkedInSnap.docs) {
      const data = doc.data();
      const pickupDate = parseScheduledPickupDate(data);

      if (pickupDate && (now.getTime() - pickupDate.getTime()) >= sevenDaysMs) {
        const archiveRef = db.collection('bookings_archive').doc(doc.id);
        batch.set(archiveRef, {
          ...data,
          status: 'picked_up',
          pickedUpAt: data.pickedUpAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          archivedAt: FieldValue.serverTimestamp(),
          pickedUpBy: 'system_auto_archive',
          autoArchived: true,
          archivedReason: `Auto-archived: Checked in but not checked out after 7 days from scheduled pickup (${pickupDate.toLocaleDateString('it-IT')})`
        });
        batch.delete(doc.ref);
        opCount += 2;
        archivedCheckedInCount++;

        if (opCount >= 400) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }
    }

    // 2. Also move any already picked_up bookings in active collection older than 24h
    const pickedUpSnap = await db.collection('bookings')
      .where('status', '==', 'picked_up')
      .limit(100)
      .get();

    for (const doc of pickedUpSnap.docs) {
      const data = doc.data();
      const archiveRef = db.collection('bookings_archive').doc(doc.id);
      batch.set(archiveRef, {
        ...data,
        archivedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      batch.delete(doc.ref);
      opCount += 2;
      archivedPickedUpCount++;

      if (opCount >= 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      archivedCheckedInCount,
      archivedPickedUpCount,
      totalArchived: archivedCheckedInCount + archivedPickedUpCount,
      message: `Auto-archived ${archivedCheckedInCount} overdue checked-in bookings (7+ days) and ${archivedPickedUpCount} picked-up bookings.`
    });

  } catch (err: any) {
    console.error('Auto-pickup/Auto-archive Cron Error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
