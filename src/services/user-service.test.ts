import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrderByUserId, getNameEmailItemQuantity } from "./user-service";
import { db } from "../utils/firebaseAdmin";

vi.mock("../utils/firebaseAdmin", () => ({
  db: {
    doc: vi.fn(),
  },
}));

describe("user-service", () => {
  let mockDoc: any;
  let mockOrderSnap: any;
  let mockUserSnap: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderSnap = {
      exists: true,
      data: vi.fn(),
    };

    mockUserSnap = {
      exists: true,
      data: vi.fn(),
    };

    mockDoc = {
      get: vi.fn(),
    };

    (db.doc as any).mockReturnValue(mockDoc);
  });

  describe("getOrderByUserId", () => {
    it("should return order data when order exists", async () => {
      const mockOrderData = {
        itemName: "Pizza",
        quantity: 2,
        price: 15.99,
        status: "pending",
      };

      mockOrderSnap.data.mockReturnValue(mockOrderData);
      mockDoc.get.mockResolvedValue(mockOrderSnap);

      const result = await getOrderByUserId("order123", "user456");

      expect(db.doc).toHaveBeenCalledWith("users/user456/orders/order123");
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockOrderData);
    });

    it("should return null when order does not exist", async () => {
      mockOrderSnap.exists = false;
      mockDoc.get.mockResolvedValue(mockOrderSnap);

      const result = await getOrderByUserId("nonexistent", "user456");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockDoc.get.mockRejectedValue(dbError);

      await expect(getOrderByUserId("order123", "user456")).rejects.toThrow(
        "Failed to fetch order.",
      );
    });
  });

  describe("getNameEmailItemQuantity", () => {
    it("should return user and order data when both exist", async () => {
      const mockUserData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const mockOrderData = {
        name: "Pepperoni Pizza",
        quantity: 3,
        price: 20.99,
      };

      mockUserSnap.data.mockReturnValue(mockUserData);
      mockOrderSnap.data.mockReturnValue(mockOrderData);

      const mockUserDoc = { get: vi.fn().mockResolvedValue(mockUserSnap) };
      const mockOrderDoc = { get: vi.fn().mockResolvedValue(mockOrderSnap) };

      (db.doc as any)
        .mockReturnValueOnce(mockUserDoc)
        .mockReturnValueOnce(mockOrderDoc);

      const result = await getNameEmailItemQuantity("user456", "order123");

      expect(db.doc).toHaveBeenCalledWith("users/user456");
      expect(db.doc).toHaveBeenCalledWith("users/user456/orders/order123");
      expect(result).toEqual({
        name: "John",
        email: "john@example.com",
        itemName: "Pepperoni Pizza",
        quantity: 3,
      });
    });

    it("should return null when user does not exist", async () => {
      mockUserSnap.exists = false;
      const mockUserDoc = { get: vi.fn().mockResolvedValue(mockUserSnap) };

      (db.doc as any).mockReturnValue(mockUserDoc);

      const result = await getNameEmailItemQuantity("nonexistent", "order123");

      expect(result).toBeNull();
    });

    it("should return null when order does not exist", async () => {
      const mockUserData = { firstName: "John", email: "john@example.com" };
      mockUserSnap.data.mockReturnValue(mockUserData);
      mockOrderSnap.exists = false;

      const mockUserDoc = { get: vi.fn().mockResolvedValue(mockUserSnap) };
      const mockOrderDoc = { get: vi.fn().mockResolvedValue(mockOrderSnap) };

      (db.doc as any)
        .mockReturnValueOnce(mockUserDoc)
        .mockReturnValueOnce(mockOrderDoc);

      const result = await getNameEmailItemQuantity("user456", "nonexistent");

      expect(result).toBeNull();
    });

    it("should handle missing user data gracefully", async () => {
      const mockUserData = {
        firstName: "",
        email: "john@example.com",
      };

      const mockOrderData = {
        name: "Pizza",
        quantity: 2,
      };

      mockUserSnap.data.mockReturnValue(mockUserData);
      mockOrderSnap.data.mockReturnValue(mockOrderData);

      const mockUserDoc = { get: vi.fn().mockResolvedValue(mockUserSnap) };
      const mockOrderDoc = { get: vi.fn().mockResolvedValue(mockOrderSnap) };

      (db.doc as any)
        .mockReturnValueOnce(mockUserDoc)
        .mockReturnValueOnce(mockOrderDoc);

      const result = await getNameEmailItemQuantity("user456", "order123");

      expect(result).toEqual({
        name: "",
        email: "john@example.com",
        itemName: "Pizza",
        quantity: 2,
      });
    });

    it("should handle missing order data gracefully", async () => {
      const mockUserData = { firstName: "John", email: "john@example.com" };
      const mockOrderData = {
        name: "",
        quantity: undefined,
      };

      mockUserSnap.data.mockReturnValue(mockUserData);
      mockOrderSnap.data.mockReturnValue(mockOrderData);

      const mockUserDoc = { get: vi.fn().mockResolvedValue(mockUserSnap) };
      const mockOrderDoc = { get: vi.fn().mockResolvedValue(mockOrderSnap) };

      (db.doc as any)
        .mockReturnValueOnce(mockUserDoc)
        .mockReturnValueOnce(mockOrderDoc);

      const result = await getNameEmailItemQuantity("user456", "order123");

      expect(result).toEqual({
        name: "John",
        email: "john@example.com",
        itemName: "",
        quantity: 0,
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      const mockUserDoc = { get: vi.fn().mockRejectedValue(dbError) };

      (db.doc as any).mockReturnValue(mockUserDoc);

      await expect(
        getNameEmailItemQuantity("user456", "order123"),
      ).rejects.toThrow("Failed to fetch order and user data.");
    });
  });
});
