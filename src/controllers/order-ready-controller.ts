import { db } from "../utils/firebaseAdmin";
import { getNameEmailItemQuantity } from "../services/user-service";
import { orderReady } from "../services/order-ready-producer";
import { Request, Response } from "express";

export const orderCompleted = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { orderId, userId } = req.body;

  try {
    const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ message: "Order not found" });
    }
    await orderRef.update({ status: "Ready" });
    const userInfo = await getNameEmailItemQuantity(userId, orderId);

    orderReady(userInfo!);
    return res
      .status(200)
      .json({ message: "Order status updated successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update order status" });
  }
};
