const apiKey = import.meta.env.VITE_GROQ_API_KEY || "demo-api-key";

const getMockResponse = async (title, type, description, location) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const combinedText = `${title} ${type} ${description}`.toLowerCase();
  const isCritical = combinedText.includes('fire') || combinedText.includes('blood') || combinedText.includes('help') || combinedText.includes('emergency');
  
  return {
    severity: isCritical ? "critical" : "moderate",
    type: type || "other",
    summary: `AI Assessment: Suspected ${type} incident at ${location}. Requires immediate unit dispatch.`,
    instructions: [
      "Ensure personal safety and evacuate if necessary.",
      "Do not engage hostile individuals.",
      "Wait for responders at a safe distance.",
      "Keep communication lines open."
    ],
    estimatedResponseTime: isCritical ? "2-5 minutes" : "10-15 minutes",
    resourcesNeeded: isCritical ? ["Emergency Medical Services", "Security Patrol"] : ["Security Personnel"]
  };
};

export async function analyzeIncident(title, type, description, location) {
  if (apiKey === "demo-api-key" || !apiKey || !apiKey.startsWith('gsk_')) {
    return getMockResponse(title, type, description, location);
  }

  try {
    const prompt = `You are an emergency response coordinator AI for a college campus. Analyse this incident report and respond ONLY in valid JSON format with no markdown, no backticks, no extra text:
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

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    if (!res.ok) throw new Error("Groq API request failed");
    
    const data = await res.json();
    let text = data.choices[0].message.content;
    
    // Clean up potential markdown formatting just in case
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error calling Groq API. Falling back to mock data.", error);
    return getMockResponse(title, type, description, location);
  }
}

export async function refineDescription(transcript) {
  if (apiKey === "demo-api-key" || !apiKey || !apiKey.startsWith('gsk_')) {
    // Mock processing delay and basic cleanup
    await new Promise(resolve => setTimeout(resolve, 1500));
    return transcript.charAt(0).toUpperCase() + transcript.slice(1).trim() + ".";
  }

  try {
    const prompt = `You are helping refine an emergency incident report for a college campus crisis system. The reporter spoke the following description out loud — clean it up into a clear, concise, professional incident description. Fix grammar, remove filler words, keep all important details. Respond with ONLY the cleaned description, nothing else, no preamble.
  
Spoken input: ${transcript}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    if (!res.ok) throw new Error("Groq API request failed");
    
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling Groq API for refinement. Falling back to raw transcript.", error);
    return transcript;
  }
}

export async function generateClosureReport(incident, responseMinutes = 0) {
  if (apiKey === "demo-api-key" || !apiKey || !apiKey.startsWith('gsk_')) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `At ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, a ${incident.type} incident was reported at ${incident.location}. The situation was successfully stabilized. ${incident.assignedName || 'Campus response team'} responded and resolved the incident in ${responseMinutes} minutes.`;
  }

  const createdTime = incident.createdAt ? (incident.createdAt.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
  const resolvedTime = incident.resolvedAt ? (incident.resolvedAt.toDate ? incident.resolvedAt.toDate() : new Date(incident.resolvedAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const prompt = `Generate a professional 3-sentence incident closure report for official campus records. Be factual, specific, and concise.
Use this exact format:
'At [time], a [type] incident was reported at [location]. [One sentence about what happened based on description]. [assignedName or 'Campus response team'] responded and resolved the incident in [responseMinutes] minutes.'

Incident data:
Title: ${incident.title}
Type: ${incident.type}
Severity: ${incident.severity}
Location: ${incident.location}
Description: ${incident.description}
Reported at: ${createdTime}
Resolved at: ${resolvedTime}
Assigned Responder: ${incident.assignedName || 'Unassigned'}
Response time: ${responseMinutes} minutes`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    if (!res.ok) throw new Error("Groq API request failed");
    
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling Groq API for closure report.", error);
    return "Error generating AI closure report. Manual review required.";
  }
}
