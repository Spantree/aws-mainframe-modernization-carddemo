-- =============================================================================
-- CardDemo PostgreSQL Schema
-- Generated from COBOL copybook analysis
-- Source: app/cpy/CVACT01Y.cpy, CVACT02Y.cpy, CVACT03Y.cpy, CVCUS01Y.cpy,
--         CVTRA01Y.cpy, CVTRA02Y.cpy, CVTRA03Y.cpy, CVTRA04Y.cpy,
--         CVTRA05Y.cpy, CVTRA06Y.cpy, CVEXPORT.cpy, CSUSR01Y.cpy
--
-- COBOL type mapping rules applied:
--   PIC X(n)          → VARCHAR(n) or CHAR(n) for n<=3
--   PIC 9(n) n<=9     → INTEGER
--   PIC 9(n) n>=10    → BIGINT
--   PIC S9(a)V9(b)    → NUMERIC(a+b, b) — NEVER float/double
--   PIC 9(n) COMP-3   → SMALLINT/INTEGER (no fractional part)
--   PIC S9(a)V9(b) COMP-3 → NUMERIC(a+b, b)
--   PIC 9(n) COMP     → INTEGER/BIGINT with PIC-range validation
--   Date fields       → DATE
--   Timestamp X(26)   → TIMESTAMP
--
-- EBCDIC NOTE: All VARCHAR/CHAR columns receive EBCDIC→UTF-8 converted data.
-- Collation may differ from original EBCDIC sort order.
-- =============================================================================

-- =============================================================================
-- LOOKUP / REFERENCE TABLES (no foreign key dependencies)
-- =============================================================================

-- From CVTRA03Y.cpy: TRAN-TYPE-RECORD (RECLN=60)
CREATE TABLE tran_type_record (
    tran_type       CHAR(2)      NOT NULL,
    tran_type_desc  VARCHAR(50),
    CONSTRAINT pk_tran_type_record PRIMARY KEY (tran_type)
);

COMMENT ON TABLE  tran_type_record IS 'Transaction type lookup. Source: CVTRA03Y.cpy TRAN-TYPE-RECORD';
COMMENT ON COLUMN tran_type_record.tran_type IS 'PIC X(02) — 2-char transaction type code';
COMMENT ON COLUMN tran_type_record.tran_type_desc IS 'PIC X(50) — description';

-- From CVTRA04Y.cpy: TRAN-CAT-RECORD (RECLN=60)
CREATE TABLE tran_cat_record (
    tran_type_cd        CHAR(2)      NOT NULL,
    tran_cat_cd         SMALLINT     NOT NULL,
    tran_cat_type_desc  VARCHAR(50),
    CONSTRAINT pk_tran_cat_record PRIMARY KEY (tran_type_cd, tran_cat_cd),
    CONSTRAINT fk_tran_cat_type FOREIGN KEY (tran_type_cd)
        REFERENCES tran_type_record (tran_type)
);

COMMENT ON TABLE  tran_cat_record IS 'Transaction category lookup. Source: CVTRA04Y.cpy TRAN-CAT-RECORD';
COMMENT ON COLUMN tran_cat_record.tran_type_cd IS 'PIC X(02) — FK to tran_type_record';
COMMENT ON COLUMN tran_cat_record.tran_cat_cd IS 'PIC 9(04) — 4-digit category code';
COMMENT ON COLUMN tran_cat_record.tran_cat_type_desc IS 'PIC X(50) — description';

-- =============================================================================
-- CORE ENTITY TABLES
-- =============================================================================

-- From CVCUS01Y.cpy: CUSTOMER-RECORD (RECLN=500)
-- NOTE: CUSTREC.cpy is a near-duplicate (CUST-DOB-YYYYMMDD vs CUST-DOB-YYYY-MM-DD).
--       CVCUS01Y is canonical.
CREATE TABLE customer_record (
    cust_id                 INTEGER      NOT NULL,
    cust_first_name         VARCHAR(25),
    cust_middle_name        VARCHAR(25),
    cust_last_name          VARCHAR(25),
    cust_addr_line_1        VARCHAR(50),
    cust_addr_line_2        VARCHAR(50),
    cust_addr_line_3        VARCHAR(50),
    cust_addr_state_cd      CHAR(2),
    cust_addr_country_cd    CHAR(3),
    cust_addr_zip           VARCHAR(10),
    cust_phone_num_1        VARCHAR(15),
    cust_phone_num_2        VARCHAR(15),
    -- SENSITIVE PII: SSN stored as integer in COBOL (PIC 9(09)).
    -- RECOMMENDATION: Encrypt at rest or tokenize. Store as VARCHAR(11)
    -- to preserve leading zeros if needed.
    cust_ssn                INTEGER,
    cust_govt_issued_id     VARCHAR(20),    -- SENSITIVE PII
    cust_dob                DATE,           -- SENSITIVE PII; PIC X(10) YYYY-MM-DD
    cust_eft_account_id     VARCHAR(10),
    cust_pri_card_holder_ind CHAR(1),
    cust_fico_credit_score  SMALLINT,       -- PIC 9(03); range 300-850
    CONSTRAINT pk_customer_record PRIMARY KEY (cust_id)
);

COMMENT ON TABLE  customer_record IS 'Customer master. Source: CVCUS01Y.cpy CUSTOMER-RECORD (500 bytes)';
COMMENT ON COLUMN customer_record.cust_ssn IS 'SENSITIVE PII — PIC 9(09). Encrypt or tokenize.';
COMMENT ON COLUMN customer_record.cust_dob IS 'SENSITIVE PII — PIC X(10) YYYY-MM-DD';
COMMENT ON COLUMN customer_record.cust_fico_credit_score IS 'PIC 9(03); FICO range 300-850';

-- From CVACT01Y.cpy: ACCOUNT-RECORD (RECLN=300)
CREATE TABLE account_record (
    acct_id                 BIGINT          NOT NULL,   -- PIC 9(11)
    acct_active_status      CHAR(1),
    -- Financial fields: all PIC S9(10)V99 → NUMERIC(12,2)
    -- NEVER use float/double — silent precision loss on financial data
    acct_curr_bal           NUMERIC(12,2),
    acct_credit_limit       NUMERIC(12,2),
    acct_cash_credit_limit  NUMERIC(12,2),
    acct_open_date          DATE,
    acct_expiration_date    DATE,           -- note: COBOL typo EXPIRAION corrected
    acct_reissue_date       DATE,
    acct_curr_cyc_credit    NUMERIC(12,2),
    acct_curr_cyc_debit     NUMERIC(12,2),
    acct_addr_zip           VARCHAR(10),
    acct_group_id           VARCHAR(10),    -- FK to dis_group_record
    CONSTRAINT pk_account_record PRIMARY KEY (acct_id)
);

COMMENT ON TABLE  account_record IS 'Credit card account master. Source: CVACT01Y.cpy ACCOUNT-RECORD (300 bytes)';
COMMENT ON COLUMN account_record.acct_id IS 'PIC 9(11) — 11-digit account ID';
COMMENT ON COLUMN account_record.acct_expiration_date IS 'Original COBOL field ACCT-EXPIRAION-DATE (typo: missing T)';
COMMENT ON COLUMN account_record.acct_group_id IS 'Links to dis_group_record.dis_acct_group_id';

-- From CVACT02Y.cpy: CARD-RECORD (RECLN=150)
CREATE TABLE card_record (
    card_num                VARCHAR(16)     NOT NULL,
    card_acct_id            BIGINT          NOT NULL,   -- PIC 9(11)
    -- SECURITY NOTE: CVV should NOT be stored; include only during card issuance
    card_cvv_cd             SMALLINT,                   -- PIC 9(03); see security note
    card_embossed_name      VARCHAR(50),
    card_expiration_date    DATE,           -- note: COBOL typo EXPIRAION corrected
    card_active_status      CHAR(1),
    CONSTRAINT pk_card_record PRIMARY KEY (card_num),
    CONSTRAINT fk_card_acct FOREIGN KEY (card_acct_id)
        REFERENCES account_record (acct_id)
);

COMMENT ON TABLE  card_record IS 'Credit card master. Source: CVACT02Y.cpy CARD-RECORD (150 bytes)';
COMMENT ON COLUMN card_record.card_num IS 'PIC X(16) — stored as string, not numeric';
COMMENT ON COLUMN card_record.card_cvv_cd IS 'PIC 9(03) — SECURITY: CVV must not persist per PCI DSS';

-- From CVACT03Y.cpy: CARD-XREF-RECORD (RECLN=50)
CREATE TABLE card_xref_record (
    xref_card_num   VARCHAR(16)     NOT NULL,
    xref_cust_id    INTEGER         NOT NULL,   -- PIC 9(09)
    xref_acct_id    BIGINT          NOT NULL,   -- PIC 9(11)
    CONSTRAINT pk_card_xref_record PRIMARY KEY (xref_card_num),
    CONSTRAINT fk_xref_card FOREIGN KEY (xref_card_num)
        REFERENCES card_record (card_num),
    CONSTRAINT fk_xref_cust FOREIGN KEY (xref_cust_id)
        REFERENCES customer_record (cust_id),
    CONSTRAINT fk_xref_acct FOREIGN KEY (xref_acct_id)
        REFERENCES account_record (acct_id)
);

COMMENT ON TABLE  card_xref_record IS 'Card to customer/account cross-reference. Source: CVACT03Y.cpy CARD-XREF-RECORD (50 bytes)';

-- From CVTRA01Y.cpy: TRAN-CAT-BAL-RECORD (RECLN=50)
-- Composite key: (acct_id, type_cd, cat_cd)
CREATE TABLE tran_cat_bal_record (
    trancat_acct_id     BIGINT          NOT NULL,   -- PIC 9(11)
    trancat_type_cd     CHAR(2)         NOT NULL,
    trancat_cd          SMALLINT        NOT NULL,   -- PIC 9(04)
    tran_cat_bal        NUMERIC(11,2),              -- PIC S9(09)V99
    CONSTRAINT pk_tran_cat_bal_record
        PRIMARY KEY (trancat_acct_id, trancat_type_cd, trancat_cd),
    CONSTRAINT fk_tcb_acct FOREIGN KEY (trancat_acct_id)
        REFERENCES account_record (acct_id),
    CONSTRAINT fk_tcb_type FOREIGN KEY (trancat_type_cd)
        REFERENCES tran_type_record (tran_type)
);

COMMENT ON TABLE  tran_cat_bal_record IS 'Transaction category balance by account. Source: CVTRA01Y.cpy (50 bytes)';
COMMENT ON COLUMN tran_cat_bal_record.tran_cat_bal IS 'PIC S9(09)V99 — NEVER use float/double';

-- From CVTRA02Y.cpy: DIS-GROUP-RECORD (RECLN=50)
-- Disclosure/interest rate by account group, transaction type and category
CREATE TABLE dis_group_record (
    dis_acct_group_id   VARCHAR(10)     NOT NULL,
    dis_tran_type_cd    CHAR(2)         NOT NULL,
    dis_tran_cat_cd     SMALLINT        NOT NULL,   -- PIC 9(04)
    dis_int_rate        NUMERIC(6,2),               -- PIC S9(04)V99 — interest rate
    CONSTRAINT pk_dis_group_record
        PRIMARY KEY (dis_acct_group_id, dis_tran_type_cd, dis_tran_cat_cd),
    CONSTRAINT fk_dis_type FOREIGN KEY (dis_tran_type_cd)
        REFERENCES tran_type_record (tran_type)
);

COMMENT ON TABLE  dis_group_record IS 'Disclosure/interest rate group. Source: CVTRA02Y.cpy (50 bytes)';
COMMENT ON COLUMN dis_group_record.dis_int_rate IS 'PIC S9(04)V99 — interest rate percentage. NEVER use float/double.';

-- From CVTRA05Y.cpy: TRAN-RECORD (RECLN=350)
CREATE TABLE tran_record (
    tran_id             VARCHAR(16)     NOT NULL,
    tran_type_cd        CHAR(2),
    tran_cat_cd         SMALLINT,                   -- PIC 9(04)
    tran_source         VARCHAR(10),
    tran_desc           VARCHAR(100),
    tran_amt            NUMERIC(11,2),              -- PIC S9(09)V99 — NEVER float/double
    tran_merchant_id    INTEGER,                    -- PIC 9(09)
    tran_merchant_name  VARCHAR(50),
    tran_merchant_city  VARCHAR(50),
    tran_merchant_zip   VARCHAR(10),
    tran_card_num       VARCHAR(16),
    tran_orig_ts        TIMESTAMP,                  -- PIC X(26) YYYY-MM-DD HH:MM:SS.ssssss
    tran_proc_ts        TIMESTAMP,
    CONSTRAINT pk_tran_record PRIMARY KEY (tran_id),
    CONSTRAINT fk_tran_type FOREIGN KEY (tran_type_cd)
        REFERENCES tran_type_record (tran_type),
    CONSTRAINT fk_tran_card FOREIGN KEY (tran_card_num)
        REFERENCES card_record (card_num)
);

COMMENT ON TABLE  tran_record IS 'Transaction master. Source: CVTRA05Y.cpy TRAN-RECORD (350 bytes)';
COMMENT ON COLUMN tran_record.tran_amt IS 'PIC S9(09)V99 — NEVER use float/double';
COMMENT ON COLUMN tran_record.tran_orig_ts IS 'PIC X(26) — format YYYY-MM-DD HH:MM:SS.ssssss';

-- From CVTRA06Y.cpy: DALYTRAN-RECORD (RECLN=350)
-- Daily transaction batch record — same structure as TRAN-RECORD, different prefix
-- Used in batch processing jobs (CBTRN02C, CBTRN03C, etc.)
CREATE TABLE dalytran_record (
    dalytran_id             VARCHAR(16)     NOT NULL,
    dalytran_type_cd        CHAR(2),
    dalytran_cat_cd         SMALLINT,
    dalytran_source         VARCHAR(10),
    dalytran_desc           VARCHAR(100),
    dalytran_amt            NUMERIC(11,2),          -- PIC S9(09)V99
    dalytran_merchant_id    INTEGER,
    dalytran_merchant_name  VARCHAR(50),
    dalytran_merchant_city  VARCHAR(50),
    dalytran_merchant_zip   VARCHAR(10),
    dalytran_card_num       VARCHAR(16),
    dalytran_orig_ts        TIMESTAMP,
    dalytran_proc_ts        TIMESTAMP,
    CONSTRAINT pk_dalytran_record PRIMARY KEY (dalytran_id),
    CONSTRAINT fk_dalytran_type FOREIGN KEY (dalytran_type_cd)
        REFERENCES tran_type_record (tran_type),
    CONSTRAINT fk_dalytran_card FOREIGN KEY (dalytran_card_num)
        REFERENCES card_record (card_num)
);

COMMENT ON TABLE  dalytran_record IS 'Daily transaction batch record. Source: CVTRA06Y.cpy DALYTRAN-RECORD (350 bytes). Identical structure to tran_record — batch processing variant.';

-- =============================================================================
-- SECURITY / USER TABLE
-- =============================================================================

-- From CSUSR01Y.cpy: SEC-USER-DATA (RECLN=80)
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- CRITICAL SECURITY VULNERABILITY: Original COBOL stores passwords in PLAINTEXT
-- (SEC-USR-PWD PIC X(08)). This schema stores BCrypt hashed passwords.
-- Data migration MUST hash all passwords before inserting.
-- The sec_usr_pwd column is VARCHAR(72) to accommodate a BCrypt hash.
-- DO NOT copy raw COBOL password bytes into this column.
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
CREATE TABLE sec_user_data (
    sec_usr_id      VARCHAR(8)      NOT NULL,
    sec_usr_fname   VARCHAR(20),
    sec_usr_lname   VARCHAR(20),
    -- Original: PIC X(08) plaintext. Migrated column stores BCrypt hash.
    sec_usr_pwd     VARCHAR(72)     NOT NULL,
    -- 'A' = Admin (CDEMO-USRTYP-ADMIN), 'U' = User (CDEMO-USRTYP-USER)
    sec_usr_type    CHAR(1),
    CONSTRAINT pk_sec_user_data PRIMARY KEY (sec_usr_id),
    CONSTRAINT chk_sec_usr_type CHECK (sec_usr_type IN ('A', 'U'))
);

COMMENT ON TABLE  sec_user_data IS 'Application user security. Source: CSUSR01Y.cpy SEC-USER-DATA';
COMMENT ON COLUMN sec_user_data.sec_usr_pwd IS 'CRITICAL: Original COBOL is plaintext PIC X(08). Migration must BCrypt-hash all passwords. Column stores hash, not plaintext.';
COMMENT ON COLUMN sec_user_data.sec_usr_type IS 'A=Admin (CDEMO-USRTYP-ADMIN), U=User (CDEMO-USRTYP-USER)';

-- =============================================================================
-- EXPORT TABLE
-- Represents CVEXPORT.cpy EXPORT-RECORD (500 bytes)
-- The EXPORT-RECORD-DATA (460 bytes) is redefined by 5 structures.
-- In PostgreSQL, store the discriminator + common header, plus a JSONB payload
-- for the variant data. Alternatively, use separate export_* tables.
-- =============================================================================

-- Option A: Single table with JSONB payload (recommended for import/audit use)
CREATE TABLE export_record (
    export_sequence_num     INTEGER         NOT NULL,   -- PIC 9(9) COMP
    export_rec_type         CHAR(1)         NOT NULL,   -- discriminator
    -- 'C'=Customer, 'A'=Account, 'T'=Transaction, 'X'=Card-Xref, 'D'=Card
    export_timestamp        TIMESTAMP,
    export_branch_id        VARCHAR(4),
    export_region_code      VARCHAR(5),
    -- Variant payload stored as JSONB; keys match Java sealed interface subtypes
    export_data             JSONB,
    CONSTRAINT pk_export_record PRIMARY KEY (export_sequence_num),
    CONSTRAINT chk_export_rec_type
        CHECK (export_rec_type IN ('C', 'A', 'T', 'X', 'D'))
);

COMMENT ON TABLE  export_record IS 'Multi-type export file staging. Source: CVEXPORT.cpy EXPORT-RECORD (500 bytes). EXPORT-RECORD-DATA REDEFINES → JSONB payload.';
COMMENT ON COLUMN export_record.export_rec_type IS 'C=Customer, A=Account, T=Transaction, X=Card-Xref, D=Card';
COMMENT ON COLUMN export_record.export_data IS 'Variant record data as JSONB. Maps to Java sealed interface ExportRecordData.';
COMMENT ON COLUMN export_record.export_sequence_num IS 'PIC 9(9) COMP — TRUNC(STD) range limited to 999999999';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Customer lookups by name
CREATE INDEX idx_customer_name ON customer_record (cust_last_name, cust_first_name);

-- Account status queries
CREATE INDEX idx_account_active ON account_record (acct_active_status);

-- Card lookups by account
CREATE INDEX idx_card_acct ON card_record (card_acct_id);

-- Transaction queries by card and timestamp
CREATE INDEX idx_tran_card ON tran_record (tran_card_num);
CREATE INDEX idx_tran_orig_ts ON tran_record (tran_orig_ts);

-- Daily transaction queries
CREATE INDEX idx_dalytran_card ON dalytran_record (dalytran_card_num);
CREATE INDEX idx_dalytran_orig_ts ON dalytran_record (dalytran_orig_ts);

-- Transaction category balances by account
CREATE INDEX idx_tcb_acct ON tran_cat_bal_record (trancat_acct_id);

-- User type queries
CREATE INDEX idx_sec_user_type ON sec_user_data (sec_usr_type);

-- Export table queries by type and timestamp
CREATE INDEX idx_export_type ON export_record (export_rec_type);
CREATE INDEX idx_export_ts ON export_record (export_timestamp);
