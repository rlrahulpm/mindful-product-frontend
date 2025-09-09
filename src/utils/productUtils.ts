/**
 * Utility functions for product slug handling
 */

export const toSlug = (productName: string): string => {
  if (!productName) return '';
  return productName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
};

export const fromSlug = (slug: string): string => {
  if (!slug) return '';
  // Replace hyphens with spaces for display
  return slug.replace(/-/g, ' ');
};