const ACTIVITY_PREFIX = "Đạt tự động từ hoạt động:";

function parseActivityTitles(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Hỗ trợ dữ liệu cũ được lưu bằng dấu phân cách || hoặc chuỗi thuần.
  }

  return trimmed
    .split("||")
    .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);
}

export function formatAutoCriteriaMessage(
  message: string | null,
  matchedActivityTitles?: string | null,
) {
  const titles = matchedActivityTitles ? parseActivityTitles(matchedActivityTitles) : [];
  if (titles.length > 0) return `${ACTIVITY_PREFIX} ${titles.join(", ")}`;

  const normalizedMessage = String(message ?? "").trim();
  if (!normalizedMessage) return null;
  if (!normalizedMessage.startsWith(ACTIVITY_PREFIX)) return normalizedMessage;

  const messageTitles = parseActivityTitles(normalizedMessage.slice(ACTIVITY_PREFIX.length));
  return messageTitles.length > 0
    ? `${ACTIVITY_PREFIX} ${messageTitles.join(", ")}`
    : normalizedMessage;
}

export function AutoCriteriaMessage({
  message,
  matchedActivityTitles,
}: {
  message: string | null;
  matchedActivityTitles?: string | null;
}) {
  const normalizedMessage = formatAutoCriteriaMessage(message, matchedActivityTitles);
  return normalizedMessage ? <div className="mt-2 text-xs text-emerald-700">{normalizedMessage}</div> : null;
}

export function AutoCriteriaBadge() {
  return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Đã đạt</span>;
}
