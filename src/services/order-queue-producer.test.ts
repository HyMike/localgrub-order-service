import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RabbitMQConnection from "./rabbitmq-connection";

// Mock the RabbitMQConnection module
vi.mock("./rabbitmq-connection", () => ({
  default: {
    getInstance: vi.fn(),
  },
}));

// Mock dotenv
vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

describe("order-queue-producer", () => {
  let mockChannel: any;
  let mockRabbitMQ: any;
  let mockGetInstance: any;
  let sendOrder: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const module = await import("./order-queue-producer");
    sendOrder = module.default;

    mockChannel = {
      assertExchange: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn(),
    };

    // Create mock RabbitMQ instance
    mockRabbitMQ = {
      getChannel: vi.fn().mockResolvedValue(mockChannel),
    };

    // Get the mocked getInstance function
    mockGetInstance = RabbitMQConnection.getInstance as any;
    mockGetInstance.mockReturnValue(mockRabbitMQ);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendOrder", () => {
    it("should send order to queue successfully", async () => {
      const orderData = {
        uid: "user123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        itemId: "pizza123",
        itemName: "Pepperoni Pizza",
        quantity: 2,
        price: 15.99,
        creditCardInfo: "1234-5678-9012-3456",
        createdAt: "2024-01-01T12:00:00.000Z",
      };

      await sendOrder(orderData);

      // Verify RabbitMQ connection was established
      expect(mockGetInstance).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ.getChannel).toHaveBeenCalledTimes(1);

      // Verify exchange was asserted
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "topic_exc",
        "topic",
        { durable: true },
      );

      // Verify message was published
      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        Buffer.from(JSON.stringify(orderData)),
        { persistent: true },
      );
    });

    it("should handle empty order object", async () => {
      const emptyOrder = {};

      await sendOrder(emptyOrder);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        Buffer.from(JSON.stringify(emptyOrder)),
        { persistent: true },
      );
    });

    it("should handle complex order data", async () => {
      const complexOrder = {
        uid: "user456",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        itemId: "burger789",
        itemName: "Deluxe Burger",
        quantity: 1,
        price: 12.5,
        creditCardInfo: "9876-5432-1098-7654",
        createdAt: "2024-01-01T15:30:00.000Z",
        specialInstructions: "Extra cheese, no onions",
        deliveryAddress: {
          street: "123 Main St",
          city: "Anytown",
          zip: "12345",
        },
      };

      await sendOrder(complexOrder);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        Buffer.from(JSON.stringify(complexOrder)),
        { persistent: true },
      );
    });

    it("should reuse cached channel on multiple sends", async () => {
      const order1 = { uid: "user1", itemName: "Pizza" };
      const order2 = { uid: "user2", itemName: "Burger" };

      await sendOrder(order1);
      await sendOrder(order2);

      // Channel should only be created once
      expect(mockRabbitMQ.getChannel).toHaveBeenCalledTimes(1);
      expect(mockChannel.assertExchange).toHaveBeenCalledTimes(1);

      // But publish should be called twice
      expect(mockChannel.publish).toHaveBeenCalledTimes(2);
    });

    it("should serialize order data correctly", async () => {
      const orderData = {
        uid: "user123",
        itemName: "Pizza",
        quantity: 2,
        price: 15.99,
      };

      await sendOrder(orderData);

      const publishedBuffer = mockChannel.publish.mock.calls[0][2];
      const publishedData = JSON.parse(publishedBuffer.toString());

      expect(publishedData).toEqual(orderData);
    });
  });

  describe("error handling", () => {
    it("should handle RabbitMQ connection errors", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };
      const connectionError = new Error("Failed to connect to RabbitMQ");
      mockRabbitMQ.getChannel.mockRejectedValue(connectionError);

      await expect(sendOrder(orderData)).rejects.toThrow(
        /Failed to send order to queue.*Failed to connect to RabbitMQ/,
      );
    });

    it("should handle exchange assertion errors", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };
      const exchangeError = new Error("Exchange assertion failed");
      mockChannel.assertExchange.mockRejectedValue(exchangeError);

      await expect(sendOrder(orderData)).rejects.toThrow(
        /Failed to send order to queue.*Exchange assertion failed/,
      );
    });

    it("should handle publish errors", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };
      const publishError = new Error("Message publish failed");
      mockChannel.publish.mockImplementation(() => {
        throw publishError;
      });

      await expect(sendOrder(orderData)).rejects.toThrow(
        /Failed to send order to queue.*Message publish failed/,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle undefined order data", async () => {
      await expect(sendOrder(undefined as any)).rejects.toThrow(
        "Order data is required",
      );
    });

    it("should handle null order data", async () => {
      await expect(sendOrder(null as any)).rejects.toThrow(
        "Order data is required",
      );
    });

    it("should handle circular references in order data", async () => {
      const circularOrder: any = { uid: "user123", itemName: "Pizza" };
      circularOrder.self = circularOrder;

      await expect(sendOrder(circularOrder)).rejects.toThrow(
        "Failed to send order to queue",
      );
    });

    it("should handle very large order data", async () => {
      const largeOrder = {
        uid: "user123",
        itemName: "Pizza",
        largeData: "x".repeat(1_000_000), // 1MB of data
      };

      await sendOrder(largeOrder);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        Buffer.from(JSON.stringify(largeOrder)),
        { persistent: true },
      );
    });
  });

  describe("RabbitMQ configuration", () => {
    it("should use correct exchange name and type", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };

      await sendOrder(orderData);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "topic_exc",
        "topic",
        { durable: true },
      );
    });

    it("should use correct routing key", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };

      await sendOrder(orderData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        expect.any(Buffer),
        { persistent: true },
      );
    });

    it("should use persistent message delivery", async () => {
      const orderData = { uid: "user123", itemName: "Pizza" };

      await sendOrder(orderData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "topic_exc",
        "order.placed",
        expect.any(Buffer),
        { persistent: true },
      );
    });
  });
});
