export function getUpdateFields<T extends object>(
  input: T,
  allowedFields: readonly (keyof T & string)[]
): (keyof T & string)[] {
  return allowedFields.filter((field) => input[field] !== undefined);
}
