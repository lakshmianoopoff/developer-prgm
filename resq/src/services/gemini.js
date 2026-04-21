import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "demo-api-key";
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeIncident(title, type, description, location) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are an emergency response coordinator AI for a college campus. Analyse this incident report and respond ONLY in JSON format with no markdown, no backticks:
  {
    "severity": "critical" or "moderate" or "minor",
    "type": "medical" or "fire" or "security" or "maintenance" or "other",
    "summary": "one sentence summary of the incident",
    "instructions": ["step 1", "step 2", "step 3", "step 4"],
    "estimatedResponseTime": "e.g. 5-10 minutes",
    "resourcesNeeded": ["e.g. Medical team", "Fire extinguisher"]
  }
  
  Incident Title: ${title}
  Incident Type: ${type}
  Description: ${description}
  Location: ${location}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting just in case
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      severity: "moderate",
      type: type || "other",
      summary: "AI analysis failed. Human review required.",
      instructions: ["Ensure safety", "Wait for human responder assessment"],
      estimatedResponseTime: "Unknown",
      resourcesNeeded: []
    };
  }
}
