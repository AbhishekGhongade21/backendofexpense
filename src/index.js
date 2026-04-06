import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = express();

// Allow requests from any origin in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_ORIGIN || "*"
    : process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI Expense Tracker backend running" });
});

// Add root route for Render health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AI Expense Tracker API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/analyze", aiRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai-expense-tracker";

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
