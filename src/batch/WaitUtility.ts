/**
 * Generated from COBSWAIT.cbl — CardDemo TypeScript migration
 * Original COBOL program: COBSWAIT — Utility: wait N centiseconds via MVSWAIT.
 * Complexity: 1.00 (Easy — trivial).
 *   Accepts a centisecond count from SYSIN, calls assembler routine MVSWAIT.
 *   MVSWAIT issues an MVS STIMER SVC to pause execution on z/OS.
 *   In the new architecture this is a simple Promise-based sleep helper.
 *   Business criticality: 1 — no data, no financial logic.
 *
 * Migration target: NestJS injectable utility service
 *
 * COBOL paragraph mapping:
 *   PROCEDURE DIVISION → run()
 *   CALL 'MVSWAIT'     → sleep() [centiseconds → milliseconds]
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * WaitUtility — translates COBSWAIT batch program.
 *
 * MVSWAIT accepted centiseconds (1/100 second units).
 * Node.js sleep works in milliseconds, so we multiply by 10.
 *
 * Usage in JCL: WAITSTEP invoked COBSWAIT with centiseconds from SYSIN PARM.
 * NestJS equivalent: inject WaitUtility and call await waitUtility.run(centiseconds).
 */
@Injectable()
export class WaitUtility {
  private readonly logger = new Logger(WaitUtility.name);

  /** WS-PGMNAME equivalent */
  private readonly programName = 'COBSWAIT';

  /**
   * Main entry point — maps to COBSWAIT PROCEDURE DIVISION.
   * @param centiseconds — wait duration in centiseconds (PIC 9(8) COMP in COBOL)
   */
  async run(centiseconds: number): Promise<void> {
    this.logger.log(
      `${this.programName}: waiting ${centiseconds} centiseconds` +
        ` (${centiseconds * 10}ms)`,
    );

    // CALL 'MVSWAIT' USING MVSWAIT-TIME
    await this.sleep(centiseconds);

    this.logger.log(`${this.programName}: wait complete`);
  }

  /**
   * sleep — replaces MVS STIMER SVC via MVSWAIT assembler routine.
   * @param centiseconds — 1 centisecond = 10 milliseconds
   */
  sleep(centiseconds: number): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, centiseconds * 10),
    );
  }
}
