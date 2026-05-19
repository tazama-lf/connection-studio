export default function ensurePromise<
  T extends (...args: unknown[]) => unknown,
>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      const result = await fn(...args);
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error), { cause: error });
    }
  };
}

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};
