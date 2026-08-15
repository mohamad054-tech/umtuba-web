"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  addOverlay,
  clampScale,
  countByKind,
  createStickerOverlay,
  createTextOverlay,
  MAX_OVERLAYS,
  MAX_OVERLAY_SCALE,
  MAX_OVERLAY_TEXT_LENGTH,
  MIN_OVERLAY_SCALE,
  OVERLAY_TEXT_COLORS,
  removeOverlay,
  STICKER_EMOJIS,
  updateOverlay,
  type VideoOverlayElement,
} from "../../../lib/media/videoOverlays";

type VideoOverlayEditorProps = {
  videoSrc: string;
  fileName?: string | null;
  /** Optional metadata row (dimensions / duration) rendered under the stage. */
  metaLabel?: ReactNode;
  elements: VideoOverlayElement[];
  onChange: (next: VideoOverlayElement[]) => void;
  onRemoveFile: () => void;
  disabled?: boolean;
};

const NUDGE = 0.02;

export default function VideoOverlayEditor({
  videoSrc,
  fileName,
  metaLabel,
  elements,
  onChange,
  onRemoveFile,
  disabled = false,
}: VideoOverlayEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const emojiPanelId = useId();

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const counts = countByKind(elements);
  const atCapacity = elements.length >= MAX_OVERLAYS;

  const commit = useCallback(
    (next: VideoOverlayElement[]) => {
      if (disabled) return;
      onChange(next);
    },
    [disabled, onChange]
  );

  function handleAddText() {
    if (disabled || atCapacity) return;
    const el = createTextOverlay({ y: 0.35 });
    commit(addOverlay(elements, el));
    setSelectedId(el.id);
  }

  function handleAddSticker(emoji: string) {
    if (disabled || atCapacity) return;
    const el = createStickerOverlay(emoji, { y: 0.5 });
    commit(addOverlay(elements, el));
    setSelectedId(el.id);
  }

  function handleDeleteSelected() {
    if (disabled || !selectedId) return;
    commit(removeOverlay(elements, selectedId));
    setSelectedId(null);
  }

  function handleClearAll() {
    if (disabled || elements.length === 0) return;
    commit([]);
    setSelectedId(null);
  }

  function normalizedFromEvent(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const offset = dragOffsetRef.current ?? { dx: 0, dy: 0 };
    return {
      x: (clientX - offset.dx - rect.left) / rect.width,
      y: (clientY - offset.dy - rect.top) / rect.height,
    };
  }

  function handleElementPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    el: VideoOverlayElement
  ) {
    if (disabled) return;
    event.stopPropagation();
    setSelectedId(el.id);

    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      const centerX = rect.left + el.x * rect.width;
      const centerY = rect.top + el.y * rect.height;
      dragOffsetRef.current = {
        dx: event.clientX - centerX,
        dy: event.clientY - centerY,
      };
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore unsupported pointer capture
    }
  }

  function handleElementPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
    el: VideoOverlayElement
  ) {
    if (disabled) return;
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    const point = normalizedFromEvent(event.clientX, event.clientY);
    if (!point) return;
    commit(updateOverlay(elements, el.id, { x: point.x, y: point.y }));
  }

  function handleElementPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragOffsetRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  function handleElementKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    el: VideoOverlayElement
  ) {
    if (disabled) return;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        commit(updateOverlay(elements, el.id, { x: el.x - NUDGE }));
        break;
      case "ArrowRight":
        event.preventDefault();
        commit(updateOverlay(elements, el.id, { x: el.x + NUDGE }));
        break;
      case "ArrowUp":
        event.preventDefault();
        commit(updateOverlay(elements, el.id, { y: el.y - NUDGE }));
        break;
      case "ArrowDown":
        event.preventDefault();
        commit(updateOverlay(elements, el.id, { y: el.y + NUDGE }));
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        commit(removeOverlay(elements, el.id));
        setSelectedId(null);
        break;
      case "Escape":
        event.preventDefault();
        setSelectedId(null);
        break;
      default:
        break;
    }
  }

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        {/* Editing stage: video preview + interactive overlay layer. */}
        <div
          ref={stageRef}
          dir="ltr"
          className="relative aspect-[9/16] max-h-[70vh] w-full bg-black max-sm:aspect-auto max-sm:h-[min(52vh,calc(100dvh-18rem))] max-sm:max-h-none"
          style={{ containerType: "size" }}
        >
          <video
            src={videoSrc}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black object-contain"
            aria-label={
              fileName ? `Preview of ${fileName}` : "Selected video preview"
            }
          />

          <div className="pointer-events-none absolute inset-0">
            {elements.map((el) => {
              const isSelected = el.id === selectedId;
              const style: CSSProperties = {
                position: "absolute",
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                fontSize: `${el.scale * 100}cqmin`,
                lineHeight: 1.1,
                cursor: disabled ? "default" : "grab",
                touchAction: "none",
                maxWidth: "92%",
                padding: "0.06em 0.12em",
                borderRadius: "0.15em",
                outline: isSelected
                  ? "0.06em dashed rgba(255,255,255,0.85)"
                  : "none",
                outlineOffset: "0.05em",
              };
              const contentStyle: CSSProperties =
                el.kind === "text"
                  ? {
                      color: el.color ?? "#ffffff",
                      fontWeight: 800,
                      textAlign: "center",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      textShadow:
                        el.color && el.color.toLowerCase() === "#000000"
                          ? "0 1px 4px rgba(255,255,255,0.55)"
                          : "0 2px 8px rgba(0,0,0,0.55)",
                    }
                  : { filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" };

              return (
                <div
                  key={el.id}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={
                    el.kind === "text"
                      ? `Text overlay: ${el.text}`
                      : `Sticker overlay: ${el.emoji}`
                  }
                  aria-pressed={isSelected}
                  className="pointer-events-auto select-none"
                  style={style}
                  onPointerDown={(event) =>
                    handleElementPointerDown(event, el)
                  }
                  onPointerMove={(event) =>
                    handleElementPointerMove(event, el)
                  }
                  onPointerUp={handleElementPointerUp}
                  onPointerCancel={handleElementPointerUp}
                  onKeyDown={(event) => handleElementKeyDown(event, el)}
                  onFocus={() => setSelectedId(el.id)}
                >
                  <span style={contentStyle}>
                    {el.kind === "text" ? el.text : el.emoji}
                  </span>
                </div>
              );
            })}
          </div>

          {elements.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-4">
              <p className="rounded-full bg-black/55 px-3 py-1.5 text-center text-xs font-medium text-white/70 backdrop-blur">
                Add text or stickers below, then drag to position.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm">
          <div className="min-w-0">
            {fileName ? (
              <p className="truncate text-white/60">{fileName}</p>
            ) : null}
            {metaLabel ? (
              <div className="text-xs text-white/35">{metaLabel}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemoveFile}
            disabled={disabled}
            className="watch-focus-ring shrink-0 rounded-full border border-white/15 px-3 py-1.5 font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-white/80">Add text &amp; stickers</p>
          <p className="text-xs text-white/40">
            {counts.text} text · {counts.sticker} stickers
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddText}
            disabled={disabled || atCapacity}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add text
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled || elements.length === 0}
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
        </div>

        <div className="mt-3">
          <p id={emojiPanelId} className="text-xs font-medium text-white/45">
            Stickers
          </p>
          <div
            role="group"
            aria-labelledby={emojiPanelId}
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {STICKER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddSticker(emoji)}
                disabled={disabled || atCapacity}
                aria-label={`Add ${emoji} sticker`}
                className="watch-focus-ring rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xl leading-none hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {atCapacity ? (
          <p className="mt-3 text-xs text-amber-200/80" role="status">
            Overlay limit reached ({MAX_OVERLAYS}). Remove one to add more.
          </p>
        ) : null}

        {/* Selected element controls */}
        {selected ? (
          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                {selected.kind === "text" ? "Text element" : "Sticker element"}
              </p>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={disabled}
                className="watch-focus-ring rounded-full border border-red-300/25 px-3 py-1 text-xs font-bold text-red-200 hover:bg-red-300/10 disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            {selected.kind === "text" ? (
              <>
                <label className="block text-xs font-medium text-white/55">
                  Text
                  <input
                    type="text"
                    value={selected.text ?? ""}
                    maxLength={MAX_OVERLAY_TEXT_LENGTH}
                    onChange={(event) =>
                      commit(
                        updateOverlay(elements, selected.id, {
                          text: event.target.value,
                        })
                      )
                    }
                    disabled={disabled}
                    className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:opacity-60"
                  />
                </label>

                <div>
                  <p className="text-xs font-medium text-white/55">Color</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {OVERLAY_TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Text color ${color}`}
                        aria-pressed={selected.color === color}
                        onClick={() =>
                          commit(
                            updateOverlay(elements, selected.id, { color })
                          )
                        }
                        disabled={disabled}
                        className={`h-7 w-7 rounded-full border transition ${
                          selected.color === color
                            ? "border-white ring-2 ring-white/60"
                            : "border-white/20"
                        } disabled:opacity-50`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <label className="block text-xs font-medium text-white/55">
              Size
              <input
                type="range"
                min={MIN_OVERLAY_SCALE}
                max={MAX_OVERLAY_SCALE}
                step={0.005}
                value={selected.scale}
                onChange={(event) =>
                  commit(
                    updateOverlay(elements, selected.id, {
                      scale: clampScale(Number(event.target.value)),
                    })
                  )
                }
                disabled={disabled}
                className="mt-1 w-full accent-white"
              />
            </label>

            <label className="block text-xs font-medium text-white/55">
              Rotation
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={selected.rotation}
                onChange={(event) =>
                  commit(
                    updateOverlay(elements, selected.id, {
                      rotation: Number(event.target.value),
                    })
                  )
                }
                disabled={disabled}
                className="mt-1 w-full accent-white"
              />
            </label>
          </div>
        ) : (
          <p className="mt-3 text-xs text-white/40">
            Tip: tap an overlay to edit it. Use arrow keys to nudge, Delete to
            remove.
          </p>
        )}
      </div>
    </div>
  );
}
