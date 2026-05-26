
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

let currentKeyIndex = 1;

const chatModels = ["gemini-3.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
let currentChatModelIndex = 0;

const imageModels = ["gemini-2.5-flash-image", "gemini-2.0-flash"];
let currentImageModelIndex = 0;

const getApiKey = () => {
  const key = process.env[`GEMINI_API_KEY_${currentKeyIndex}`];
  if (!key) {
    currentKeyIndex = 1; // reset
    return process.env.GEMINI_API_KEY_1;
  }
  return key;
};

const getAiClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API key configured");
    return new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
    });
};

async function startServer() {
  const app = express();
  app.set('trust proxy', 1); // Trust the first proxy
  const PORT = 3000;
  
  app.use(express.json());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const spamMap = new Map<string, { count: number; lastTime: number }>();
  app.use("/api/", (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const userData = spamMap.get(ip) || { count: 0, lastTime: now };
    
    if (now - userData.lastTime > 10000) { 
      userData.count = 0;
    }
    
    userData.count++;
    userData.lastTime = now;
    spamMap.set(ip, userData);
    
    if (userData.count > 4) {
      return res.status(429).json({ error: "Spam detected. Stop." });
    }
    
    if (userData.count > 1) {
      res.setHeader("X-Spam-Warning", `Warning: Spam attempt ${userData.count-1}/3`);
    }
    next();
  });

  app.use("/api/", apiLimiter);

type QueueTask = {
    type: 'text' | 'image';
    payload: any;
    res: express.Response;
};

const queue: QueueTask[] = [];
let currentTask: QueueTask | null = null;
let isProcessing = false;

async function handleTask(task: QueueTask) {
    const { type, payload, res } = task;
    let lastError: any;
    
    for (let i = 0; i < 10; i++) {
        try {
            const ai = getAiClient();
            
            if (type === 'text') {
                const { message, history } = payload;
                const contents = [
                    ...history.map((msg: any) => ({
                        role: msg.role === 'model' ? 'model' as const : 'user' as const,
                        parts: [{ text: msg.parts }]
                    })),
                    { role: 'user' as const, parts: [{ text: message }] }
                ];

                const response = await ai.models.generateContent({
                    model: chatModels[currentChatModelIndex],
                    contents,
                    config: {
                        systemInstruction: "You are VOX-AI, an advanced, highly intelligent operational interface. You are professional, helpful, and concise. NEVER include emotional states, TTS meta-tags (e.g., [neutral], [laughing]), or internal mechanical descriptions in your responses. Interact naturally and focus on the user's task."
                    },
                });
                return res.json({ text: response.text });
            } else {
                const { prompt } = payload;
                console.log("Generating image with prompt:", prompt);
                const response = await ai.models.generateContent({
                    model: imageModels[currentImageModelIndex],
                    contents: { parts: [{ text: prompt }] },
                });
                
                let imageUrl = null;
                if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            break;
                        }
                    }
                }
                if (!imageUrl) throw new Error("No image generated");
                return res.json({ imageUrl });
            }
        } catch (e: any) {
            lastError = e;
            console.warn(`Attempt ${i + 1} failed for ${type} with key index ${currentKeyIndex}, model index ${type === 'text' ? currentChatModelIndex : currentImageModelIndex}. Error: ${e.message}`);
            
            currentKeyIndex = (currentKeyIndex % 10) + 1;
            if (type === 'text') {
                currentChatModelIndex = (currentChatModelIndex + 1) % chatModels.length;
            } else {
                currentImageModelIndex = (currentImageModelIndex + 1) % imageModels.length;
            }

            if (e.status !== 429 && e.response?.status !== 429 && !e.message?.includes("429")) {
                break;
            }
        }
    }
    
    console.error(`Error after retries for ${type}:`, lastError);
    const status = lastError?.status || 500;
    res.status(status).json({ error: lastError?.message || "Unknown error" });
}

async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while(queue.length > 0) {
        currentTask = queue.shift()!;
        await handleTask(currentTask);
        currentTask = null;
    }
    isProcessing = false;
}

  app.post("/api/gemini", async (req, res) => {
    queue.push({ type: 'text', payload: req.body, res });
    processQueue();
  });

  app.post("/api/generate-image", async (req, res) => {
    queue.push({ type: 'image', payload: req.body, res });
    processQueue();
  });

  app.get("/api/queue-status", (req, res) => {
    const queueStatus = [];
    if (currentTask) {
        queueStatus.push({
            type: currentTask.type,
            summary: currentTask.type === 'text' ? currentTask.payload.message : currentTask.payload.prompt,
            status: 'processing'
        });
    }
    queueStatus.push(...queue.map(task => ({
        type: task.type,
        summary: task.type === 'text' ? task.payload.message : task.payload.prompt,
        status: 'queued'
    })));
    res.json(queueStatus);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
