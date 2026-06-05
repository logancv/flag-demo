import { getFlag } from "./flags";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function renderSupportWidget() {
  if (getFlag("ai_chatbot")) {
    return renderAIChatbot();
  }
  return renderContactForm();
}

function renderAIChatbot() {
  return {
    component: "AIChatWidget",
    props: {
      endpoint: "/api/chat/completions",
      systemPrompt: "You are a helpful support assistant.",
      maxTurns: 10,
    },
  };
}

function renderContactForm() {
  return {
    component: "ContactForm",
    props: { email: "support@example.com" },
  };
}

export async function handleChatMessage(history: ChatMessage[], userMessage: string) {
  if (!getFlag("ai_chatbot")) {
    throw new Error("AI chatbot is not enabled");
  }
  const response = await llmClient.chat([...history, { role: "user", content: userMessage }]);
  return { role: "assistant" as const, content: response.text };
}
