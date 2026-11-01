export function validateApiRequest(request: Request): Response | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  let sameOrigin = true;
  if (origin) {
    try { sameOrigin = new URL(origin).host === host; } catch { sameOrigin = false; }
  }
  if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({message:"Nguồn gửi yêu cầu không được phép."}, {status:403});
  }
  const size = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(size) || size < 0 || size > 50 * 1024 * 1024) {
    return Response.json({message:"Yêu cầu vượt quá dung lượng cho phép."}, {status:413});
  }
  return null;
}
