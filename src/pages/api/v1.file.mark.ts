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
  start: number;
  end: number;
  type: "got" | "not-got";
}

interface Range {
  start: number;
  end: number;
}

export default async function handler(request: NextRequest) {
  const markRequset: MarkRequest = await request.json();
  const { owner, repo, tag, path } = markRequset;
  const key = `ranges:${owner}/${repo}/${path}/${tag}`;
  const value = await kv.get<string>(key);
  let ranges: Range[] = parseKVValue(value, []);

  const { start, end, type } = markRequset;
  const overlapRanges = ranges.filter((r) => {
    if (r.end < start) {
      return false;
    }
    if (r.start > end) {
      return false;
    }
    return true;
  });
  if (overlapRanges.length === 0) {
    ranges.push({ start, end });
  } else if (type === "got") {
    // merge overlap ranges
    ranges = ranges.filter((r) => !overlapRanges.includes(r));
    const minStart: number = Math.min(overlapRanges[0].start, start);
    const maxEnd: number = Math.max(
      overlapRanges[overlapRanges.length - 1].end,
      end
    );
    ranges.push({ start: minStart, end: maxEnd });
  } else if (type === "not-got") {
    // split or remove ranges
    ranges = ranges.filter((r) => !overlapRanges.includes(r));
    overlapRanges.forEach((r) => {
      if (r.start < start) {
        ranges.push({ start: r.start, end: start - 1 });
      }
      if (r.end > end) {
        ranges.push({ start: end + 1, end: r.end });
      }
    });
  } else {
    // impossible
  }
  ranges.sort((r1, r2) => r1.start - r2.start);
  await kv.set(key, JSON.stringify(ranges));
  await kv.sadd<string>(`marked-paths:${owner}/${repo}/${tag}`, path);

  return new Response(JSON.stringify({ data: ranges, errorMessage: null }), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
