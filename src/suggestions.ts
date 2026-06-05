import { getFlag } from "./flags";

interface Suggestion {
  text: string;
  confidence: number;
  source: "history" | "ml";
}

export function getSuggestions(query: string, userId: string): Suggestion[] {
  const historySuggestions = getHistorySuggestions(query, userId);

  if (getFlag("smart_suggestions")) {
    const mlSuggestions = getMLSuggestions(query, userId);
    return mergeSuggestions(historySuggestions, mlSuggestions);
  }

  return historySuggestions;
}

function getHistorySuggestions(query: string, userId: string): Suggestion[] {
  return searchHistory
    .find(userId, query)
    .map((item) => ({ text: item.query, confidence: item.frequency / 100, source: "history" as const }));
}

function getMLSuggestions(query: string, userId: string): Suggestion[] {
  return mlEngine
    .predict(query, { userId, topK: 5 })
    .map((pred) => ({ text: pred.text, confidence: pred.score, source: "ml" as const }));
}

function mergeSuggestions(history: Suggestion[], ml: Suggestion[]): Suggestion[] {
  const seen = new Set(history.map((s) => s.text));
  const unique = ml.filter((s) => !seen.has(s.text));
  return [...history, ...unique].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}
