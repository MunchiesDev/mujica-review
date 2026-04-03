export interface DiffFile {
  path: string;
  content: string;
}

export function parseDiff(rawDiff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const parts = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split('\n');
    const pathMatch = lines[0]?.match(/b\/(.+)$/);
    if (!pathMatch) continue;

    files.push({
      path: pathMatch[1],
      content: lines.join('\n'),
    });
  }

  return files;
}
