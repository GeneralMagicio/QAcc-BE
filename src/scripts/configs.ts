import path from 'path';

export const collectionName = 'reportsForSeason2';
export const streamStartDateForQacc = 1747152000; // 5/13/2025 - 16:00:00 GMT
export const streamEndDateForQacc = 1778688000; // 5/13/2026 - 16:00:00 GMT
// 182 days is seconds
export const streamCliffForQacc = 15897600;
// 31 days is seconds
export const ONE_MONTH_IN_SEC = 2678400;
// 61 days is seconds
export const TWO_MONTH_IN_SEC = 5270400;

export const initialSupplyOfFirstSeasonProjects = 152135; // 152k POL

// The URL of the GitHub repository containing the reports
export const repoUrl = 'https://github.com/InverterNetwork/funding-pot.git';
// Local directory for cloning or pulling the latest reports
export const repoLocalDir = path.join(__dirname, '/funding-pot-repo');
// Subdirectory inside the repo where reports are located
export function getReportsSubDir() {
  let reportsSubDir = 'data/';
  if (process.env.NODE_ENV !== 'production') {
    reportsSubDir += 'test';
  } else {
    reportsSubDir += 'production';
  }
  reportsSubDir += '/output';
  return reportsSubDir;
}

export const reportFilesDir = path.join(repoLocalDir, getReportsSubDir());
