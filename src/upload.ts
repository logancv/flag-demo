import { getFlag } from "./flags";

type AllowedMimeType = "image/png" | "image/jpeg" | "application/pdf" | "video/mp4" | "video/webm";

const BASE_MIME_TYPES: AllowedMimeType[] = ["image/png", "image/jpeg", "application/pdf"];
const VIDEO_MIME_TYPES: AllowedMimeType[] = ["video/mp4", "video/webm"];

export function getAllowedFileTypes(): AllowedMimeType[] {
  if (getFlag("video_upload")) {
    return [...BASE_MIME_TYPES, ...VIDEO_MIME_TYPES];
  }
  return BASE_MIME_TYPES;
}

export async function uploadFile(file: File, userId: string) {
  const allowed = getAllowedFileTypes();
  if (!allowed.includes(file.type as AllowedMimeType)) {
    throw new Error(`File type ${file.type} is not supported`);
  }

  if (getFlag("video_upload") && VIDEO_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return uploadAndTranscode(file, userId);
  }

  return uploadStatic(file, userId);
}

async function uploadAndTranscode(file: File, userId: string) {
  const raw = await storage.put(`uploads/${userId}/${file.name}`, file);
  const job = await transcoder.submit(raw.key, { format: "hls", qualities: ["720p", "1080p"] });
  return { key: raw.key, transcodingJobId: job.id, status: "processing" };
}

async function uploadStatic(file: File, userId: string) {
  const result = await storage.put(`uploads/${userId}/${file.name}`, file);
  return { key: result.key, status: "complete" };
}

export function renderUploadButton() {
  const types = getAllowedFileTypes();
  const accept = types.join(",");
  const label = getFlag("video_upload") ? "Upload files or videos" : "Upload files";
  return { component: "UploadButton", props: { accept, label } };
}
