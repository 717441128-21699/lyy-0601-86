import { format, parse, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const DATE_PATTERNS = [
  { regex: /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/, format: 'yyyy-MM-dd' },
  { regex: /(\d{4})(\d{2})(\d{2})/, format: 'yyyyMMdd' },
  { regex: /(\d{2})[-/](\d{2})[-/](\d{4})/, format: 'MM-dd-yyyy' },
  { regex: /(\d{2})[-/](\d{2})[-/](\d{2})/, format: 'MM-dd-yy' },
];

export function extractDate(text: string): string | null {
  const cleanedText = text.replace(/\s+/g, '');

  for (const pattern of DATE_PATTERNS) {
    const match = cleanedText.match(pattern.regex);
    if (match) {
      try {
        let dateStr: string;
        if (pattern.format === 'yyyy-MM-dd') {
          dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (pattern.format === 'yyyyMMdd') {
          dateStr = `${match[1]}-${match[2]}-${match[3]}`;
        } else if (pattern.format === 'MM-dd-yyyy') {
          dateStr = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        } else {
          const year = parseInt(match[3], 10) > 50 ? `19${match[3]}` : `20${match[3]}`;
          dateStr = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }

        const date = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export function extractNameFromFilename(filename: string): string | null {
  const namePatterns = [
    /([\u4e00-\u9fa5]{2,4})/,
    /([A-Za-z]{2,20})/,
  ];

  const cleanName = filename
    .replace(/\.(pdf|txt|jpg|jpeg|png|doc|docx)$/i, '')
    .replace(/[_\-\d]+/g, ' ')
    .trim();

  for (const pattern of namePatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

export function formatDisplayDate(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'yyyy年MM月dd日', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'MM/dd', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function getYear(dateStr: string): number {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return date.getFullYear();
  } catch {
    return 0;
  }
}

export function getAge(birthDate: string): number {
  try {
    const birth = parse(birthDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return 0;
  }
}
