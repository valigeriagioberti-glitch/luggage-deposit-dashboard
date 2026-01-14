
/* 
  THIS IS A SERVER-SIDE VERCEL FUNCTION TEMPLATE.
  INSTALL: npm install stripe firebase-admin
*/

import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Private Key from Env Var)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!))
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const metadata = session.metadata || {};
      const bookingRef = metadata.bookingRef;
      
      // Use bookingRef as the document ID for idempotency
      const docRef = db.collection('bookings').doc(bookingRef);

      const bookingData = {
        bookingRef,
        stripeSessionId: session.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        bookedOnRome: new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
        customer: {
          name: session.customer_details?.name || 'N/A',
          email: session.customer_details?.email || 'N/A',
          phone: session.customer_details?.phone || 'N/A'
        },
        dropOff: {
          date: metadata.dropOffDate,
          time: metadata.dropOffTime,
          datetime: admin.firestore.Timestamp.fromDate(new Date(`${metadata.dropOffDate}T${metadata.dropOffTime}`))
        },
        pickUp: {
          date: metadata.pickUpDate,
          time: metadata.pickUpTime,
          datetime: admin.firestore.Timestamp.fromDate(new Date(`${metadata.pickUpDate}T${metadata.pickUpTime}`))
        },
        billableDays: Number(metadata.billableDays),
        bags: {
          small: Number(metadata.bagsSmall || 0),
          medium: Number(metadata.bagsMedium || 0),
          large: Number(metadata.bagsLarge || 0)
        },
        totalPaid: (session.amount_total || 0) / 100,
        currency: session.currency || 'eur',
        status: 'paid',
        notes: '',
        walletIssued: false
      };

      // set(..., {merge: true}) ensures idempotency
      await docRef.set(bookingData, { merge: true });
    }
  }

  res.status(200).json({ received: true });
}
