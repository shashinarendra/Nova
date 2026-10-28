// Quick test script to verify Gemini API connection
import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
console.log("Key starts with:", API_KEY?.substring(0, 8) + "...");
console.log("Key length:", API_KEY?.length);

try {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
  
  console.log("\nSending test message...");
  const result = await model.generateContent("Say hello in one sentence.");
  console.log("✅ Response:", result.response.text());
} catch (err) {
  console.error("\n❌ Error:", err.message);
  console.error("Status:", err.status);
  console.error("Details:", JSON.stringify(err.errorDetails, null, 2));
}
