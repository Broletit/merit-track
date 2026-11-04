export function normalizeConductName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function siblingSequence(code: string, parentCode: string | null) {
  if (parentCode === null) return /^\d+$/.test(code) ? Number(code) : 0;

  const escapedParent = parentCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedParent}\\.(\\d+)$`).exec(code);
  return match ? Number(match[1]) : 0;
}

export function getExpectedConductCode(parent: { code: string; parentId: number | null } | null, siblingCodes: string[]) {
  const parentCode = parent?.code ?? null;
  const maximum = Math.max(
    0,
    ...siblingCodes.map((code) => siblingSequence(code, parentCode)).filter(Number.isInteger)
  );
  const next = maximum + 1;
  return parentCode ? `${parentCode}.${next}` : String(next);
}
