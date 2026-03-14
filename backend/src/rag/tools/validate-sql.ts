const FORBIDDEN_KEYWORDS = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;
const ALLOWED_TABLE = /\btransactions\b/i;

export function validateSql(sql: string): string | null {
  const trimmed = sql.trim();

  if (!/^SELECT\b/i.test(trimmed)) {
    return 'Query must start with SELECT';
  }

  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    return 'Query contains forbidden keywords (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE)';
  }

  if (trimmed.includes(';')) {
    return 'Query must not contain semicolons';
  }

  // Check that only the transactions table is referenced
  const fromMatches = trimmed.match(/\bFROM\s+(\w+)/gi);
  const joinMatches = trimmed.match(/\bJOIN\s+(\w+)/gi);

  if (fromMatches) {
    for (const match of fromMatches) {
      const tableName = match.replace(/\bFROM\s+/i, '').trim();
      if (!ALLOWED_TABLE.test(tableName)) {
        return `Only the "transactions" table may be queried, found: ${tableName}`;
      }
    }
  }

  if (joinMatches) {
    return 'JOINs to other tables are not allowed';
  }

  return null;
}
