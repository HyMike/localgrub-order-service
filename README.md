# Order Service
[![Integration Test](https://github.com/HyMike/localgrub/actions/workflows/integration-tests.yml/badge.svg?branch=main)](https://github.com/HyMike/localgrub/actions/workflows/integration-tests.yml)

## Overview

The Order Service is a backend microservice for the LocalGrub platform. It is responsible for handling order creation, updating order status, and emitting order-related events to RabbitMQ. This service acts as the central point for order management and coordinates with other microservices (Payment, Restaurant, Notification) via event-driven communication.

**Scope:** 
Solo MVP project – Designed and developed backend microservice

---

## Features

- Receives and stores new customer orders
- Emits `order_placed` events to RabbitMQ
- Updates order status (e.g., to "Completed")
- Emits `order_ready` events to RabbitMQ
- Integrates with Firebase for authentication and Firestore for order storage
- Designed for reliability and scalability

---

## API Documentation

### Base URL

http://localhost:3005

### Endpoints

#### POST /success

Creates a new order and triggers the order flow.

**Headers:**

Authorization: Bearer YOUR_FIREBASE_TOKEN
Content-Type: application/json

**Request Body:**

```json
{
  "id": "item_123",
  "name": "Classic Burger",
  "quantity": 2,
  "price": 12.99,
  "creditCardInfo": "encrypted_card_data"
}
```

**Response:**

```json
{
  "message": "Order created successfully",
  "orderId": "generated_order_id"
}
```

#### POST /order-ready

Marks an order as ready for pickup.

**Headers:**

Content-Type: application/json

**Request Body:**

```json
{
  "orderId": "order_456",
  "userId": "user_789"
}
```

**Response:**

```json
{
  "message": "Order status updated successfully"
}
```

### cURL Examples

**Create Order:**

```bash
curl -X POST http://localhost:3005/success \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "id": "item_123",
    "name": "Classic Burger",
    "quantity": 2,
    "price": 12.99,
    "creditCardInfo": "encrypted_card_data"
  }'
```

**Mark Order Ready:**

```bash
curl -X POST http://localhost:3005/order-ready \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_456",
    "userId": "user_789"
  }'
```

### Testing with Postman

Import the complete API collection: [localgrub-all.postman_collection.json](../../docs/api/postman-collections/localgrub-all.postman_collection.json)

---

## Environment Variables

This service requires a `.env` file for configuration.

**Setup:**

- Copy `.env.example` to `.env` in this directory.
- Fill in the required values before running the service.

| Variable              | Description                 | Where to get it / Example                                                   |
| --------------------- | --------------------------- | --------------------------------------------------------------------------- |
| PORT                  | Port the service runs on    | `3005`                                                                      |
| RABBITMQ_URL          | RabbitMQ connection string  | `amqp://rabbitmq:5672` (default for Docker)                                 |
| FIREBASE_PROJECT_ID   | Firebase Project ID         | [Firebase Console](https://console.firebase.google.com/)                    |
| FIREBASE_PRIVATE_KEY  | Firebase Admin private key  | [Firebase Console > Service Accounts](https://console.firebase.google.com/) |
| FIREBASE_CLIENT_EMAIL | Firebase Admin client email | [Firebase Console > Service Accounts](https://console.firebase.google.com/) |

> See the main project [README](../../README.md) for more details on environment variables and how to obtain them.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in the required values
```

### 3. Run the service (development)

```bash
npm run dev
```

### 4. With Docker

```bash
docker build -t order-service .
docker run -p 3005:3005 order-service
```

---

## How It Works

- Receives order requests from the frontend
- Stores order data in Firestore
- Publishes `order_placed` events to RabbitMQ
- Listens for order status updates and emits `order_ready` events
- Coordinates with Payment, Restaurant, and Notification services via events

---

## Tech Stack

- Node.js
- Express
- TypeScript
- Firebase Admin SDK (Firestore, Auth)
- RabbitMQ (amqplib)

---

## Contributing

- Please see the main project [README](../../README.md) for guidelines.

---

## License

This project is licensed under the MIT License.
