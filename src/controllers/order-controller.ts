import { Request, Response } from "express";
import admin from "firebase-admin";
import { db } from "../utils/firebaseAdmin";
import sendOrder from "../services/order-queue-producer";
import { verifyUserToken } from "../middleware/authenticateUser";
import { createOrderInDatabase } from "../services/order-service";

const createOrder = async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization || "";

  try {
    const { uid, email, userData } = await verifyUserToken(authHeader);

    if (!userData) {
      return res.status(404).json({ message: "User data not found" });
    }
    const orderId = await createOrderInDatabase(uid, req.body, userData as any);
    res.status(200).json({
      message: "Order created successfully",
      orderId,
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);

    if (error.message === "Unauthorized") {
      return res.status(401).send("Unauthorized");
    }
    if (error.message === "User data not found") {
      return res.status(404).json({ message: "User data not found" });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

export { createOrder };
