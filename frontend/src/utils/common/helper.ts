export default function ensurePromise<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = fn(...args);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error), { cause: error });
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