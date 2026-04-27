/**
 * Generated from CSUTLDTC.cbl — CardDemo TypeScript migration
 * Original COBOL program: CSUTLDTC — Date validation called subprogram. Complexity: 1.45 (Easy).
 *   Wraps IBM LE CEEDAYS API to validate a date string in a given format.
 *   Called via CALL 'CSUTLDTC' USING LS-DATE, LS-DATE-FORMAT, LS-RESULT.
 *   CEEDAYS converts a date string to a Lillian Day Number; non-zero severity = invalid date.
 *   The result message is placed in LS-RESULT and RETURN-CODE is set to severity.
 *   Called by: COTRN02C (transaction date validation), CORPT00C (report date range).
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable } from '@nestjs/common';
import { isValidCobolDate, parseCobolDate } from '../utils/cobol-date';

/** Severity codes equivalent to CEEDAYS feedback — WS-SEVERITY-N */
export enum DateValidationSeverity {
  VALID = 0,
  INSUFFICIENT_DATA = 1001,
  BAD_DATE_VALUE = 1002,
  INVALID_ERA = 1003,
  UNSUPPORTED_RANGE = 1004,
  INVALID_MONTH = 1005,
  BAD_PIC_STRING = 1006,
  NON_NUMERIC_DATA = 1007,
  YEAR_IN_ERA_ZERO = 1008,
}

export interface DateValidationResult {
  severity: DateValidationSeverity;
  isValid: boolean;
  result: string;     // 15-char result message (matches COBOL WS-RESULT PIC X(15))
  parsedDate?: Date;
}

@Injectable()
export class DateValidationService {
  /**
   * Validate a date string — replaces CALL 'CSUTLDTC' USING LS-DATE, LS-DATE-FORMAT, LS-RESULT.
   *
   * COBOL calling convention:
   *   MOVE '2024-12-31' TO WS-DATE
   *   MOVE 'YYYY-MM-DD' TO WS-DATE-FORMAT
   *   CALL 'CSUTLDTC' USING WS-DATE, WS-DATE-FORMAT, WS-RESULT
   *   IF RETURN-CODE = 0 → date is valid
   *
   * @param dateStr  The date string to validate (e.g. '2024-12-31')
   * @param format   The expected format (e.g. 'YYYYMMDD', 'YYYY-MM-DD')
   * @returns        Validation result with severity code and parsed Date if valid
   */
  validate(dateStr: string, format: string): DateValidationResult {
    // Blank input check (COBOL LOW-VALUES / SPACES)
    if (!dateStr || dateStr.trim() === '') {
      return {
        severity: DateValidationSeverity.INSUFFICIENT_DATA,
        isValid: false,
        result: 'Insufficient   ',
      };
    }

    // Non-numeric check for numeric formats
    const normalized = dateStr.replace(/[-/]/g, '');
    if (/[^0-9]/.test(normalized)) {
      return {
        severity: DateValidationSeverity.NON_NUMERIC_DATA,
        isValid: false,
        result: 'Nonnumeric data',
      };
    }

    // Length check
    if (normalized.length !== 8) {
      return {
        severity: DateValidationSeverity.BAD_PIC_STRING,
        isValid: false,
        result: 'Bad Pic String ',
      };
    }

    // Range check — CardDemo uses dates in 1900–2099 range
    const year = Number.parseInt(normalized.substring(0, 4), 10);
    if (year < 1900 || year > 2099) {
      return {
        severity: DateValidationSeverity.UNSUPPORTED_RANGE,
        isValid: false,
        result: 'Unsupp. Range  ',
      };
    }

    const month = Number.parseInt(normalized.substring(4, 6), 10);
    if (month < 1 || month > 12) {
      return {
        severity: DateValidationSeverity.INVALID_MONTH,
        isValid: false,
        result: 'Invalid month  ',
      };
    }

    // Full calendar validation
    if (!isValidCobolDate(dateStr)) {
      return {
        severity: DateValidationSeverity.BAD_DATE_VALUE,
        isValid: false,
        result: 'Datevalue error',
      };
    }

    const parsedDate = parseCobolDate(dateStr);

    // COBOL quirk: FC-INVALID-DATE in CEEDAYS actually means "date IS valid" (confusing name)
    return {
      severity: DateValidationSeverity.VALID,
      isValid: true,
      result: 'Date is valid  ',
      parsedDate: parsedDate ?? undefined,
    };
  }

  /**
   * Convenience method: return true if date is valid.
   * Replaces: IF RETURN-CODE = 0 check after CALL 'CSUTLDTC'.
   */
  isValid(dateStr: string, format = 'YYYYMMDD'): boolean {
    return this.validate(dateStr, format).isValid;
  }
}
