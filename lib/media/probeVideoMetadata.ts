import type { MediaMetadata } from "./pipelineTypes";
import { computeAspectRatioLabel } from "./pipelineTypes";

/**
 * Read basic metadata from a local File via an off-DOM video element.
 * Codec / fps / bitrate are not reliably available in the browser — left null for V1.
 */
export async function probeVideoFileMetadata(
  file: File
): Promise<MediaMetadata> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dims = await loadVideoDimensions(objectUrl);
    return {
      durationMs:
        dims.durationSec != null && Number.isFinite(dims.durationSec)
          ? Math.max(0, Math.round(dims.durationSec * 1000))
          : null,
      width: dims.width,
      height: dims.height,
      fps: null,
      codec: null,
      bitrate: null,
      fileSize: file.size > 0 ? file.size : null,
      aspectRatio: computeAspectRatioLabel(dims.width, dims.height),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadVideoDimensions(src: string): Promise<{
  width: number | null;
  height: number | null;
  durationSec: number | null;
}> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const finish = (
      width: number | null,
      height: number | null,
      durationSec: number | null
    ) => {
      video.removeAttribute("src");
      video.load();
      resolve({ width, height, durationSec });
    };

    video.onloadedmetadata = () => {
      const width =
        video.videoWidth > 0 ? Math.round(video.videoWidth) : null;
      const height =
        video.videoHeight > 0 ? Math.round(video.videoHeight) : null;
      const durationSec =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : null;
      finish(width, height, durationSec);
    };

    video.onerror = () => {
      finish(null, null, null);
    };

    window.setTimeout(() => {
      finish(
        video.videoWidth > 0 ? Math.round(video.videoWidth) : null,
        video.videoHeight > 0 ? Math.round(video.videoHeight) : null,
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : null
      );
    }, 8000);

    video.src = src;
  });
}
