import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RabbitMQConnection from "./rabbitmq-connection";
import * as amqp from "amqplib";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.mock("amqplib", () => ({
  connect: vi.fn(),
}));

describe("RabbitMQConnection", () => {
  let mockConnection: any;
  let mockChannel: any;
  let rabbitMQ: RabbitMQConnection;

  beforeEach(() => {
    vi.clearAllMocks();

    (RabbitMQConnection as any).instance = null;

    mockConnection = {
      createChannel: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
    };

    mockChannel = {
      on: vi.fn(),
      close: vi.fn(),
    };

    mockConnection.createChannel.mockResolvedValue(mockChannel);
    (amqp.connect as any).mockResolvedValue(mockConnection);

    rabbitMQ = RabbitMQConnection.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = RabbitMQConnection.getInstance();
      const instance2 = RabbitMQConnection.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance only once", () => {
      // Reset singleton
      (RabbitMQConnection as any).instance = null;

      const instance1 = RabbitMQConnection.getInstance();
      const instance2 = RabbitMQConnection.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("getConnection", () => {
    it("should establish connection successfully", async () => {
      const connection = await rabbitMQ.getConnection();

      expect(amqp.connect).toHaveBeenCalledWith("amqp://rabbitmq:5672");
      expect(connection).toBe(mockConnection);
      expect(mockConnection.on).toHaveBeenCalledWith(
        "close",
        expect.any(Function),
      );
      expect(mockConnection.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
    });

    it("should use custom RABBITMQ_URL from environment", async () => {
      const originalEnv = process.env.RABBITMQ_URL;
      process.env.RABBITMQ_URL = "amqp://custom:5672";

      await rabbitMQ.getConnection();

      expect(amqp.connect).toHaveBeenCalledWith("amqp://custom:5672");

      process.env.RABBITMQ_URL = originalEnv;
    });

    it("should return existing connection if already established", async () => {
      await rabbitMQ.getConnection();

      const connection2 = await rabbitMQ.getConnection();

      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(connection2).toBe(mockConnection);
    });

    it("should handle connection errors", async () => {
      const connectionError = new Error("Connection failed");
      (amqp.connect as any).mockRejectedValue(connectionError);

      await expect(rabbitMQ.getConnection()).rejects.toThrow(
        "Connection failed",
      );
    });

    it("should handle concurrent connection attempts", async () => {
      let resolveConnection: (value: any) => void;
      const connectionPromise = new Promise((resolve) => {
        resolveConnection = resolve;
      });
      (amqp.connect as any).mockReturnValue(connectionPromise);

      const promise1 = rabbitMQ.getConnection();

      const promise2 = rabbitMQ.getConnection();

      resolveConnection!(mockConnection);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(mockConnection);
      expect(result2).toBe(mockConnection);
      expect(amqp.connect).toHaveBeenCalledTimes(1);
    });

    it("should handle connection close event", async () => {
      await rabbitMQ.getConnection();

      const closeHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === "close",
      )![1];
      closeHandler();

      const connection = await rabbitMQ.getConnection();
      expect(amqp.connect).toHaveBeenCalledTimes(2);
    });

    it("should handle connection error event", async () => {
      await rabbitMQ.getConnection();

      const errorHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === "error",
      )![1];
      errorHandler(new Error("Connection error"));

      const connection = await rabbitMQ.getConnection();
      expect(amqp.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe("getChannel", () => {
    it("should create channel successfully", async () => {
      const channel = await rabbitMQ.getChannel();

      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(channel).toBe(mockChannel);
      expect(mockChannel.on).toHaveBeenCalledWith(
        "close",
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
    });

    it("should return existing channel if already created", async () => {
      await rabbitMQ.getChannel();

      const channel2 = await rabbitMQ.getChannel();

      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
      expect(channel2).toBe(mockChannel);
    });

    it("should handle channel creation errors", async () => {
      const channelError = new Error("Channel creation failed");
      mockConnection.createChannel.mockRejectedValue(channelError);

      await expect(rabbitMQ.getChannel()).rejects.toThrow(
        "Channel creation failed",
      );
    });

    it("should handle channel close event", async () => {
      await rabbitMQ.getChannel();

      const closeHandler = mockChannel.on.mock.calls.find(
        (call: any[]) => call[0] === "close",
      )![1];
      closeHandler();

      const channel = await rabbitMQ.getChannel();
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(2);
    });

    it("should handle channel error event", async () => {
      await rabbitMQ.getChannel();

      const errorHandler = mockChannel.on.mock.calls.find(
        (call: any[]) => call[0] === "error",
      )![1];
      errorHandler(new Error("Channel error"));

      const channel = await rabbitMQ.getChannel();
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(2);
    });

    it("should create new channel if connection is lost", async () => {
      await rabbitMQ.getChannel();

      const closeHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === "close",
      )![1];
      closeHandler();

      await rabbitMQ.getChannel();
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe("close", () => {
    it("should close channel and connection successfully", async () => {
      await rabbitMQ.getConnection();
      await rabbitMQ.getChannel();

      await rabbitMQ.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("should handle channel close errors gracefully", async () => {
      await rabbitMQ.getConnection();
      await rabbitMQ.getChannel();

      const channelError = new Error("Channel close failed");
      mockChannel.close.mockRejectedValue(channelError);

      await expect(rabbitMQ.close()).resolves.toBeUndefined();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("should handle connection close errors gracefully", async () => {
      await rabbitMQ.getConnection();
      await rabbitMQ.getChannel();

      const connectionError = new Error("Connection close failed");
      mockConnection.close.mockRejectedValue(connectionError);

      await expect(rabbitMQ.close()).resolves.toBeUndefined();
    });

    it("should work when only connection exists (no channel)", async () => {
      await rabbitMQ.getConnection();

      await rabbitMQ.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("should work when neither connection nor channel exist", async () => {
      await rabbitMQ.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete lifecycle: connect, create channel, close", async () => {
      const connection = await rabbitMQ.getConnection();
      expect(connection).toBe(mockConnection);

      const channel = await rabbitMQ.getChannel();
      expect(channel).toBe(mockChannel);

      await rabbitMQ.close();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("should reconnect after connection failure", async () => {
      (amqp.connect as any).mockRejectedValueOnce(
        new Error("First attempt failed"),
      );

      (amqp.connect as any).mockResolvedValueOnce(mockConnection);

      await expect(rabbitMQ.getConnection()).rejects.toThrow(
        "First attempt failed",
      );

      const connection = await rabbitMQ.getConnection();
      expect(connection).toBe(mockConnection);
      expect(amqp.connect).toHaveBeenCalledTimes(2);
    });
  });
});
