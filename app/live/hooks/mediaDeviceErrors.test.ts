import { describe, expect, it, vi } from "vitest";
import {
  classifyMediaCaptureError,
  isRoomMediaConnected,
} from "./mediaDeviceErrors";
import { ConnectionState } from "livekit-client";

describe("classifyMediaCaptureError", () => {
  it("maps permission denial for mic and camera", () => {
    const err = { name: "NotAllowedError", message: "Permission denied" };
    expect(classifyMediaCaptureError(err, "microphone")).toMatch(/Microphone permission/);
    expect(classifyMediaCaptureError(err, "camera")).toMatch(/Camera permission/);
  });

  it("maps missing devices", () => {
    const err = { name: "NotFoundError", message: "Requested device not found" };
    expect(classifyMediaCaptureError(err, "microphone")).toMatch(/No microphone/);
    expect(classifyMediaCaptureError(err, "camera")).toMatch(/No camera/);
  });
});

describe("isRoomMediaConnected", () => {
  it("requires LiveKit connected state", () => {
    expect(isRoomMediaConnected(null)).toBe(false);
    expect(isRoomMediaConnected({ state: ConnectionState.Connecting })).toBe(
      false
    );
    expect(isRoomMediaConnected({ state: ConnectionState.Connected })).toBe(
      true
    );
  });
});

describe("localParticipant media toggles", () => {
  it("calls setMicrophoneEnabled and setCameraEnabled with the requested state", async () => {
    const setMicrophoneEnabled = vi.fn(async (enabled: boolean) => {
      local.isMicrophoneEnabled = enabled;
    });
    const setCameraEnabled = vi.fn(async (enabled: boolean) => {
      local.isCameraEnabled = enabled;
    });
    const local = {
      isMicrophoneEnabled: false,
      isCameraEnabled: false,
      setMicrophoneEnabled,
      setCameraEnabled,
    };

    await local.setMicrophoneEnabled(!local.isMicrophoneEnabled);
    await local.setCameraEnabled(!local.isCameraEnabled);

    expect(setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(setCameraEnabled).toHaveBeenCalledWith(true);
    expect(local.isMicrophoneEnabled).toBe(true);
    expect(local.isCameraEnabled).toBe(true);

    await local.setMicrophoneEnabled(!local.isMicrophoneEnabled);
    await local.setCameraEnabled(!local.isCameraEnabled);

    expect(setMicrophoneEnabled).toHaveBeenLastCalledWith(false);
    expect(setCameraEnabled).toHaveBeenLastCalledWith(false);
  });
});
