import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;

