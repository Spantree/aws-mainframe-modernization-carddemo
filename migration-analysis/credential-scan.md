# Credential Scan Report — CardDemo

**Scan Date:** 2026-02-28
**Analyst:** Inventory Analyst

## Summary

One hardcoded credential set was found. No database passwords or RACF credentials were found.

---

## Finding #1 — FTP Credentials in FTPJCL.JCL

| Field         | Value                          |
|---------------|--------------------------------|
| **File**      | `app/jcl/FTPJCL.JCL`          |
| **Lines**     | 33–35                          |
| **Type**      | FTP username / password        |
| **Severity**  | HIGH                           |

**Context:**
```
//SYSIN DD *
 172.31.21.124        ← FTP server IP
 [REDACTED]           ← FTP username (carddemousr)
 [REDACTED]           ← FTP password (ftpdemo1)
```

**Recommendation:** Remove this JCL job from source control or replace credentials with symbolic parameters (`&FTPUSER`, `&FTPPASS`) resolved at runtime from a secure credential store.

---

## Finding #2 — IMS DBD PASSWD=NO (Informational)

| Field         | Value                                                    |
|---------------|----------------------------------------------------------|
| **Files**     | `app-authorization-ims-db2-mq/ims/*.dbd` / `*.DBD`      |
| **Type**      | IMS Database Descriptor — password security disabled     |
| **Severity**  | LOW / Informational                                      |

The IMS DBD definitions contain `PASSWD=NO` which is a standard IMS configuration parameter indicating password protection is disabled on these databases. This is not a hardcoded credential but an access-control configuration that should be reviewed during migration.

---

## Areas Scanned — No Issues Found

| Area                         | Files Scanned          | Result       |
|------------------------------|------------------------|--------------|
| COBOL working storage        | All 44 `.cbl`/`.CBL`   | Clean        |
| JCL DD statements (non-FTP) | 37 of 38 `.jcl`/`.JCL` | Clean        |
| Copybooks                    | All 30 `.cpy`/`.CPY`   | Clean        |
| EXEC CICS SIGNON/VERIFY      | All CICS programs      | None present |
| DB2 AUTHID                   | All JCL/SQL            | Clean        |
| MQ MCAUSER / channel auth    | All app files          | Clean        |
