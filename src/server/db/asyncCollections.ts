export async function asyncForEach<T>(items: T[], visit: (value: T, index: number, array: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i++) await visit(items[i], i, items);
}
export async function asyncFilter<T>(items: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>) {
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) if (await predicate(items[i], i, items)) result.push(items[i]);
  return result;
}
export async function asyncSome<T>(items: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i++) if (await predicate(items[i], i, items)) return true;
  return false;
}
export async function asyncEvery<T>(items: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i++) if (!await predicate(items[i], i, items)) return false;
  return true;
}
export async function asyncFind<T>(items: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i++) if (await predicate(items[i], i, items)) return items[i];
}
