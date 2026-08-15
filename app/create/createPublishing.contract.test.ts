import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, buildCreatePostHref } from "../lib/nav/routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Create publishing final product V4", () => {
  it("keeps /create as a multi-type chooser, not a video-only redirect", () => {
    const page = read("app/create/page.tsx");
    expect(page).toMatch(/CreateChooser/);
    expect(page).not.toMatch(/APP_ROUTES\.createVideo/);
    expect(page).toMatch(/redirect\(/);
    expect(page).toMatch(/APP_ROUTES\.create/);

    const chooser = read("app/create/CreateChooser.tsx");
    const videoIdx = chooser.indexOf('title: "Video"');
    const postIdx = chooser.indexOf('title: "Write Post"');
    const imageIdx = chooser.indexOf('title: "Image"');
    const articleIdx = chooser.indexOf('title: "Article"');
    expect(videoIdx).toBeGreaterThan(-1);
    expect(postIdx).toBeGreaterThan(videoIdx);
    expect(imageIdx).toBeGreaterThan(postIdx);
    expect(articleIdx).toBeGreaterThan(imageIdx);
    expect(chooser).toMatch(/not\s+video-only/i);
  });

  it("exposes a first-class Write Post path that reuses the posts model", () => {
    expect(APP_ROUTES.createPost).toBe("/create/post");
    expect(buildCreatePostHref()).toBe("/create/post");
    expect(buildCreatePostHref({ image: true })).toBe("/create/post?image=1");
    expect(existsSync(join(ROOT, "app/create/post/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/create/post/CreatePostForm.tsx"))).toBe(
      true
    );

    const form = read("app/create/post/CreatePostForm.tsx");
    expect(form).toMatch(/createPost/);
    expect(form).toMatch(/uploadPostImage/);
    expect(form).toMatch(/umtuba:post-created/);
    expect(form).toMatch(/Checking your session/);
    expect(form).toMatch(/Please write something or choose an image/);
    expect(form).toMatch(/Publishing\.\.\./);
    expect(form).toMatch(/Uploading\.\.\./);
    expect(form).toMatch(/The post could not be published/);
    expect(form).toMatch(/Add Image/);
    expect(form).toMatch(/Selected image preview/);
    expect(form).toMatch(/Remove/);
    expect(form).toMatch(/Cancel/);
    expect(form).toMatch(/text-end/);
    expect(form).toMatch(/inset-inline-end|end-3/);

    const posts = read("lib/supabase/posts.ts");
    expect(posts).toMatch(/export async function createPost/);
    expect(posts).toMatch(/post_type: imageUrl \? "image" : "text"/);
  });

  it("preserves the video pre-publish editor without inventing an NLE", () => {
    const form = read("app/create/video/CreateVideoForm.tsx");
    expect(form).toMatch(/VideoOverlayEditor/);
    expect(form).toMatch(/probeVideoFileMetadata/);
    expect(form).toMatch(/validateCaption/);
    expect(form).toMatch(/Cancel upload/);
    expect(form).toMatch(/uploadPostVideo/);
    expect(form).not.toMatch(/trimTimeline|waveform|colorGrade|lutFilter/i);

    const editor = read("app/create/video/VideoOverlayEditor.tsx");
    expect(editor).toMatch(/Add text/);
    expect(editor).toMatch(/Stickers/);
    expect(editor).toMatch(/handleDeleteSelected/);
    expect(editor).toMatch(/Size/);
    expect(editor).toMatch(/Rotation/);
    expect(editor).toMatch(/dir="ltr"/);

    const layer = read("app/components/video/VideoOverlayLayer.tsx");
    expect(layer).toMatch(/dir="ltr"/);
    expect(layer).toMatch(/pointer-events-none/);
  });
});
