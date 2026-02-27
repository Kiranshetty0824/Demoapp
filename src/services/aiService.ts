import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const getAIResponse = async (prompt: string, role: string) => {
  const systemInstructions = {
    STUDENT: "You are COLLEVENTO AI for students. Help them find events, explain booking processes, and answer questions about tickets and certificates.",
    ORGANIZER: "You are COLLEVENTO AI for organizers. Help them with event creation, revenue tracking, and scanning logistics.",
    ADMIN: "You are COLLEVENTO AI for admins. Help them with analytics, approvals, and system health."
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstructions[role as keyof typeof systemInstructions] || "You are a helpful assistant."
    }
  });

  return response.text;
};
