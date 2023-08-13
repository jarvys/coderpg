import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

export const config = {
  runtime: "edge",
};

export default async function handler(request: NextRequest) {
  const { owner, repo, tag } = await request.json();
  let result: string[] = [];
  let cursor = null;
  while (cursor !== 0) {
    const key = `marked-paths:${owner}/${repo}/${tag}`;
    const [nextCursor, paths] = await kv.sscan(key, cursor || 0);
    console.log("nextCursor", nextCursor, "paths", paths);
    cursor = nextCursor;
    result = [...result, ...(paths as string[])];
  }

  return new Response(
    JSON.stringify({ data: result, errorCode: null, errorMessage: null }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }
  );
}
