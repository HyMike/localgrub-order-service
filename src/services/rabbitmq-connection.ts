import * as amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: any = null;
  private channel: any = null;
  private isConnecting = false;

  private constructor() {}

  static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  async getConnection(): Promise<any> {
    if (this.connection) {
      return this.connection;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (this.connection) {
        return this.connection;
      }
      throw new Error("Connection attempt failed");
    }

    this.isConnecting = true;

    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
      this.connection = await amqp.connect(rabbitmqUrl);

      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed");
        this.connection = null;
        this.channel = null;
      });

      this.connection.on("error", (error: any) => {
        console.error("RabbitMQ connection error:", error);
        this.connection = null;
        this.channel = null;
      });

      console.log("RabbitMQ connection established");
      this.isConnecting = false;
      return this.connection;
    } catch (error) {
      this.isConnecting = false;
      console.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async getChannel(): Promise<any> {
    if (this.channel) {
      return this.channel;
    }

    try {
      const connection = await this.getConnection();
      this.channel = await connection.createChannel();

      this.channel.on("close", () => {
        console.log("RabbitMQ channel closed");
        this.channel = null;
      });

      this.channel.on("error", (error: any) => {
        console.error("RabbitMQ channel error:", error);
        this.channel = null;
      });

      return this.channel;
    } catch (error) {
      console.error("Failed to create channel:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
    } catch (error) {
      console.error("Error closing channel:", error);
    }

    try {
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error) {
      console.error("Error closing connection:", error);
    }
  }
}

export default RabbitMQConnection;
