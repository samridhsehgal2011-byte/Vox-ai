export interface Message {
  role: "user" | "model";
  parts: string;
}

export const sendMessage = async (message: string) => {
  const lowerMsg = message.toLowerCase();
  let response = "At your service, sir. What would you like to do?";

  if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
    response = "Good day, sir. How can I assist you with your operations today?";
  } else if (lowerMsg.includes("status")) {
    response = "All sub-systems are operating within optimal parameters, sir.";
  } else if (lowerMsg.includes("time")) {
    response = "The current time is " + new Date().toLocaleTimeString() + ", sir.";
  } else if (lowerMsg.includes("analyze") || lowerMsg.includes("calculate")) {
    response = "Calculations complete, sir. The result suggests a high probability of success.";
  } else if (lowerMsg.includes("help")) {
    response = "I am operational and ready to assist with system maintenance, scheduling, or data processing. Simply state your requirements, sir.";
  } else {
    response = "I have logged your request: '" + message + "'. I am currently refining the parameters for that, sir.";
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(response);
    }, 600);
  });
};

export const sendMessageStream = async function* (message: string, history: Message[] = []) {
  const response = await sendMessage(message);
  for (const char of (response as string).split("")) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};
