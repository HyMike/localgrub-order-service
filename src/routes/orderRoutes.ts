import { Router } from "express";
import { createOrder } from "../controllers/order-controller";
import { orderCompleted } from "../controllers/order-ready-controller";

const router = Router();

router.post("/success", createOrder);
router.post("/order-ready", orderCompleted as any);

export default router;
