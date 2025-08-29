import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOrderInDatabase } from "./order-service";

import { UserInfo, CreateOrderData } from "../types/UserInfo";

vi.mock("../utils/firebaseAdmin", () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock("./order-queue-producer", () => ({
  default: vi.fn(),
}));

import { db } from "../utils/firebaseAdmin";
import sendOrder from "./order-queue-producer";

describe("order-service", () => {
  let mockOrdersRef: any;
  let mockOrderRef: any;
  let mockCollection: any;
  let mockDoc: any;

  const mockUserData: UserInfo = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  };

  const mockOrderData: CreateOrderData = {
    itemId: "pizza123",
    itemName: "Pepperoni Pizza",
    quantity: 2,
    price: 15.99,
    creditCardInfo: "1234-5678-9012-3456",
  };
  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderRef = {
      id: "order123",
    };

    mockOrdersRef = {
      add: vi.fn().mockResolvedValue(mockOrderRef),
    };

    mockDoc = {
      collection: vi.fn().mockReturnValue(mockOrdersRef),
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
    };

    (db.collection as any).mockReturnValue(mockCollection);
    (sendOrder as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createOrderInDatabase", () => {
    it("should create order successfully with complete user data", async () => {
      const uid = "user123";
      const orderId = await createOrderInDatabase(
        uid,
        mockOrderData,
        mockUserData,
      );

      expect(db.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.doc).toHaveBeenCalledWith(uid);
      expect(mockDoc.collection).toHaveBeenCalledWith("orders");
      expect(mockOrdersRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockOrderData,
          status: "pending",
          createdAt: expect.any(String),
        }),
      );

      expect(sendOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          uid,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          ...mockOrderData,
          createdAt: expect.any(String),
        }),
      );

      expect(orderId).toBe("order123");
    });

    it("should handle missing user data gracefully", async () => {
      const uid = "user123";
      const orderId = await createOrderInDatabase(uid, mockOrderData, null);

      expect(mockOrdersRef.add).toHaveBeenCalled();
      expect(sendOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          uid,
          firstName: "",
          lastName: "",
          email: "",
          ...mockOrderData,
          createdAt: expect.any(String),
        }),
      );
      expect(orderId).toBe("order123");
    });

    it("should handle partial user data", async () => {
      const uid = "user123";
      const partialUserData: UserInfo = {
        firstName: "John",
        lastName: "",
        email: "john@example.com",
      };

      const orderId = await createOrderInDatabase(
        uid,
        mockOrderData,
        partialUserData,
      );

      expect(sendOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          uid,
          firstName: "John",
          lastName: "",
          email: "john@example.com",
          ...mockOrderData,
          createdAt: expect.any(String),
        }),
      );
      expect(orderId).toBe("order123");
    });

    it("should throw error when database fails", async () => {
      const uid = "user123";
      const dbError = new Error("Database connection failed");
      mockOrdersRef.add.mockRejectedValue(dbError);

      await expect(
        createOrderInDatabase(uid, mockOrderData, mockUserData),
      ).rejects.toThrow("Failed to create order in database");

      expect(sendOrder).not.toHaveBeenCalled();
    });

    it("should throw error when queue producer fails", async () => {
      const uid = "user123";
      const queueError = new Error("Queue connection failed");
      (sendOrder as any).mockRejectedValue(queueError);

      await expect(
        createOrderInDatabase(uid, mockOrderData, mockUserData),
      ).rejects.toThrow("Failed to create order in database");

      expect(mockOrdersRef.add).toHaveBeenCalled();
    });

    it("should create order with correct timestamp format", async () => {
      const uid = "user123";
      const mockDate = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(mockDate);

      await createOrderInDatabase(uid, mockOrderData, mockUserData);

      expect(mockOrdersRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2024-01-01T12:00:00.000Z",
        }),
      );

      vi.useRealTimers();
    });

    it("should include all required fields in the order", async () => {
      const uid = "user123";
      await createOrderInDatabase(uid, mockOrderData, mockUserData);

      const expectedOrder = {
        ...mockOrderData,
        status: "pending",
        createdAt: expect.any(String),
      };

      expect(mockOrdersRef.add).toHaveBeenCalledWith(expectedOrder);
    });
  });
});
