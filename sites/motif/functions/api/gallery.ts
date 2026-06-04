import { Env, requireAuth } from "./_auth";

interface GalleryItem {
  id: string;
  url: string;
  thumbUrl?: string;
  alt: string;
  caption: string;
  sortOrder: number;
  isPublic: boolean;
}

const KV_KEY = "gallery";

async function getGallery(env: Env): Promise<GalleryItem[]> {
  const raw = await env.CONTENT.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setGallery(env: Env, items: GalleryItem[]): Promise<void> {
  await env.CONTENT.put(KV_KEY, JSON.stringify(items));
}

// GET /api/gallery — public (no auth), returns only public images
// GET /api/gallery?all=1 — admin (auth required), returns all images
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";

  if (all) {
    const denied = requireAuth(request, env);
    if (denied) return denied;
  }

  let images = await getGallery(env);

  if (!all) {
    images = images.filter((i) => i.isPublic);
  }

  images = images.sort((a, b) => a.sortOrder - b.sortOrder);

  return new Response(JSON.stringify({ images }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};

// POST /api/gallery — admin only, add an image
// Accepts either { url } for external links or { fileData, contentType, fileName } for uploads
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const body = (await request.json()) as Partial<GalleryItem> & {
    fileData?: string;
    contentType?: string;
    fileName?: string;
    thumbData?: string;
    thumbContentType?: string;
  };

  let url: string;
  let thumbUrl: string | undefined;

  if (body.fileData && body.contentType) {
    // File upload — decode base64 and store in KV
    const id = crypto.randomUUID();

    const fullBytes = new Uint8Array(atob(body.fileData).split("").map((c) => c.charCodeAt(0)));
    await env.IMAGES.put(id, fullBytes.buffer, {
      httpMetadata: { contentType: body.contentType },
    });
    url = `/api/image/${id}`;

    if (body.thumbData && body.thumbContentType) {
      const thumbBytes = new Uint8Array(atob(body.thumbData).split("").map((c) => c.charCodeAt(0)));
      await env.IMAGES.put(`${id}-thumb`, thumbBytes.buffer, {
        httpMetadata: { contentType: body.thumbContentType },
      });
      thumbUrl = `/api/image/${id}-thumb`;
    }
  } else if (body.url) {
    url = body.url;
  } else {
    return new Response(
      JSON.stringify({ error: "Either a file or url is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const images = await getGallery(env);
  const maxSort = images.reduce((max, i) => Math.max(max, i.sortOrder), -1);

  const item: GalleryItem = {
    id: crypto.randomUUID(),
    url,
    ...(thumbUrl ? { thumbUrl } : {}),
    alt: body.alt ?? "",
    caption: body.caption ?? "",
    sortOrder: maxSort + 1,
    isPublic: body.isPublic ?? true,
  };

  images.push(item);
  await setGallery(env, images);

  return new Response(JSON.stringify(item), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT /api/gallery — admin only, update an image (id in body)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const body = (await request.json()) as Partial<GalleryItem> & {
    id: string;
    thumbData?: string;
    thumbContentType?: string;
  };
  if (!body.id) {
    return new Response(
      JSON.stringify({ error: "id is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const images = await getGallery(env);
  const idx = images.findIndex((i) => i.id === body.id);
  if (idx < 0) {
    return new Response(
      JSON.stringify({ error: "Image not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // If thumbData is included, store the thumbnail in KV and set thumbUrl
  if (body.thumbData && body.thumbContentType) {
    const thumbBytes = new Uint8Array(atob(body.thumbData).split("").map((c) => c.charCodeAt(0)));
    await env.IMAGES.put(`${body.id}-thumb`, thumbBytes.buffer, {
      httpMetadata: { contentType: body.thumbContentType },
    });
    body.thumbUrl = `/api/image/${body.id}-thumb`;
  }
  delete (body as any).thumbData;
  delete (body as any).thumbContentType;

  images[idx] = { ...images[idx], ...body };
  await setGallery(env, images);

  return new Response(JSON.stringify(images[idx]), {
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE /api/gallery — admin only, delete by id in query string
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(
      JSON.stringify({ error: "id query param required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let images = await getGallery(env);
  const deleted = images.find((i) => i.id === id);
  images = images.filter((i) => i.id !== id);
  await setGallery(env, images);

  if (deleted?.url.startsWith("/api/image/")) {
    const r2Key = deleted.url.replace("/api/image/", "");
    await env.IMAGES.delete(r2Key);
    if (deleted.thumbUrl?.startsWith("/api/image/")) {
      await env.IMAGES.delete(deleted.thumbUrl.replace("/api/image/", ""));
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
