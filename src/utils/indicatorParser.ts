import type { ParsedIndicator, IndicatorDictionary, HealthIndicator } from '../types';

export const DEFAULT_DICTIONARY: IndicatorDictionary[] = [
  {
    id: '1',
    standardName: '收缩压',
    aliases: ['高压', '收缩压', 'SBP', 'systolic', '血压高值'],
    unit: 'mmHg',
    defaultReference: '90-140',
    category: '血压',
  },
  {
    id: '2',
    standardName: '舒张压',
    aliases: ['低压', '舒张压', 'DBP', 'diastolic', '血压低值'],
    unit: 'mmHg',
    defaultReference: '60-90',
    category: '血压',
  },
  {
    id: '3',
    standardName: '空腹血糖',
    aliases: ['空腹血糖', 'GLU', 'FPG', '血糖', '葡萄糖'],
    unit: 'mmol/L',
    defaultReference: '3.9-6.1',
    category: '血糖',
  },
  {
    id: '4',
    standardName: '总胆固醇',
    aliases: ['总胆固醇', 'TC', 'CHO', '胆固醇'],
    unit: 'mmol/L',
    defaultReference: '<5.2',
    category: '血脂',
  },
  {
    id: '5',
    standardName: '甘油三酯',
    aliases: ['甘油三酯', 'TG', 'TRIG', '三酰甘油'],
    unit: 'mmol/L',
    defaultReference: '<1.7',
    category: '血脂',
  },
  {
    id: '6',
    standardName: '高密度脂蛋白胆固醇',
    aliases: ['高密度脂蛋白胆固醇', 'HDL-C', 'HDL', '高密度脂蛋白'],
    unit: 'mmol/L',
    defaultReference: '>1.0',
    category: '血脂',
  },
  {
    id: '7',
    standardName: '低密度脂蛋白胆固醇',
    aliases: ['低密度脂蛋白胆固醇', 'LDL-C', 'LDL', '低密度脂蛋白'],
    unit: 'mmol/L',
    defaultReference: '<3.4',
    category: '血脂',
  },
  {
    id: '8',
    standardName: '体重',
    aliases: ['体重', 'Weight', 'BW'],
    unit: 'kg',
    defaultReference: '—',
    category: '一般检查',
  },
  {
    id: '9',
    standardName: '身高',
    aliases: ['身高', 'Height', 'BH'],
    unit: 'cm',
    defaultReference: '—',
    category: '一般检查',
  },
  {
    id: '10',
    standardName: 'BMI',
    aliases: ['BMI', '体重指数', '身体质量指数'],
    unit: 'kg/m²',
    defaultReference: '18.5-23.9',
    category: '一般检查',
  },
  {
    id: '11',
    standardName: '心率',
    aliases: ['心率', '脉搏', 'HR', 'Pulse'],
    unit: '次/分',
    defaultReference: '60-100',
    category: '一般检查',
  },
  {
    id: '12',
    standardName: '白细胞计数',
    aliases: ['白细胞计数', 'WBC', '白细胞'],
    unit: '×10⁹/L',
    defaultReference: '4-10',
    category: '血常规',
  },
  {
    id: '13',
    standardName: '红细胞计数',
    aliases: ['红细胞计数', 'RBC', '红细胞'],
    unit: '×10¹²/L',
    defaultReference: '4.0-5.5',
    category: '血常规',
  },
  {
    id: '14',
    standardName: '血红蛋白',
    aliases: ['血红蛋白', 'HGB', 'Hb', '血色素'],
    unit: 'g/L',
    defaultReference: '120-160',
    category: '血常规',
  },
  {
    id: '15',
    standardName: '血小板计数',
    aliases: ['血小板计数', 'PLT', '血小板'],
    unit: '×10⁹/L',
    defaultReference: '100-300',
    category: '血常规',
  },
  {
    id: '16',
    standardName: '谷丙转氨酶',
    aliases: ['谷丙转氨酶', 'ALT', 'GPT', '丙氨酸氨基转移酶'],
    unit: 'U/L',
    defaultReference: '0-40',
    category: '肝功能',
  },
  {
    id: '17',
    standardName: '谷草转氨酶',
    aliases: ['谷草转氨酶', 'AST', 'GOT', '天门冬氨酸氨基转移酶'],
    unit: 'U/L',
    defaultReference: '0-40',
    category: '肝功能',
  },
  {
    id: '18',
    standardName: '肌酐',
    aliases: ['肌酐', 'Cr', 'CRE'],
    unit: 'μmol/L',
    defaultReference: '44-133',
    category: '肾功能',
  },
  {
    id: '19',
    standardName: '尿素氮',
    aliases: ['尿素氮', 'BUN', '尿素'],
    unit: 'mmol/L',
    defaultReference: '2.9-8.2',
    category: '肾功能',
  },
  {
    id: '20',
    standardName: '尿酸',
    aliases: ['尿酸', 'UA', 'URIC'],
    unit: 'μmol/L',
    defaultReference: '150-420',
    category: '肾功能',
  },
];

const INDICATOR_LINE_PATTERN = /^(.+?)\s*[:：]\s*([\d.]+)\s*([\w/%μ²⁹⁰¹³]+)?\s*(?:\(([^)]+)\))?/;

export function parseIndicatorLine(line: string): ParsedIndicator | null {
  const cleanedLine = line.trim().replace(/\s+/g, ' ');
  const match = cleanedLine.match(INDICATOR_LINE_PATTERN);

  if (match) {
    const [, name, value, unit = '', reference = ''] = match;
    return {
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim(),
      referenceRange: reference.trim(),
    };
  }

  const fallbackPattern = /^(.+?)\s+([\d.]+)\s*([\w/%μ²⁹⁰¹³]+)?\s*(.+)?$/;
  const fallbackMatch = cleanedLine.match(fallbackPattern);

  if (fallbackMatch && /[^\d.]/.test(fallbackMatch[1])) {
    const [, name, value, unit = '', reference = ''] = fallbackMatch;
    if (!isNaN(parseFloat(value))) {
      return {
        name: name.trim(),
        value: value.trim(),
        unit: unit.trim(),
        referenceRange: reference.trim(),
      };
    }
  }

  return null;
}

export function parseTextContent(text: string): ParsedIndicator[] {
  const lines = text.split(/[\n\r]+/);
  const indicators: ParsedIndicator[] = [];

  for (const line of lines) {
    const parsed = parseIndicatorLine(line);
    if (parsed && parsed.name.length < 50) {
      indicators.push(parsed);
    }
  }

  return indicators;
}

export function findStandardName(
  indicatorName: string,
  dictionary: IndicatorDictionary[]
): IndicatorDictionary | null {
  const lowerName = indicatorName.toLowerCase().trim();

  for (const item of dictionary) {
    if (item.standardName.toLowerCase() === lowerName) {
      return item;
    }
    for (const alias of item.aliases) {
      if (alias.toLowerCase() === lowerName) {
        return item;
      }
    }
  }

  for (const item of dictionary) {
    if (lowerName.includes(item.standardName.toLowerCase())) {
      return item;
    }
    for (const alias of item.aliases) {
      if (lowerName.includes(alias.toLowerCase())) {
        return item;
      }
    }
  }

  return null;
}

export function parseReferenceRange(range: string): {
  minValue?: number;
  maxValue?: number;
} {
  const cleanRange = range.trim().replace(/\s+/g, '');

  if (!cleanRange || cleanRange === '—' || cleanRange === '-') {
    return {};
  }

  const lessThanMatch = cleanRange.match(/^[<≤]([\d.]+)$/);
  if (lessThanMatch) {
    return { maxValue: parseFloat(lessThanMatch[1]) };
  }

  const greaterThanMatch = cleanRange.match(/^[>≥]([\d.]+)$/);
  if (greaterThanMatch) {
    return { minValue: parseFloat(greaterThanMatch[1]) };
  }

  const rangeMatch = cleanRange.match(/^([\d.]+)[-~至]([\d.]+)$/);
  if (rangeMatch) {
    return {
      minValue: parseFloat(rangeMatch[1]),
      maxValue: parseFloat(rangeMatch[2]),
    };
  }

  return {};
}

export function determineStatus(
  numericValue: number | undefined,
  minValue: number | undefined,
  maxValue: number | undefined
): { status: HealthIndicator['status']; isAbnormal: boolean } {
  if (numericValue === undefined) {
    return { status: 'normal', isAbnormal: false };
  }

  if (minValue !== undefined && maxValue !== undefined) {
    if (numericValue < minValue * 0.8 || numericValue > maxValue * 1.2) {
      return { status: 'critical', isAbnormal: true };
    }
    if (numericValue < minValue) {
      return { status: 'low', isAbnormal: true };
    }
    if (numericValue > maxValue) {
      return { status: 'high', isAbnormal: true };
    }
  } else if (maxValue !== undefined) {
    if (numericValue > maxValue * 1.2) {
      return { status: 'critical', isAbnormal: true };
    }
    if (numericValue > maxValue) {
      return { status: 'high', isAbnormal: true };
    }
  } else if (minValue !== undefined) {
    if (numericValue < minValue * 0.8) {
      return { status: 'critical', isAbnormal: true };
    }
    if (numericValue < minValue) {
      return { status: 'low', isAbnormal: true };
    }
  }

  return { status: 'normal', isAbnormal: false };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
