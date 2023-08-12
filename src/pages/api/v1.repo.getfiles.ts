import type { NextRequest } from "next/server";

import { RepoService } from "@/services/repoService";

export const config = {
  runtime: "edge",
};

const localCache: Record<string, string> = {};

export default async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const owner = searchParams.get("owner") as string;
  const repo = searchParams.get("repo") as string;
  const tag = searchParams.get("tag") as string;

  const key = `tree:${owner}/${repo}/${tag}`;
  let files: any;
  const value = localCache[key];
  if (value) {
    files = JSON.parse(value);
  } else {
    files = await new RepoService().getFiles({ owner, repo, tag });
    localCache[key] = JSON.stringify(files);
  }
  return new Response(
    JSON.stringify({ data: files, errorCode: null, errorMessage: null }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }
  );
}
