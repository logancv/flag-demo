import { getFlag } from "./flags";

interface Document {
  id: string;
  content: string;
  ownerId: string;
  collaborators: string[];
}

export function openDocument(doc: Document, userId: string) {
  if (getFlag("team_collaboration")) {
    return openWithRealtime(doc, userId);
  }
  return openReadOnly(doc, userId);
}

function openWithRealtime(doc: Document, userId: string) {
  const session = realtimeServer.createSession(doc.id);
  session.join(userId);
  session.onEdit((change) => {
    broadcastToCollaborators(doc.collaborators, change);
  });
  return { mode: "collaborative", sessionId: session.id, cursors: session.getActiveCursors() };
}

function openReadOnly(doc: Document, userId: string) {
  return { mode: "readonly", content: doc.content };
}

export function saveDocument(doc: Document, userId: string) {
  if (getFlag("team_collaboration")) {
    return mergeAndSave(doc, userId);
  }
  return directSave(doc);
}

function mergeAndSave(doc: Document, userId: string) {
  const merged = conflictResolver.merge(doc.id, doc.content, userId);
  return db.documents.update(doc.id, merged);
}

function directSave(doc: Document) {
  return db.documents.update(doc.id, doc.content);
}
