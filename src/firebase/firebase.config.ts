import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

const firebaseConfig: ServiceAccount = {
  projectId: 'your-project-id',
  clientEmail: 'your-client-email',
  privateKey: 'your-private-key'.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: 'your-project-id.appspot.com', // Replace with your Firebase Storage bucket
});

export const storage = admin.storage().bucket();
