import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";

// let getMock: any;
// let updateMock: any;
// let docMock: any;

const { getMock, updateMock, docMock } = vi.hoisted(() => {
  const get = vi.fn();
  const update = vi.fn();
  const doc = vi.fn(() => ({ get, update }));
  return { getMock: get, updateMock: update, docMock: doc };
});

vi.mock("../utils/firebaseAdmin", () => {
  return {
    db: { doc: docMock },
  };
});

vi.mock("../services/user-service", () => ({
  getNameEmailItemQuantity: vi.fn(),
}));

vi.mock("../services/order-ready-producer", () => ({
  orderReady: vi.fn(),
}));

import { orderCompleted } from "./order-ready-controller";

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const makeReq = (body: any): Request => ({ body }) as unknown as Request;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("orderCompleted", () => {
  it("returns 404 when order does not exist", async () => {
    getMock.mockResolvedValueOnce({ exists: false, data: () => undefined });
    const req = makeReq({ orderId: "o1", userId: "u1" });
    const res = mockRes();

    await orderCompleted(req, res);

    expect(docMock).toHaveBeenCalledWith("users/u1/orders/o1");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
  });

  it("updates status, calls orderReady, and returns 200 on success", async () => {
    const { getNameEmailItemQuantity } = await import(
      "../services/user-service"
    );
    const { orderReady } = await import("../services/order-ready-producer");

    getMock.mockResolvedValueOnce({ exists: true });
    updateMock.mockResolvedValueOnce(undefined);
    vi.mocked(getNameEmailItemQuantity).mockResolvedValueOnce({
      name: "User",
      email: "u@example.com",
      itemName: "Burger",
      quantity: 1,
    } as any);

    const req = makeReq({ orderId: "o1", userId: "u1" });
    const res = mockRes();

    await orderCompleted(req, res);

    expect(updateMock).toHaveBeenCalledWith({ status: "Ready" });
    expect(getNameEmailItemQuantity).toHaveBeenCalledWith("u1", "o1");
    expect(orderReady).toHaveBeenCalledWith({
      name: "User",
      email: "u@example.com",
      itemName: "Burger",
      quantity: 1,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order status updated successfully",
    });
  });

  it("returns 500 on unexpected errors", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));
    const req = makeReq({ orderId: "o1", userId: "u1" });
    const res = mockRes();

    await orderCompleted(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to update order status",
    });
  });
});
