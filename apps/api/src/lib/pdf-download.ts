/**
 * Модуль для скачивания PDF статей
 * Поддерживает: Wiley TDM, Unpaywall (open access), PMC
 */

const UNPAYWALL_EMAIL = process.env.CROSSREF_MAILTO || "thesis-app@example.com";

export interface PdfSource {
  source: string;
  url: string;
  isPdf: boolean;
}

/**
 * Получить URL для скачивания PDF через Unpaywall
 */
export async function getUnpaywallPdf(doi: string): Promise<PdfSource | null> {
  try {
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${UNPAYWALL_EMAIL}`;
    const res = await fetch(url);
    
    if (!res.ok) return null;
    
    const data = await res.json() as {
      best_oa_location?: {
        url_for_pdf?: string;
        url?: string;
      };
    };
    
    // Ищем лучший открытый доступ
    if (data.best_oa_location?.url_for_pdf) {
      return {
        source: "unpaywall",
        url: data.best_oa_location.url_for_pdf,
        isPdf: true,
      };
    }
    
    // Или любую ссылку на открытый доступ
    if (data.best_oa_location?.url) {
      return {
        source: "unpaywall",
        url: data.best_oa_location.url,
        isPdf: false,
      };
    }
    
    return null;
  } catch (err) {
    console.error("Unpaywall error:", err);
    return null;
  }
}

/**
 * Получить URL для скачивания PDF через PMC
 */
export async function getPmcPdf(pmid: string): Promise<PdfSource | null> {
  try {
    // Сначала получаем PMC ID
    const idUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${pmid}&format=json`;
    const idRes = await fetch(idUrl);
    
    if (!idRes.ok) return null;
    
    const idData = await idRes.json() as {
      records?: Array<{ pmcid?: string }>;
    };
    const pmcid = idData.records?.[0]?.pmcid;
    
    if (!pmcid) return null;
    
    // Формируем URL для PDF
    return {
      source: "pmc",
      url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf/`,
      isPdf: true,
    };
  } catch (err) {
    console.error("PMC error:", err);
    return null;
  }
}

/**
 * Получить URL для скачивания через Wiley TDM
 * Требует API токен пользователя
 */
export async function getWileyPdf(doi: string, wileyToken: string): Promise<PdfSource | null> {
  if (!wileyToken) return null;
  
  // Wiley TDM API работает только для DOI, начинающихся с 10.1002
  if (!doi.startsWith("10.1002")) return null;
  
  try {
    const url = `https://api.wiley.com/onlinelibrary/tdm/v1/articles/${encodeURIComponent(doi)}`;
    const res = await fetch(url, {
      headers: {
        "Wiley-TDM-Client-Token": wileyToken,
        "Accept": "application/pdf",
      },
      method: "HEAD", // Проверяем доступность
    });
    
    if (res.ok) {
      return {
        source: "wiley",
        url,
        isPdf: true,
      };
    }
    
    return null;
  } catch (err) {
    console.error("Wiley TDM error:", err);
    return null;
  }
}

/**
 * Найти лучший источник PDF для статьи
 */
export async function findPdfSource(
  doi: string | null,
  pmid: string | null,
  wileyToken?: string
): Promise<PdfSource | null> {
  const sources: Promise<PdfSource | null>[] = [];
  
  // Пробуем все доступные источники
  if (doi) {
    sources.push(getUnpaywallPdf(doi));
    if (wileyToken) {
      sources.push(getWileyPdf(doi, wileyToken));
    }
  }
  
  if (pmid) {
    sources.push(getPmcPdf(pmid));
  }
  
  // Ждём первый успешный результат
  const results = await Promise.all(sources);
  
  // Приоритет: PMC > Unpaywall PDF > Wiley > Unpaywall HTML
  const pmc = results.find(r => r?.source === "pmc");
  if (pmc) return pmc;
  
  const unpaywallPdf = results.find(r => r?.source === "unpaywall" && r.isPdf);
  if (unpaywallPdf) return unpaywallPdf;
  
  const wiley = results.find(r => r?.source === "wiley");
  if (wiley) return wiley;
  
  const unpaywall = results.find(r => r?.source === "unpaywall");
  if (unpaywall) return unpaywall;
  
  return null;
}

/**
 * Скачать PDF и вернуть как Buffer
 */
export async function downloadPdf(
  pdfSource: PdfSource,
  wileyToken?: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const headers: Record<string, string> = {};
    
    if (pdfSource.source === "wiley" && wileyToken) {
      headers["Wiley-TDM-Client-Token"] = wileyToken;
      headers["Accept"] = "application/pdf";
    }
    
    const res = await fetch(pdfSource.url, { headers });
    
    if (!res.ok) {
      console.error(`PDF download failed: ${res.status}`);
      return null;
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "application/pdf";
    
    return { buffer, contentType };
  } catch (err) {
    console.error("PDF download error:", err);
    return null;
  }
}
