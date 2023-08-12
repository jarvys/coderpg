export function parseKVValue(value: any, fallback: any) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error(e);
    return fallback;
  }
}

interface Range {
  start: number;
  end: number;
}

export function mapRangeToLinesDecoration(ranges: Range[]) {
  return ranges.map((r: { start: number; end: number }) => {
    return {
      options: {
        isWholeLine: true,
        linesDecorationsClassName: "coderpg-lines-got",
      },
      range: {
        startLineNumber: r.start,
        startLineColumn: 1,
        endLineNumber: r.end,
        endLineColumn: 1,
      },
    };
  });
}
