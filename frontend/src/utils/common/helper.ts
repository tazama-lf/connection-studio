export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};
