import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as auth from "../middleware/authenticateUser";
import * as orderSvc from "../services/order-service";
import type { Request, Response } from "express";

vi.mock("firebase-admin", () => ({
  default: {
    auth: () => ({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1", email: "e@x.com" }),
    }),
  },
}));

vi.mock("../utils/firebaseAdmin", () => ({
  db: {
    collection: () => ({
      doc: () => ({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      }),
    }),
    doc: () => ({ get: vi.fn(), update: vi.fn(), collection: vi.fn() }),
  },
}));

import { createOrder } from "./order-controller";

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};

const makeReq = (
  headers: Record<string, string> = {},
  body: any = {},
): Request => ({ headers, body }) as unknown as Request;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createOrder", () => {
  it("returns 200 and orderId on success", async () => {
    vi.spyOn(auth, "verifyUserToken").mockResolvedValue({
      uid: "user-1",
      email: "user@example.com",
      userData: { firstName: "F", lastName: "L", email: "user@example.com" },
    } as any);
    vi.spyOn(orderSvc, "createOrderInDatabase").mockResolvedValue("order-123");

    const req = makeReq(
      { authorization: "Bearer token" },
      { itemName: "Burger", quantity: 1 },
    );
    const res = mockRes();

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order created successfully",
      orderId: "order-123",
    });
  });

  it("returns 401 when unauthorized", async () => {
    vi.spyOn(auth, "verifyUserToken").mockRejectedValue(
      new Error("Unauthorized"),
    );

    const req = makeReq({}, {});
    const res = mockRes();

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Unauthorized");
  });

  it("returns 404 when user data not found", async () => {
    vi.spyOn(auth, "verifyUserToken").mockResolvedValue({
      uid: "user-1",
      email: "user@example.com",
      userData: undefined,
    } as any);

    const req = makeReq({ authorization: "Bearer token" }, {});
    const res = mockRes();

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User data not found" });
  });

  it("returns 500 on unexpected error from service", async () => {
    vi.spyOn(auth, "verifyUserToken").mockResolvedValue({
      uid: "user-1",
      email: "user@example.com",
      userData: { firstName: "F", lastName: "L", email: "user@example.com" },
    } as any);
    vi.spyOn(orderSvc, "createOrderInDatabase").mockRejectedValue(
      new Error("db fail"),
    );

    const req = makeReq({ authorization: "Bearer token" }, {});
    const res = mockRes();

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });
});
