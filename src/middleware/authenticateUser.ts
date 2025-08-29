import admin from "firebase-admin";
import { db } from "../utils/firebaseAdmin";

export const verifyUserToken = async (authHeader: string) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const idToken = authHeader.split("Bearer ")[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const uid = decodedToken.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new Error("User not found");
  }

  return {
    uid: uid,
    email: decodedToken.email || "",
    userData: userDoc.data(),
  };
};
