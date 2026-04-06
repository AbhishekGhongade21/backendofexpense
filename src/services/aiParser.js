import OpenAI from "openai";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Travel", "Other"];

function basicHeuristicParse(text) {
  const amountMatch = text.match(/(\d+(\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;

  const lower = text.toLowerCase();
  let category = "Other";
  if (/(food|pizza|burger|restaurant|meal|lunch|dinner)/.test(lower)) category = "Food";
  else if (/(uber|ola|bus|train|cab|taxi|auto)/.test(lower)) category = "Transport";
  else if (/(amazon|flipkart|shopping|clothes|shoes)/.test(lower)) category = "Shopping";
  else if (/(rent|electricity|wifi|internet|mobile|bill)/.test(lower)) category = "Bills";
  else if (/(movie|netflix|spotify|party|club)/.test(lower)) category = "Entertainment";
  else if (/(doctor|medicine|hospital|pharmacy)/.test(lower)) category = "Health";
  else if (/(flight|hotel|trip|travel)/.test(lower)) category = "Travel";

  const description = text.replace(amountMatch?.[0] || "", "").trim();

  return {
    amount: isNaN(amount) ? 0 : amount,
    category,
    description: description || text,
  };
}

export async function analyzeExpenseText(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to heuristic parser if no API key is configured
    return basicHeuristicParse(text);
  }

  const client = new OpenAI({ apiKey });

  const prompt = `
You are an expense parsing assistant for a personal finance app.
User will send a short sentence describing an expense, like:
"Spent 300 on pizza yesterday"

You MUST respond with ONLY a valid JSON object, no explanations.
Shape:
{
  "amount": number,
  "category": string,
  "description": string
}

Rules:
- "amount" is the numeric money amount (in rupees) detected in the text.
- "category" must be one of: ${CATEGORIES.join(", ")}.
- If in doubt, use "Other".
- "description" should be a short human-readable label (e.g. "pizza", "uber to office").

Now parse:
"${text}"
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You transform natural language expense descriptions into structured JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      return basicHeuristicParse(text);
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    return {
      amount: Number(parsed.amount) || 0,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      description: parsed.description || text,
    };
  } catch (err) {
    console.error("OpenAI analyze error", err);
    return basicHeuristicParse(text);
  }
}

