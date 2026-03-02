export default function ensurePromise<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      const result = fn(...args);
      return await result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  };
}


export const formatDate = (
  dateString: string | null | undefined
): string => {
  if (!dateString) return 'N/A';

  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};