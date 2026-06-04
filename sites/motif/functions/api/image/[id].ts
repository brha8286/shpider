import { Env } from "../_auth";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const id = params.id as string;

  const obj = await env.IMAGES.get(id);
  if (obj) {
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Fallback: images uploaded before R2 migration were stored in KV
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
