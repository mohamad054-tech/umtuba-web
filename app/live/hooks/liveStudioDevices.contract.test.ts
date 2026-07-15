import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyMediaCaptureError } from "./mediaDeviceErrors";

/**
 * Contract checks for Live Studio device handling used by useLiveMediaSession.
 * Full browser device enumeration needs a real room; these guards ensure the
 * permission/error paths, device switching, and cleanup contracts stay intact.
 */
describe("Live Studio media device contracts", () => {
  it("classifies permission denied for mic/camera prompts", () => {
    expect(
      classifyMediaCaptureError(
        { name: "NotAllowedError", message: "Permission denied" },
        "microphone"
      )
    ).toMatch(/permission|allow|mic/i);

    expect(
      classifyMediaCaptureError(
        { name: "NotAllowedError", message: "Permission denied" },
        "camera"
      )
    ).toMatch(/permission|allow|camera/i);
  });

  it("classifies missing devices without crashing", () => {
    expect(
      classifyMediaCaptureError(
        { name: "NotFoundError", message: "Requested device not found" },
        "camera"
      )
    ).toMatch(/camera|device|found/i);
  });

  it("classifies busy / in-use device conflicts", () => {
    const message = classifyMediaCaptureError(
      { name: "NotReadableError", message: "Device in use" },
      "microphone"
    );
    expect(message).toMatch(/in use|microphone/i);
  });

  it("keeps Live Studio session APIs for preview, toggle, switch, and cleanup", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, "useLiveMediaSession.ts"), "utf8");

    expect(source).toContain("toggleMic");
    expect(source).toContain("toggleCamera");
    expect(source).toContain("switchCamera");
    expect(source).toContain("Room.getLocalDevices");
    expect(source).toContain("switchActiveDevice");
    expect(source).toContain("setMicrophoneEnabled");
    expect(source).toContain("setCameraEnabled");
    expect(source).toContain("permissionState");
    expect(source).toContain("safeDisconnectRoom");
    expect(source).toContain("removeAllListeners");
    expect(source).toContain("sessionGenRef.current += 1");
    expect(source).toContain("scheduleUnexpectedReconnect");
    expect(source).toContain("scheduleTokenRefresh");
    expect(source).toContain("desiredDevicesRef");
    expect(source).toContain("optionsRef.current");
  });
});

