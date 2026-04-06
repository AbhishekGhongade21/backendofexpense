import express from "express";
import { z } from "zod";

import { authRequired } from "../middleware/auth.js";
import { analyzeExpenseText } from "../services/aiParser.js";

const router = express.Router();

const analyzeSchema = z.object({
  text: z.string().min(3),
});

router.post("/", authRequired, async (req, res) => {
  try {
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { text } = parsed.data;
    const result = await analyzeExpenseText(text);

    return res.json(result);
  } catch (err) {
    console.error("AI analyze error", err);
    return res.status(500).json({ message: "Failed to analyze text" });
  }
});

export default router;

