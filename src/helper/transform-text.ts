export function transformText(input: string) {
  const snakeCase = input
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/^-/, ""); // Elimina el guion inicial si lo hay

  const upperSnakeCase = input
    .replace(/^[A-Z]/, (match) => match.toLowerCase()) // Convierte la primera letra a minúscula
    .replace(/[A-Z]/g, (match) => `_${match}`)
    .toUpperCase();

  return {
    snakeCase,
    camelCase: input,
    upperSnakeCase,
  };
}
