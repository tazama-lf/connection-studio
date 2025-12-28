export default function ensurePromise<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return (...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      return result instanceof Promise ? result : Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};
