import express from "express";
import dotenv from "dotenv";
import RabbitMQConnection from "./rabbitmq-connection";

dotenv.config();

const app = express();
app.use(express.json());

let cacheChannel: any = null;

const sendOrder = async (order: object): Promise<void> => {
  if (!order || order === undefined || order === null) {
    throw new Error("Order data is required");
  }
  try {
    const rabbitmq = RabbitMQConnection.getInstance();
    if (!cacheChannel) {
      cacheChannel = await rabbitmq.getChannel();
      await cacheChannel.assertExchange("topic_exc", "topic", {
        durable: true,
      });
    }

    const msg = JSON.stringify(order);
    cacheChannel.publish("topic_exc", "order.placed", Buffer.from(msg), {
      persistent: true,
    });

    console.log("Message is sent to from Order Service to queue:");
  } catch (error) {
    console.error("Failed to send order to queue:", error);
    throw new Error(`Failed to send order to queue: ${error}`);
  }
};

export default sendOrder;
