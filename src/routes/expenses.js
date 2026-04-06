import express from "express";
import { z } from "zod";

import Expense from "../models/Expense.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional().default(""),
  date: z.string().or(z.date()),
});

router.get("/", authRequired, async (req, res) => {
  try {
    const { month } = req.query;

    const query = { userId: req.user.id };
    if (month) {
      const [year, monthIndex] = month.split("-").map(Number);
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    // very simple week-over-week comparison for insight
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - 7);
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - 14);

    const thisWeekTotal = expenses
      .filter((e) => e.date >= startOfThisWeek)
      .reduce((sum, e) => sum + e.amount, 0);
    const lastWeekTotal = expenses
      .filter((e) => e.date >= startOfLastWeek && e.date < startOfThisWeek)
      .reduce((sum, e) => sum + e.amount, 0);

    const insights = [];
    if (total > 0) {
      const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = Math.round((topAmount / total) * 100);
        insights.push(`You spend around ${percentage}% on ${topCategory}.`);
      }
    }

    if (lastWeekTotal > 0) {
      const diff = thisWeekTotal - lastWeekTotal;
      const change = Math.round((Math.abs(diff) / lastWeekTotal) * 100);
      if (diff > 0) {
        insights.push(`Your spending increased by about ${change}% compared to last week.`);
      } else if (diff < 0) {
        insights.push(`Nice! Your spending decreased by about ${change}% compared to last week.`);
      }
    }

    return res.json({ expenses, summary: { total, byCategory, thisWeekTotal, lastWeekTotal, insights } });
  } catch (err) {
    console.error("Get expenses error", err);
    return res.status(500).json({ message: "Failed to load expenses" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { amount, category, description, date } = parsed.data;
    const expense = await Expense.create({
      userId: req.user.id,
      amount,
      category,
      description,
      date: new Date(date),
    });

    return res.status(201).json(expense);
  } catch (err) {
    console.error("Create expense error", err);
    return res.status(500).json({ message: "Failed to create expense" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete expense error", err);
    return res.status(500).json({ message: "Failed to delete expense" });
  }
});

export default router;

