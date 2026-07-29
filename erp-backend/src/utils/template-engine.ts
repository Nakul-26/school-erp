export function renderTemplate(templateText: string, variables: Record<string, any>): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const val = getNestedValue(variables, key);
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
}
