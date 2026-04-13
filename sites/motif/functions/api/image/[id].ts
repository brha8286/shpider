import { Env } from "../_auth";

// Serves an image stored in KV. Public, no auth required.
// Images are stored as base64 under key "image:<id>" with metadata { contentType }.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const id = params.id as string;

  const result = await env.CONTENT.getWithMetadata<{ contentType: string }>(
    `image:${id}`,
    { type: "arrayBuffer" }
  );

  if (!result.value) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.value, {
    headers: {
      "Content-Type": result.metadata?.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
