/**
 * Форматирование библиографии по различным стилям
 */

export interface BibliographyArticle {
  title_en: string;
  title_ru?: string | null;
  authors?: string[] | null;
  journal?: string | null;
  year?: number | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  pmid?: string | null;
  publisher?: string | null;
}

export type CitationStyle = 'gost' | 'apa' | 'vancouver';

/**
 * Форматировать инициалы по ГОСТ
 */
function formatInitialsGOST(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  
  if (parts.length === 1) return parts[0];
  
  // Фамилия первая, потом инициалы
  const lastName = parts[0];
  const initials = parts.slice(1).map(p => p.charAt(0).toUpperCase() + '.').join('');
  
  return `${lastName} ${initials}`;
}

/**
 * Форматировать авторов по ГОСТ
 * ГОСТ Р 7.0.5-2008: первые 3 автора, потом "и др." или "[et al.]"
 */
function formatAuthorsGOST(authors: string[] | null | undefined, isRussian: boolean): string {
  if (!authors || authors.length === 0) return '';
  
  const formatted = authors.slice(0, 3).map(formatInitialsGOST);
  
  if (authors.length > 3) {
    formatted.push(isRussian ? 'и др.' : 'et al.');
  }
  
  return formatted.join(', ');
}

/**
 * Форматировать статью по ГОСТ Р 7.0.5-2008
 * Формат: Автор И.И. Название статьи // Название журнала. — Год. — Т. 1, № 2. — С. 10-20.
 * 
 * Для иностранных источников используется оригинальный язык (английский)
 * согласно ГОСТ Р 7.0.5-2008 п. 7.1
 */
export function formatGOST(article: BibliographyArticle): string {
  // Всегда используем оригинальный язык (английский) для библиографии
  const isRussian = false; // Иностранные источники оформляются на языке оригинала
  const title = article.title_en;
  const authors = formatAuthorsGOST(article.authors, isRussian);
  
  let result = '';
  
  // Авторы
  if (authors) {
    result += authors + ' ';
  }
  
  // Название
  result += title;
  
  // Журнал
  if (article.journal) {
    result += ' // ' + article.journal;
  }
  
  // Год
  if (article.year) {
    result += '. — ' + article.year;
  }
  
  // Том и номер
  if (article.volume || article.issue) {
    result += '. — ';
    if (article.volume) {
      result += isRussian ? `Т. ${article.volume}` : `Vol. ${article.volume}`;
    }
    if (article.issue) {
      if (article.volume) result += ', ';
      result += isRussian ? `№ ${article.issue}` : `No. ${article.issue}`;
    }
  }
  
  // Страницы
  if (article.pages) {
    result += '. — ';
    result += isRussian ? `С. ${article.pages}` : `P. ${article.pages}`;
  }
  
  // DOI
  if (article.doi) {
    result += `. — DOI: ${article.doi}`;
  }
  
  result += '.';
  
  return result;
}

/**
 * Форматировать статью по APA 7th Edition
 * Формат: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Volume(Issue), pages. https://doi.org/xxx
 */
export function formatAPA(article: BibliographyArticle): string {
  const authors = article.authors || [];
  
  // Форматировать авторов по APA: Lastname, F. M., & Lastname, F. M.
  const formatAuthorAPA = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return name;
    if (parts.length === 1) return parts[0];
    
    const lastName = parts[0];
    const initials = parts.slice(1).map(p => p.charAt(0).toUpperCase() + '.').join(' ');
    return `${lastName}, ${initials}`;
  };
  
  let authorStr = '';
  if (authors.length === 1) {
    authorStr = formatAuthorAPA(authors[0]);
  } else if (authors.length === 2) {
    authorStr = authors.map(formatAuthorAPA).join(' & ');
  } else if (authors.length > 2) {
    const firstAuthors = authors.slice(0, -1).map(formatAuthorAPA).join(', ');
    authorStr = firstAuthors + ', & ' + formatAuthorAPA(authors[authors.length - 1]);
  }
  
  let result = '';
  
  // Авторы
  if (authorStr) {
    result += authorStr + ' ';
  }
  
  // Год
  if (article.year) {
    result += `(${article.year}). `;
  }
  
  // Название (курсивом в реальности, но мы используем обычный текст)
  result += article.title_en + '. ';
  
  // Журнал
  if (article.journal) {
    result += article.journal;
    
    if (article.volume) {
      result += `, ${article.volume}`;
      if (article.issue) {
        result += `(${article.issue})`;
      }
    }
    
    if (article.pages) {
      result += `, ${article.pages}`;
    }
    
    result += '.';
  }
  
  // DOI
  if (article.doi) {
    result += ` https://doi.org/${article.doi}`;
  }
  
  return result;
}

/**
 * Форматировать статью по Vancouver
 * Формат: Author AA, Author BB. Title. Journal. Year;Volume(Issue):Pages.
 */
export function formatVancouver(article: BibliographyArticle): string {
  const authors = article.authors || [];
  
  // Форматировать авторов по Vancouver: Lastname AB
  const formatAuthorVancouver = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return name;
    if (parts.length === 1) return parts[0];
    
    const lastName = parts[0];
    const initials = parts.slice(1).map(p => p.charAt(0).toUpperCase()).join('');
    return `${lastName} ${initials}`;
  };
  
  let result = '';
  
  // Авторы (первые 6, потом et al.)
  if (authors.length > 0) {
    const formatted = authors.slice(0, 6).map(formatAuthorVancouver);
    if (authors.length > 6) {
      formatted.push('et al');
    }
    result += formatted.join(', ') + '. ';
  }
  
  // Название
  result += article.title_en + '. ';
  
  // Журнал
  if (article.journal) {
    result += article.journal + '. ';
  }
  
  // Год
  if (article.year) {
    result += article.year;
  }
  
  // Том, номер, страницы
  if (article.volume) {
    result += `;${article.volume}`;
    if (article.issue) {
      result += `(${article.issue})`;
    }
  }
  
  if (article.pages) {
    result += `:${article.pages}`;
  }
  
  result += '.';
  
  // DOI
  if (article.doi) {
    result += ` doi:${article.doi}`;
  }
  
  return result;
}

/**
 * Форматировать статью по выбранному стилю
 */
export function formatCitation(article: BibliographyArticle, style: CitationStyle): string {
  switch (style) {
    case 'gost':
      return formatGOST(article);
    case 'apa':
      return formatAPA(article);
    case 'vancouver':
      return formatVancouver(article);
    default:
      return formatGOST(article);
  }
}

/**
 * Форматировать список литературы
 */
export function formatBibliography(
  articles: BibliographyArticle[], 
  style: CitationStyle
): string[] {
  return articles.map((article, index) => {
    const citation = formatCitation(article, style);
    return `${index + 1}. ${citation}`;
  });
}
