import express from "express";
import dotenv from "dotenv";
import orderRoutes from "./routes/orderRoutes";
import RabbitMQConnection from "./services/rabbitmq-connection";
import { corsMiddleware } from "./middleware/corsMiddleware";

dotenv.config();
const app = express();

app.use(corsMiddleware);

app.use(express.json());
app.use("/", orderRoutes);

const PORT = process.env.PORT || 3005;

const initializeRabbitMQ = async () => {
  try {
    const rabbitmq = RabbitMQConnection.getInstance();
    await rabbitmq.getConnection();
    console.log("RabbitMQ connection initialized");
  } catch (error) {
    console.error("Failed to initialize RabbitMQ:", error);
  }
};

app.listen(PORT, async () => {
  console.log(`Order Service running on port ${PORT}`);
  await initializeRabbitMQ();
});

process.on("SIGTERM", async () => {
  const rabbitmq = RabbitMQConnection.getInstance();
  await rabbitmq.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  const rabbitmq = RabbitMQConnection.getInstance();
  await rabbitmq.close();
  process.exit(0);
});
