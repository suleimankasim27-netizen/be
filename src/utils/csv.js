function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers, rows) {
  const headerLine = headers.map(escapeCsv).join(",");
  const lines = rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","));
  return [headerLine, ...lines].join("\n");
}
