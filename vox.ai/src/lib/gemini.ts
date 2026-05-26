/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  role: "user" | "model";
  parts: string;
}

export const sendMessage = async (message: string, history: Message[] = []) => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Gemini API quota exceeded. Please try again later.");
    }
    throw new Error("Connection error.");
  }
  
  const data = await response.json();
  return data.text;
};

export const sendMessageStream = async function* (message: string, history: Message[] = []) {
  // Simple fetch-based streaming might be complex to implement quickly.
  // For now, let's use the non-streaming sendMessage, or implement a basic stream.
  
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Gemini API quota exceeded. Please try again later.");
    }
    throw new Error("Connection error.");
  }
  
  const data = await response.json();
  
  for (const char of (data.text as string).split("")) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};
