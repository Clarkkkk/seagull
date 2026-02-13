import { TRPCError } from "@trpc/server";

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FetchImpl = (input: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<FetchResponse>;

export type ParsedLinkResult = {
  provider: "xiaohongshu";
  url: string;
  title: string | null;
  content: string | null;
  images: string[];
  raw: unknown;
};

type LinkParser = (url: string) => Promise<ParsedLinkResult>;

const XHS_HOSTS = new Set(["www.xiaohongshu.com", "xiaohongshu.com", "xhslink.com"]);

function extractXhsNoteId(url: URL) {
  if (url.host === "xhslink.com") {
    return null;
  }
  const match = url.pathname.match(/\/explore\/([A-Za-z0-9]+)|\/discovery\/item\/([A-Za-z0-9]+)/);
  return match ? match[1] || match[2] : null;
}

function parseXhsImages(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== "object") return [];
  const note = (data as { note?: unknown }).note;
  if (!note || typeof note !== "object") return [];
  const images = (note as { images?: unknown }).images;
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (!img || typeof img !== "object") return null;
      const url = (img as { url?: unknown }).url;
      return typeof url === "string" ? url : null;
    })
    .filter((value): value is string => !!value);
}

function parseXhsTitle(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const note = (data as { note?: unknown }).note;
  if (!note || typeof note !== "object") return null;
  const title = (note as { title?: unknown }).title;
  return typeof title === "string" ? title : null;
}

function parseXhsContent(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const note = (data as { note?: unknown }).note;
  if (!note || typeof note !== "object") return null;
  const desc = (note as { desc?: unknown }).desc;
  return typeof desc === "string" ? desc : null;
}

async function parseXiaohongshu(url: string): Promise<ParsedLinkResult> {
  const fetchImpl = (globalThis as unknown as { fetch?: FetchImpl }).fetch;
  if (!fetchImpl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Fetch is not available" });
  }

  const token = process.env.TIKHUB_API_TOKEN;
  if (!token) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Missing TIKHUB_API_TOKEN" });
  }

  const parsed = new URL(url);
  const isShortUrl = parsed.host === "xhslink.com";
  let endpoint: string;
  if (isShortUrl) {
    endpoint =
      "https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_feed_notes_v3" +
      `?short_url=${encodeURIComponent(url)}`;
  } else {
    const noteId = extractXhsNoteId(parsed);
    if (!noteId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported Xiaohongshu URL" });
    }
    endpoint =
      "https://api.tikhub.io/api/v1/xiaohongshu/web_v2/fetch_feed_notes_v2" +
      `?note_id=${encodeURIComponent(noteId)}`;
  }

  const response = await fetchImpl(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Xiaohongshu API failed (${response.status})`,
    });
  }

  const json = (await response.json()) as unknown;
  return {
    provider: "xiaohongshu",
    url,
    title: parseXhsTitle(json),
    content: parseXhsContent(json),
    images: parseXhsImages(json),
    raw: json,
  };
}

const parsers: Array<{ match: (url: URL) => boolean; parse: LinkParser }> = [
  {
    match: (url) => XHS_HOSTS.has(url.host),
    parse: parseXiaohongshu,
  },
];

export async function parseWishlistLink(url: string): Promise<ParsedLinkResult> {
  const parsed = new URL(url);
  const parser = parsers.find((candidate) => candidate.match(parsed));
  if (!parser) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported link provider" });
  }
  return parser.parse(url);
}
