import { Env, makeSessionToken, setSessionCookie, getSessionCookie, validateSession } from "./_auth";

interface FunctionContext {
  request: Request;
  env: Env;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json() as { password?: string };

  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: "Invalid password" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = makeSessionToken(body.password);

  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setSessionCookie(token),
      },
    }
  );
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const cookie = getSessionCookie(request);
  const valid = validateSession(cookie, env.ADMIN_PASSWORD);

  return new Response(
    JSON.stringify({ authenticated: valid }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
