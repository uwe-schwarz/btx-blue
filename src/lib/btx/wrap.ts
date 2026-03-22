import { BTX_COLUMNS } from "@/lib/btx/constants";

function breakLongWord(word: string, width: number): string[] {
  const parts: string[] = [];

  for (let index = 0; index < word.length; index += width) {
    parts.push(word.slice(index, index + width));
  }

  return parts;
}

export function wrapText(text: string, width = BTX_COLUMNS): string[] {
  const source = text.trim();

  if (!source) {
    return [""];
  }

  const paragraphs = source.split(/\n+/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const word of words) {
      if (word.length > width) {
        if (current) {
          lines.push(current);
          current = "";
        }

        const chunks = breakLongWord(word, width);
        lines.push(...chunks.slice(0, -1));
        current = chunks.at(-1) ?? "";
        continue;
      }

      const candidate = current ? `${current} ${word}` : word;

      if (candidate.length <= width) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [""];
}
