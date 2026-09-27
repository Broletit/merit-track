export function normalizeConductName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function romanToNumber(value: string) {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = values[value[index]] ?? 0;
    const next = values[value[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function numberToRoman(value: number) {
  const parts: Array<[number, string]> = [[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let remaining = value;
  return parts.reduce((result, [amount, symbol]) => {
    while (remaining >= amount) { result += symbol; remaining -= amount; }
    return result;
  }, "");
}

export function getExpectedConductCode(parent: { code: string; parentId: number | null } | null, siblingCodes: string[]) {
  if (!parent) {
    const maximum = Math.max(0, ...siblingCodes.map((code) => romanToNumber(code.toUpperCase())).filter(Number.isFinite));
    return numberToRoman(maximum + 1);
  }

  if (parent.parentId === null) {
    const maximum = Math.max(0, ...siblingCodes.map((code) => Number(code)).filter(Number.isInteger));
    return String(maximum + 1);
  }

  const prefix = `${parent.code}.`;
  const maximum = Math.max(0, ...siblingCodes.map((code) => code.startsWith(prefix) ? Number(code.slice(prefix.length)) : 0).filter(Number.isInteger));
  return `${parent.code}.${maximum + 1}`;
}
