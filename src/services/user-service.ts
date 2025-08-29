import { db } from "../utils/firebaseAdmin";

export const getOrderByUserId = async (orderId: string, userId: string) => {
  try {
    const orderPath = `users/${userId}/orders/${orderId}`;

    const orderRef = db.doc(orderPath);
    const orderSnap = await orderRef.get();

    if (orderSnap.exists) {
      return orderSnap.data();
    } else {
      console.log("Order not found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching order:", error);
    throw new Error("Failed to fetch order.");
  }
};

export const getNameEmailItemQuantity = async (
  userId: string,
  orderId: string,
) => {
  try {
    const userRef = db.doc(`users/${userId}`);
    const orderRef = db.doc(`users/${userId}/orders/${orderId}`);

    const [userSnap, orderSnap] = await Promise.all([
      userRef.get(),
      orderRef.get(),
    ]);

    if (!userSnap.exists) {
      console.log("User not found");
      return null;
    }

    if (!orderSnap.exists) {
      console.log("Order not found");
      return null;
    }

    const userData = userSnap.data();
    const orderData = orderSnap.data();
    console.log("Order data:", orderData);
    return {
      name: userData?.firstName || "",
      email: userData?.email || "",
      itemName: orderData?.name || "",
      quantity: orderData?.quantity || 0,
    };
  } catch (error) {
    console.error("Error fetching order and user info:", error);
    throw new Error("Failed to fetch order and user data.");
  }
};
