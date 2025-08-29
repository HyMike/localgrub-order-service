import admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  } as ServiceAccount),
});

const uid = "binx9lEtSaY3YQBoMYNrnKN9YJk2";

admin
  .auth()
  .setCustomUserClaims(uid, { superuser: true })
  .then(() => {
    console.log(`${uid} is now a superuser.`);
  })
  .catch((error) => {
    console.error("Error setting custom claim:", error);
  });

export const db = getFirestore();
