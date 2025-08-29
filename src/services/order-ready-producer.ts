import RabbitMQConnection from "./rabbitmq-connection";

type OrderObj = {
  name: string;
  email: string;
  itemName: string;
  quantity: number;
};

export const orderReady = async (order: OrderObj) => {
  //order email, order item name, quantity, person name
  const rabbitmq = RabbitMQConnection.getInstance();
  const channel = await rabbitmq.getChannel();

  const msg = JSON.stringify(order);

  await channel.assertExchange("order_ready_exch", "topic", { durable: true });

  channel.publish("order_ready_exch", "order.ready", Buffer.from(msg), {
    persistent: true,
  });

  console.log(
    "Message is sent to from Order Service to queue that order is ready:",
  );
};
