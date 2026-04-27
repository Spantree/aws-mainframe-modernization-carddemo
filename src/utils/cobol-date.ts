/**
 * Generated from CSUTLDTC.cbl, CSDAT01Y.cpy, CODATECN.cpy — CardDemo TypeScript migration
 * Original COBOL program: CSUTLDTC — date validation subprogram wrapping IBM CEEDAYS LE API.
 *   Validates dates in YYYYMMDD or MM/DD/YY format by converting to Lillian Day Number.
 *   CSDAT01Y — working-storage copybook for current date/time fields (WS-DATE-TIME).
 *   CODATECN — date conversion routines (Gregorian ↔ Julian, century handling).
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * Replacement for IBM LE CEEDAYS: use JavaScript's built-in Date / Temporal, or
 * the `date-fns` library for format parsing and validation.
 */

/**
 * COBOL date formats used across CardDemo programs.
 * Maps COBOL picture/format strings to JS date-fns format tokens.
 */
export const CobolDateFormat = {
  /** PIC X(10) — 'YYYY-MM-DD' stored as a string (most account/card dates) */
  YYYYMMDD_DASH: 'YYYY-MM-DD',
  /** PIC X(8)  — 'YYYYMMDD' compact form used in CSDAT01Y */
  YYYYMMDD: 'YYYYMMDD',
  /** PIC X(10) — 'MM/DD/YYYY' display format */
  MMDDYYYY_SLASH: 'MM/DD/YYYY',
  /** PIC X(6)  — Julian 'YYYYDDD' (year + day-of-year) */
  JULIAN: 'YYYYDDD',
} as const;

/**
 * True for SPACES, LOW-VALUES, or all-zero strings — the COBOL conventions
 * for "no date set". Both `isValidCobolDate` and `parseCobolDate` defer to
 * this so they agree on what "blank" means.
 */
function isCobolBlankDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  const trimmed = dateStr.trim();
  if (trimmed === '') return true;
  return /^0+$/.test(trimmed.replace(/[-/]/g, ''));
}

/**
 * Validate a date string in YYYYMMDD or YYYY-MM-DD format.
 * Replaces: CALL 'CSUTLDTC' USING LS-DATE, LS-DATE-FORMAT, LS-RESULT
 *
 * CSUTLDTC called IBM CEEDAYS to convert the date to a Lillian Day Number;
 * if the conversion failed, the date was invalid. Blank/all-zero strings
 * count as not valid.
 *
 * @returns true if the date is a valid calendar date.
 */
export function isValidCobolDate(dateStr: string): boolean {
  if (isCobolBlankDate(dateStr)) return false;

  // Normalize: remove dashes, slashes
  const normalized = dateStr.replace(/[-/]/g, '');
  if (normalized.length !== 8) return false;

  const year = Number.parseInt(normalized.substring(0, 4), 10);
  const month = Number.parseInt(normalized.substring(4, 6), 10);
  const day = Number.parseInt(normalized.substring(6, 8), 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Parse a COBOL date string (YYYYMMDD or YYYY-MM-DD) into a JavaScript Date.
 * Returns null for blank/spaces/zero strings or unparseable values —
 * `isValidCobolDate` is the source of truth.
 */
export function parseCobolDate(dateStr: string | null | undefined): Date | null {
  if (isCobolBlankDate(dateStr)) return null;
  const value = dateStr as string;
  if (!isValidCobolDate(value)) return null;

  const normalized = value.replace(/[-/]/g, '');
  const year = Number.parseInt(normalized.substring(0, 4), 10);
  const month = Number.parseInt(normalized.substring(4, 6), 10);
  const day = Number.parseInt(normalized.substring(6, 8), 10);
  return new Date(year, month - 1, day);
}

/**
 * Format a JavaScript Date as a COBOL YYYYMMDD string (no separators).
 * Matches: MOVE WS-CURDATE TO some-date-field
 */
export function toCobolDateYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Format a JavaScript Date as YYYY-MM-DD (the most common stored format in CardDemo).
 * Used for: ACCT-OPEN-DATE, ACCT-EXPIRAION-DATE, CARD-EXPIRAION-DATE, etc.
 */
export function toCobolDateDash(date: Date): string {
  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a JavaScript Date as MM/DD/YY (display format from CSDAT01Y WS-CURDATE-MM-DD-YY).
 * Used for: screen header date display in all CICS programs.
 */
export function toDisplayDateMMDDYY(date: Date): string {
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const yy = date.getFullYear().toString().substring(2);
  return `${mm}/${dd}/${yy}`;
}

/**
 * Format a JavaScript Date as HH:MM:SS (display format from CSDAT01Y WS-CURTIME-HH-MM-SS).
 * Used for: screen header time display in all CICS programs.
 */
export function toDisplayTimeHHMMSS(date: Date): string {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Convert a Gregorian date to Julian day-of-year number (YYYYDDD).
 * Used in CBTRN01C / CBTRN03C reporting date ranges.
 */
export function toJulianDate(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return `${date.getFullYear()}${dayOfYear.toString().padStart(3, '0')}`;
}

/**
 * Generate a DB2-format timestamp string: YYYY-MM-DD-HH.MM.SS.MMMMMM
 * Replaces the COBOL-TS / DB2-FORMAT-TS working-storage pattern seen in
 * CBTRN02C and CBACT04C.
 */
export function toDb2Timestamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0').padEnd(6, '0');
  return `${yyyy}-${mm}-${dd}-${hh}.${min}.${ss}.${ms}`;
}

/**
 * CardDemo application-level timestamp format: 'YYYY-MM-DD HH:MM:SS.MMMMMM'
 * Used in TRAN-ORIG-TS, TRAN-PROC-TS, EXPORT-TIMESTAMP fields.
 */
export function toCardDemoTimestamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  const us = (date.getMilliseconds() * 1000).toString().padStart(6, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${us}`;
}

/**
 * Get the current date/time data structure equivalent to CSDAT01Y WS-DATE-TIME.
 * Used in POPULATE-HEADER-INFO paragraphs across all CICS online programs.
 */
export function getCurrentDateTime(): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  displayDate: string; // MM/DD/YY
  displayTime: string; // HH:MM:SS
} {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    displayDate: toDisplayDateMMDDYY(now),
    displayTime: toDisplayTimeHHMMSS(now),
  };
}
