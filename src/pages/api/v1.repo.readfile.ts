import { RepoService } from "@/services/repoService";
import type { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobURL = searchParams.get("url") as string;
  const data = await new RepoService().getFileContent(blobURL);
  return new Response(JSON.stringify({ data, errorMessage: null }), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
