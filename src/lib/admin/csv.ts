/**
 * CSV and formula injection (ASVS 1.2.10, OWASP; T-50): a cell Excel would read as a formula
 * gets a leading apostrophe.
 */
export function neutralise(value: string): string {
  return /^[=+\-@\t\r\0]/.test(value) ? `'${value}` : value
}

export type Column<T> = { header: string; value: (row: T) => string | number | boolean | null }

/** UTF-8 with a byte-order mark and CRLF, every field quoted (RFC 4180), so Excel opens it cleanly. */
export function toCsv<T>(rows: readonly T[], columns: readonly Column<T>[]): string {
  const cell = (value: string | number | boolean | null) => {
    const text = value === null ? '' : typeof value === 'string' ? neutralise(value) : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }
  const lines = [
    columns.map((column) => cell(column.header)),
    ...rows.map((row) => columns.map((column) => cell(column.value(row)))),
  ]
  return `﻿${lines.map((line) => line.join(',')).join('\r\n')}\r\n`
}
