
# Luggage Deposit Rome - Admin Setup Instructions

## 1. Firebase Admin Allow-List
Only emails in the `admins` collection with `active: true` can access the dashboard.

### Specific Admin Emails to Add:
- `giobertisnc42@gmail.com`
- `valigeriagioberti@gmail.com`

### How to add/remove admins:
1. Open the **Firebase Console**.
2. Go to **Firestore Database**.
3. In the `admins` collection, create a document for each user.
   - **Document ID**: The user's full email address (e.g., `giobertisnc42@gmail.com`).
   - **Fields**:
     - `role`: "admin" (string)
     - `active`: true (boolean)
4. Go to **Authentication** and ensure the user has an account (or they can sign up/be created).

## 2. Environment Variables
Add these to your Vercel project settings:
- `FIREBASE_API_KEY`: Your Firebase Web API Key.
- `FIREBASE_PROJECT_ID`: `luggage-deposit-rome`
- `FIREBASE_AUTH_DOMAIN`: `luggage-deposit-rome.firebaseapp.com`
- `FIREBASE_APP_ID`: Your Firebase App ID.

## 3. Firestore Security Rules
Ensure the rules in `firestore.rules` are published to your Firebase project. They enforce:
- No public access to bookings.
- Only authenticated users found in the `admins` collection can read/write data.
- The `active` flag must be `true`.

## 4. End-to-End Test Checklist
- [ ] **Auth Check**: Try logging in with an email NOT in the allow-list. You should be redirected to the `/unauthorized` page.
- [ ] **Admin Access**: Login with `giobertisnc42@gmail.com`. You should see the dashboard.
- [ ] **Data Security**: Try to access Firestore via the browser console without being logged in (should be blocked by rules).
- [ ] **Status Update**: Verify that changing a booking status (e.g., to "Checked In") updates Firestore correctly.
