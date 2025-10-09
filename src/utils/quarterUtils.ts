/**
 * Utility functions for working with quarters
 */

export interface QuarterInfo {
  year: number;
  quarter: number;
}

/**
 * Get the current year and quarter
 */
export const getCurrentQuarter = (): QuarterInfo => {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  const year = now.getFullYear();

  let quarter: number;
  if (month >= 1 && month <= 3) {
    quarter = 1;
  } else if (month >= 4 && month <= 6) {
    quarter = 2;
  } else if (month >= 7 && month <= 9) {
    quarter = 3;
  } else {
    quarter = 4;
  }

  return { year, quarter };
};

/**
 * Format quarter for display
 */
export const formatQuarter = (year: number, quarter: number): string => {
  return `Q${quarter} ${year}`;
};
