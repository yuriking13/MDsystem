/**
 * Library for extracting article metadata from PDF and Word files using AI
 */

// @ts-ignore - pdf-parse doesn't have types
import pdfParse from "pdf-parse";
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
  const data = await pdfParse(buffer);
  return data.text;
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
 * Use AI to extract article metadata from text
 */
export async function extractArticleMetadataWithAI(
  text: string,
  openrouterKey: string
): Promise<ExtractedArticle> {
  // Limit text to first ~15000 characters (enough for title, abstract, intro, and references)
  const truncatedText = text.slice(0, 15000);
  
  const systemPrompt = `Ты - эксперт по извлечению метаданных из научных статей. 
Твоя задача - проанализировать текст научной статьи и извлечь следующую информацию:

1. **Заголовок статьи** (title)
2. **Авторы** (authors) - список авторов
3. **Год публикации** (year)
4. **DOI** (если есть)
5. **URL** (если есть ссылка на статью)
6. **Название журнала** (journal)
7. **Абстракт** (abstract) - резюме статьи
8. **Том** (volume)
9. **Выпуск** (issue)  
10. **Страницы** (pages)
11. **Библиография** (bibliography) - список ссылок из раздела "Литература" / "References"

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
- DOI обычно начинается с "10." и находится в начале или конце статьи
- Год обычно 4 цифры (например 2024)
- Библиография часто в конце документа, начинается с "References", "Литература", "Список литературы"
- Извлеки до 50 ссылок из библиографии`;

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
        { role: "user", content: `Проанализируй следующий текст научной статьи и извлеки метаданные:\n\n${truncatedText}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
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
 */
export function extractDoiFromText(text: string): string | null {
  // DOI pattern: 10.xxxx/xxxxx
  const doiMatch = text.match(/\b(10\.\d{4,}(?:\.\d+)*\/\S+?)(?=[\s,\]\)>"']|$)/i);
  if (doiMatch) {
    // Clean up DOI (remove trailing punctuation)
    let doi = doiMatch[1].replace(/[.,;]+$/, "");
    return doi.toLowerCase();
  }
  return null;
}
