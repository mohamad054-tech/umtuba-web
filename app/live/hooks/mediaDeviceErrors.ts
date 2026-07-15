import { ConnectionState } from "livekit-client";

/**
 * Map getUserMedia / LiveKit capture failures to short, actionable UI copy.
 */
export function classifyMediaCaptureError(
  err: unknown,
  kind: "microphone" | "camera" | "screen"
): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name?: string }).name)
      : "";
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const combined = `${name} ${message}`.toLowerCase();

  if (
    name === "NotAllowedError" ||
    combined.includes("permission") ||
    combined.includes("not allowed") ||
    combined.includes("denied")
  ) {
    if (kind === "microphone") {
      return "Microphone permission was denied. Allow mic access in the browser, then try again.";
    }
    if (kind === "camera") {
      return "Camera permission was denied. Allow camera access in the browser, then try again.";
    }
    return "Screen share was blocked. Allow screen sharing, then try again.";
  }

  if (
    name === "NotFoundError" ||
    combined.includes("not found") ||
    combined.includes("no device") ||
    combined.includes("requested device not found")
  ) {
    if (kind === "microphone") {
      return "No microphone was found. Plug one in, then try again.";
    }
    if (kind === "camera") {
      return "No camera was found. Plug one in, then try again.";
    }
    return "Unable to start screen share on this device.";
  }

  if (
    name === "NotReadableError" ||
    combined.includes("could not start") ||
    combined.includes("in use") ||
    combined.includes("busy")
  ) {
    if (kind === "microphone") {
      return "Microphone is in use by another app. Close it, then try again.";
    }
    if (kind === "camera") {
      return "Camera is in use by another app. Close it, then try again.";
    }
    return "Unable to share screen right now. Try again.";
  }

  if (name === "OverconstrainedError" || combined.includes("overconstrained")) {
    return kind === "camera"
      ? "Camera does not support the requested settings."
      : "Microphone does not support the requested settings.";
  }

  if (
    combined.includes("publish") ||
    combined.includes("not allowed to publish")
  ) {
    return "You do not have permission to publish media in this room.";
  }

  if (message.trim()) {
    return message.trim();
  }

  if (kind === "microphone") {
    return "Unable to toggle microphone.";
  }
  if (kind === "camera") {
    return "Unable to toggle camera.";
  }
  return "Unable to toggle screen share.";
}

export function isRoomMediaConnected(room: {
  state?: ConnectionState | string;
} | null): boolean {
  return Boolean(room && room.state === ConnectionState.Connected);
}
