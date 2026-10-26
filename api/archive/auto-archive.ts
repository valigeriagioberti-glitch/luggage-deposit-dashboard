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

export function parseScheduledPickupDate(data: any): Date | null {
  const raw = data?.pickUp || data?.pickup;
  if (!raw) return null;

  // 1. Check datetime object (Firestore Timestamp, Date, seconds, ISO string)
  if (raw.datetime) {
    if (typeof raw.datetime.toDate === 'function') {
      const d = raw.datetime.toDate();
      if (!isNaN(d.getTime())) return d;
    }
    if (raw.datetime.seconds) {
      const d = new Date(raw.datetime.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(raw.datetime);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check date string
  if (raw.date && typeof raw.date === 'string') {
    const rawDateStr = raw.date.trim();
    const timeStr = (raw.time && typeof raw.time === 'string' && raw.time.trim()) 
      ? raw.time.trim() 
      : '23:59:59';

    // Standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr)) {
      const d = new Date(`${rawDateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`);
      if (!isNaN(d.getTime())) return d;
    }

    // Italian / European DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDateStr)) {
      const [day, month, year] = rawDateStr.split('/').map(Number);
      const timeParts = timeStr.split(':').map(Number);
      const hours = timeParts[0] || 23;
      const minutes = timeParts[1] || 59;
      const d = new Date(year, month - 1, day, hours, minutes, 0);
      if (!isNaN(d.getTime())) return d;
    }

    const fallback = new Date(rawDateStr);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  // Allow GET or POST for webhooks, cron, or manual trigger
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const days = Number(req.body?.days ?? req.query?.days ?? 7);
  const adminEmail = req.body?.adminEmail || 'system_auto_archive';

  try {
    const now = new Date();
    const cutoffMs = days * 24 * 60 * 60 * 1000;

    // Find all bookings that are currently checked_in
    const checkedInSnap = await db.collection('bookings')
      .where('status', '==', 'checked_in')
      .get();

    if (checkedInSnap.empty) {
      return res.status(200).json({
        success: true,
        count: 0,
        checkedCount: 0,
        message: 'No checked-in bookings found.'
      });
    }

    let batch = db.batch();
    let opCount = 0;
    let archivedCount = 0;
    const archivedRefs: string[] = [];

    for (const doc of checkedInSnap.docs) {
      const data = doc.data();
      const pickupDate = parseScheduledPickupDate(data);

      if (!pickupDate) {
        continue;
      }

      // Check if 7 days (or configured days) have passed since the scheduled pickup date
      const timeSincePickup = now.getTime() - pickupDate.getTime();
      if (timeSincePickup >= cutoffMs) {
        const archiveRef = db.collection('bookings_archive').doc(doc.id);
        
        batch.set(archiveRef, {
          ...data,
          status: 'picked_up', // Marked as picked_up in archive
          pickedUpAt: data.pickedUpAt || FieldValue.serverTimestamp(),
          archivedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          pickedUpBy: adminEmail,
          autoArchived: true,
          archivedReason: `Auto-archived: Checked in but not checked out after ${days} days from scheduled pickup (${pickupDate.toLocaleDateString('it-IT')})`
        });

        batch.delete(doc.ref);
        opCount += 2;
        archivedCount++;
        archivedRefs.push(data.bookingRef || doc.id);

        // Firestore batch limit is 500 operations
        if (opCount >= 400) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      count: archivedCount,
      checkedCount: checkedInSnap.size,
      archivedBookings: archivedRefs,
      message: `Successfully auto-archived ${archivedCount} booking(s) checked in and 7+ days past scheduled pickup.`
    });

  } catch (err: any) {
    console.error('Auto-Archive Error:', err.message);
    return res.status(500).json({ error: 'Internal server error during auto-archive.' });
  }
}
