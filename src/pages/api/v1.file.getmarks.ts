import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";

import { parseKVValue } from "@/helper";

export const config = {
  runtime: "edge",
};

interface MarkRequest {
  owner: string;
  repo: string;
  tag: string;
  path: string;
}

export default async function handler(request: NextRequest) {
  const markRequset: MarkRequest = await request.json();
  const { owner, repo, tag, path } = markRequset;
  const key = `ranges:${owner}/${repo}/${path}/${tag}`;
  const value = await kv.get<string>(key);
  const ranges = parseKVValue(value, []);

  return new Response(JSON.stringify({ data: ranges, errorMessage: null }), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
