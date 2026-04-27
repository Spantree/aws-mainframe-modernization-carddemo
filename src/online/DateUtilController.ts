/**
 * Generated from CODATE01.cbl — CardDemo TypeScript migration
 * Original COBOL program: Date conversion utility — YYYYMMDD ↔ YYYY-MM-DD.
 * Complexity: 2.3 (Moderate).
 *   MQ-driven utility service (app-vsam-mq variant). Receives date conversion
 *   requests on an MQ input queue, applies format transformations using the
 *   CODATECN copybook layout, and writes results to the MQ reply queue.
 *   Supports two conversion modes:
 *     Type "1" (YYYYMMDD_IN):  YYYYMMDD  → YYYY-MM-DD
 *     Type "2" (YYYY_MM_DD_IN): YYYY-MM-DD → YYYYMMDD
 *   Business criticality: 1 — pure utility, no file writes.
 *
 * Migration target: NestJS REST endpoint
 * MQ equivalent: Replace CICS MQ with NestJS microservice transport
 *
 * COBOL paragraph mapping:
 *   PROCESS-MQ-MESSAGES  → convertDate()
 *   CONVERT-DATE-1       → toIsoFormat()
 *   CONVERT-DATE-2       → toCompactFormat()
 *   WRITE-RESPONSE-QUEUE → return value
 *
 * Note: CODATECN-ERROR-MSG (PIC X(38)) is surfaced as the 'error' field
 * in the response when validation fails.
 */

import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';

/** Mirrors CODATECN-IN-REC.CODATECN-TYPE */
export type DateConversionType = '1' | '2';

export interface DateConversionRequest {
  /**
   * Conversion type — mirrors CODATECN-TYPE PIC X.
   *   "1" (YYYYMMDD_IN):   input is "YYYYMMDD",   output is "YYYY-MM-DD"
   *   "2" (YYYY_MM_DD_IN): input is "YYYY-MM-DD",  output is "YYYYMMDD"
   */
  type: DateConversionType;
  /**
   * Input date string — mirrors CODATECN-INP-DATE PIC X(20).
   * Leading/trailing spaces are trimmed before processing.
   */
  inputDate: string;
}

export interface DateConversionResponse {
  /** Mirrors CODATECN-OUTTYPE */
  outputType: DateConversionType;
  /** Converted date string — mirrors CODATECN-0UT-DATE PIC X(20) */
  outputDate: string;
  /** Error message if conversion failed — mirrors CODATECN-ERROR-MSG PIC X(38) */
  error?: string;
}

/** Compact date pattern: YYYYMMDD */
const COMPACT_PATTERN = /^(\d{4})(\d{2})(\d{2})$/;
/** ISO date pattern: YYYY-MM-DD */
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

@Controller('date-util')
export class DateUtilController {
  /**
   * Convert between YYYYMMDD and YYYY-MM-DD formats.
   *
   * COBOL equivalent: PROCESS-MQ-MESSAGES loop with CONVERT-DATE-1 / CONVERT-DATE-2.
   * The original used REDEFINES (CODATECN-1INP / CODATECN-2INP) to overlay the
   * same 20-byte field with different sub-field layouts. Here we use regex.
   */
  @Post('convert')
  convertDate(@Body() req: DateConversionRequest): DateConversionResponse {
    const input = (req.inputDate ?? '').trim();

    if (req.type === '1') {
      return this.toIsoFormat(input);
    } else if (req.type === '2') {
      return this.toCompactFormat(input);
    } else {
      throw new BadRequestException(
        `Unknown conversion type "${req.type}". Valid values: "1" (YYYYMMDD→YYYY-MM-DD), "2" (YYYY-MM-DD→YYYYMMDD)`,
      );
    }
  }

  /**
   * Type "1": YYYYMMDD → YYYY-MM-DD
   * Mirrors CODATECN-1INP REDEFINES CODATECN-INP-DATE layout.
   */
  private toIsoFormat(input: string): DateConversionResponse {
    const match = COMPACT_PATTERN.exec(input);
    if (!match) {
      return {
        outputType: '1',
        outputDate: ' '.repeat(20),
        error: `Invalid YYYYMMDD date: "${input}"`.substring(0, 38),
      };
    }

    const [, yyyy, mm, dd] = match;
    const result = this.validateCalendarDate(yyyy, mm, dd);
    if (result.error) {
      return { outputType: '1', outputDate: ' '.repeat(20), error: result.error };
    }

    return {
      outputType: '1',
      outputDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  /**
   * Type "2": YYYY-MM-DD → YYYYMMDD
   * Mirrors CODATECN-2INP REDEFINES CODATECN-INP-DATE layout.
   */
  private toCompactFormat(input: string): DateConversionResponse {
    const match = ISO_PATTERN.exec(input);
    if (!match) {
      return {
        outputType: '2',
        outputDate: ' '.repeat(20),
        error: `Invalid YYYY-MM-DD date: "${input}"`.substring(0, 38),
      };
    }

    const [, yyyy, mm, dd] = match;
    const result = this.validateCalendarDate(yyyy, mm, dd);
    if (result.error) {
      return { outputType: '2', outputDate: ' '.repeat(20), error: result.error };
    }

    return {
      outputType: '2',
      outputDate: `${yyyy}${mm}${dd}`,
    };
  }

  /** Mirrors CSUTLDPY EDIT-DATE-CCYYMMDD validation logic */
  private validateCalendarDate(
    yyyy: string,
    mm: string,
    dd: string,
  ): { error?: string } {
    const year = parseInt(yyyy, 10);
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);

    // THIS-CENTURY / LAST-CENTURY check from COBOL
    if (year < 1900 || year > 2099) {
      return { error: `Century not valid: ${yyyy}`.substring(0, 38) };
    }
    if (month < 1 || month > 12) {
      return { error: `Month must be 01-12, got ${mm}`.substring(0, 38) };
    }
    if (day < 1 || day > 31) {
      return { error: `Day must be 01-31, got ${dd}`.substring(0, 38) };
    }

    // Leap-year and month-length checks — mirrors EDIT-DAY-MONTH-YEAR
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      return {
        error: `Day ${dd} is out of range for month ${mm}/${yyyy}`.substring(0, 38),
      };
    }

    return {};
  }
}
