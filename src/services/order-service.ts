import { CreateOrderData } from "../types/UserInfo";
import { UserInfo } from "../types/UserInfo";
import { db } from "../utils/firebaseAdmin";
import sendOrder from "./order-queue-producer";

export const createOrderInDatabase = async (
  uid: string,
  orderData: CreateOrderData,
  userData: UserInfo,
) => {
  try {
    const ordersRef = db.collection("users").doc(uid).collection("orders");
    const userOrder = {
      ...orderData,
      createdAt: new Date().toISOString(),
    };

    const orderRef = await ordersRef.add({
      ...userOrder,
      status: "pending",
    });

    const order = {
      uid,
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      ...userOrder,
    };
    await sendOrder(order);

    return orderRef.id;
  } catch (error) {
    console.error("Error creating order in database:", error);
    throw new Error("Failed to create order in database");
  }
};
