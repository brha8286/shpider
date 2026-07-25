import { Env, requireAuth } from "./_auth";

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ticketUrl: string;
  flyerUrl: string;
  venue: string;
  city: string;
  state: string;
  isPublic: boolean;
}

const KV_KEY = "events";

async function getEvents(env: Env): Promise<EventItem[]> {
  const raw = await env.CONTENT.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setEvents(env: Env, events: EventItem[]): Promise<void> {
  await env.CONTENT.put(KV_KEY, JSON.stringify(events));
}

// An event counts as "upcoming" until 8am the next morning in the venue's
// timezone, so tonight's show doesn't flip to past mid-show.
function effectiveToday(): string {
  const shifted = new Date(Date.now() - 8 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

// GET /api/events — public (no auth), returns only public future events (ascending)
// GET /api/events?past=1 — public (no auth), returns public past events (most recent first)
// GET /api/events?all=1 — admin (auth required), returns all events
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";
  const past = url.searchParams.get("past") === "1";

  if (all) {
    const denied = requireAuth(request, env);
    if (denied) return denied;
  }

  let events = await getEvents(env);

  if (all) {
    events = events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  } else if (past) {
    const today = effectiveToday();
    events = events
      .filter((e) => e.isPublic && e.eventDate < today)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  } else {
    const today = effectiveToday();
    events = events
      .filter((e) => e.isPublic && e.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }

  return new Response(JSON.stringify({ events }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};

async function storeFlyerFile(env: Env, fileData: string, contentType: string): Promise<string> {
  const id = crypto.randomUUID();
  const bytes = new Uint8Array(atob(fileData).split("").map((c) => c.charCodeAt(0)));
  await env.CONTENT.put(`image:${id}`, bytes.buffer, { metadata: { contentType } });
  return `/api/image/${id}`;
}

// POST /api/events — admin only, create a new event
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const body = (await request.json()) as Partial<EventItem> & {
    flyerFileData?: string;
    flyerContentType?: string;
  };
  if (!body.title || !body.eventDate) {
    return new Response(
      JSON.stringify({ error: "title and eventDate are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let flyerUrl = body.flyerUrl ?? "";
  if (body.flyerFileData && body.flyerContentType) {
    flyerUrl = await storeFlyerFile(env, body.flyerFileData, body.flyerContentType);
  }

  const events = await getEvents(env);
  const event: EventItem = {
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? "",
    eventDate: body.eventDate,
    startTime: body.startTime ?? "",
    endTime: body.endTime ?? "",
    ticketUrl: body.ticketUrl ?? "",
    flyerUrl,
    venue: body.venue ?? "",
    city: body.city ?? "",
    state: body.state ?? "",
    isPublic: body.isPublic ?? true,
  };

  events.push(event);
  await setEvents(env, events);

  return new Response(JSON.stringify(event), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT /api/events — admin only, update an event (id in body)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const body = (await request.json()) as Partial<EventItem> & {
    id: string;
    flyerFileData?: string;
    flyerContentType?: string;
  };
  if (!body.id) {
    return new Response(
      JSON.stringify({ error: "id is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (body.flyerFileData && body.flyerContentType) {
    body.flyerUrl = await storeFlyerFile(env, body.flyerFileData, body.flyerContentType);
  }
  delete (body as any).flyerFileData;
  delete (body as any).flyerContentType;

  const events = await getEvents(env);
  const idx = events.findIndex((e) => e.id === body.id);
  if (idx < 0) {
    return new Response(
      JSON.stringify({ error: "Event not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  events[idx] = { ...events[idx], ...body };
  await setEvents(env, events);

  return new Response(JSON.stringify(events[idx]), {
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE /api/events — admin only, delete by id in query string
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

  let events = await getEvents(env);
  events = events.filter((e) => e.id !== id);
  await setEvents(env, events);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
