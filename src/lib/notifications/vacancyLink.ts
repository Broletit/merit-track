export async function resolveVacancyLink(link: string, title: string, findClass: (code: string) => Promise<{ id: number; code: string } | undefined>) {
  const url = new URL(link, 'http://app.local');
  const code = url.searchParams.get('keyword') || title.match(/^Lớp\s+(\S+)\s+đang/)?.[1];
  const item = code ? await findClass(code) : undefined;
  if (item) {
    url.searchParams.set('classId', String(item.id));
    url.searchParams.set('keyword', item.code);
  }
  url.searchParams.delete('page');
  return url.pathname + url.search;
}
