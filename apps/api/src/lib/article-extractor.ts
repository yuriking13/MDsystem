/**
 * Library for extracting article metadata from PDF and Word files using AI
 */

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ExtractedArticle = {
  title: string | null;
  authors: string[] | null;
  year: number | null;
  doi: string | null;
  url: string | null;
  journal: string | null;
  abstract: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  bibliography: ExtractedReference[] | null;
};

export type ExtractedReference = {
  text: string; // Original citation text
  title: string | null;
  authors: string | null;
  year: number | null;
  doi: string | null;
  journal: string | null;
};

/**
 * Extract text from PDF file
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  parser.destroy();
  return result.text;
}

/**
 * Extract text from Word file (docx)
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract text from file based on mime type
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractTextFromWord(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Prepare text for AI analysis - get start and end parts for metadata + bibliography
 */
function prepareTextForAnalysis(text: string): { headerText: string; refText: string; fullTextForDoi: string } {
  // Get first 10000 chars for header, abstract, authors, DOI, etc.
  const headerText = text.slice(0, 10000);
  
  // Get last 20000 chars for bibliography (references are usually at the end)
  const refText = text.length > 20000 ? text.slice(-20000) : text;
  
  // Get first 3000 chars for DOI extraction (main article DOI is usually in the header)
  const fullTextForDoi = text.slice(0, 3000);
  
  return { headerText, refText, fullTextForDoi };
}

/**
 * Use AI to extract article metadata from text
 */
export async function extractArticleMetadataWithAI(
  text: string,
  openrouterKey: string
): Promise<ExtractedArticle> {
  const { headerText, refText } = prepareTextForAnalysis(text);
  
  // Combine header and reference sections with a separator
  const combinedText = `=== НАЧАЛО СТАТЬИ (первые страницы) ===
${headerText}

=== КОНЕЦ СТАТЬИ (последние страницы, включая библиографию) ===
${refText}`;
  
  const systemPrompt = `Ты - эксперт по извлечению метаданных из научных статей. 
Тебе предоставлены две части текста:
1. НАЧАЛО СТАТЬИ - содержит заголовок, авторов, абстракт, DOI статьи
2. КОНЕЦ СТАТЬИ - содержит библиографию/список литературы

Твоя задача - извлечь:

1. **Заголовок статьи** (title) - из НАЧАЛА
2. **Авторы** (authors) - список авторов из НАЧАЛА
3. **Год публикации** (year) - из НАЧАЛА
4. **DOI статьи** (doi) - ТОЛЬКО DOI самой статьи из НАЧАЛА (НЕ из библиографии!)
5. **URL** (если есть ссылка на статью) - из НАЧАЛА
6. **Название журнала** (journal) - из НАЧАЛА
7. **Абстракт** (abstract) - резюме статьи из НАЧАЛА
8. **Том** (volume) - из НАЧАЛА
9. **Выпуск** (issue) - из НАЧАЛА
10. **Страницы** (pages) - из НАЧАЛА
11. **Библиография** (bibliography) - список ссылок из раздела "Литература"/"References" из КОНЦА

ВАЖНО про DOI:
- DOI статьи обычно указан в шапке/заголовке, рядом с названием журнала
- НЕ путай DOI статьи с DOI из библиографии!
- DOI начинается с "10." (например: 10.1007/s40136-016-0120-6)

Верни результат СТРОГО в формате JSON без дополнительного текста:
{
  "title": "Заголовок статьи",
  "authors": ["Автор 1", "Автор 2"],
  "year": 2024,
  "doi": "10.1234/example",
  "url": "https://...",
  "journal": "Название журнала",
  "abstract": "Текст абстракта...",
  "volume": "12",
  "issue": "3",
  "pages": "100-115",
  "bibliography": [
    {
      "text": "Полный текст ссылки как в оригинале",
      "title": "Название цитируемой статьи",
      "authors": "Авторы через запятую",
      "year": 2020,
      "doi": "10.xxx/yyy",
      "journal": "Название журнала"
    }
  ]
}

Важно:
- Если информация не найдена, используй null
- DOI статьи берём ТОЛЬКО из начала документа (шапка статьи)
- Извлеки ВСЕ ссылки из библиографии (до 100 ссылок)
- Для каждой ссылки извлеки title, authors, year, doi (если есть), journal`;

  const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openrouterKey}`,
      "HTTP-Referer": "https://mdsystem.app",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Проанализируй следующий текст научной статьи и извлеки метаданные:\n\n${combinedText}` },
      ],
      temperature: 0.1,
      max_tokens: 8000, // Increased for larger bibliography
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
  }

  type OpenRouterResponse = {
    choices: Array<{ message: { content: string } }>;
  };
  const data = (await res.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ExtractedArticle;
      return {
        title: parsed.title || null,
        authors: parsed.authors || null,
        year: parsed.year || null,
        doi: parsed.doi || null,
        url: parsed.url || null,
        journal: parsed.journal || null,
        abstract: parsed.abstract || null,
        volume: parsed.volume || null,
        issue: parsed.issue || null,
        pages: parsed.pages || null,
        bibliography: parsed.bibliography || null,
      };
    }
  } catch (e) {
    console.error("Failed to parse AI response:", e, content);
  }

  return {
    title: null,
    authors: null,
    year: null,
    doi: null,
    url: null,
    journal: null,
    abstract: null,
    volume: null,
    issue: null,
    pages: null,
    bibliography: null,
  };
}

/**
 * Try to find DOI in text using regex
 * Prioritizes DOIs from the start of the document (header) over those from bibliography
 */
export function extractDoiFromText(text: string, preferHeader: boolean = true): string | null {
  // DOI pattern: 10.xxxx/xxxxx
  const doiPattern = /\b(10\.\d{4,}(?:\.\d+)*\/\S+?)(?=[\s,\]\)>"']|$)/gi;
  
  if (preferHeader) {
    // First try to find DOI in the first 3000 characters (header area)
    const headerText = text.slice(0, 3000);
    const headerMatch = headerText.match(doiPattern);
    if (headerMatch && headerMatch.length > 0) {
      const doi = headerMatch[0].replace(/[.,;]+$/, "");
      return doi.toLowerCase();
    }
  }
  
  // Fallback to first DOI found anywhere
  const allMatches = text.match(doiPattern);
  if (allMatches && allMatches.length > 0) {
    const doi = allMatches[0].replace(/[.,;]+$/, "");
    return doi.toLowerCase();
  }
  
  return null;
}

/**
 * Extract full text content for document creation
 */
export function extractFullContent(text: string): string {
  // Clean up the text for document usage
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
