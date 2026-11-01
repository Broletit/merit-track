
export function unicodeContains(value: unknown, keyword: unknown) {
  const fold = (text: unknown) => String(text ?? "").normalize("NFC").toLocaleLowerCase("vi");
  return Number(fold(value).includes(fold(keyword)));
}
