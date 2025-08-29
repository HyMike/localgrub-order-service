import cors from "cors";

export const corsMiddleware = cors({
  origin: "http://localhost:4173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
