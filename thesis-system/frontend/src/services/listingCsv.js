const requiredColumns = [
  "title",
  "company",
  "location",
  "description",
  "listing_type",
  "external_url",
];

export function parseListingCsv(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("The CSV file is empty.");
  }

  const input = text.replace(/^\uFEFF/, "");
  const records = [];
  const recordNumbers = [];
  let record = [];
  let field = "";
  let quoted = false;
  let lineNumber = 1;
  let recordStartLine = 1;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else if (character === "\r") {
        field += "\r";
        if (input[index + 1] === "\n") {
          field += "\n";
          index += 1;
        }
        lineNumber += 1;
      } else if (character === "\n") {
        field += character;
        lineNumber += 1;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      record.push(field);
      if (record.some((value) => value.trim())) {
        records.push(record);
        recordNumbers.push(recordStartLine);
      }
      record = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      lineNumber += 1;
      recordStartLine = lineNumber;
    } else if (character === '"') {
      throw new Error("The CSV file contains a misplaced quote.");
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV file contains an unclosed quoted field.");
  record.push(field);
  if (record.some((value) => value.trim())) {
    records.push(record);
    recordNumbers.push(recordStartLine);
  }

  const [headerRow, ...dataRows] = records;
  if (!headerRow) throw new Error("The CSV file is missing its header row.");

  const headers = headerRow.map((header) => header.trim().toLowerCase());
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`The CSV file is missing required columns: ${missingColumns.join(", ")}.`);
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV file contains duplicate column names.");
  }
  if (dataRows.length === 0) {
    throw new Error("The CSV file does not contain any listing rows.");
  }

  return dataRows.map((row, index) => ({
    ...Object.fromEntries(
      requiredColumns.map((column) => {
        const columnIndex = headers.indexOf(column);
        return [column, row[columnIndex] ?? ""];
      }),
    ),
    _rowNumber: recordNumbers[index + 1],
  }));
}
