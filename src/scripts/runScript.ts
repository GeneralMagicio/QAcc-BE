/* eslint-disable no-console */
import path from 'path';
import fs from 'fs-extra';
import { syncDonationsWithBlockchainData } from './syncDataWithInverter';
import { repoLocalDir, reportsDir, getReportsSubDir } from './configs';
import { ensureDirectoryExists } from './helpers';
import { executeBatchMinting } from './runFundingPotService';

// copy reports from output of funding pot service
async function copyReports() {
  const reportsSubDir = getReportsSubDir();
  // Copy the report files from the subdirectory to the output folder
  const reportFilesDir = path.join(repoLocalDir, reportsSubDir);
  ensureDirectoryExists(reportsDir);

  if (fs.existsSync(reportFilesDir)) {
    fs.emptyDirSync(reportsDir); // Clear the destination folder first
    fs.copySync(reportFilesDir, reportsDir, { recursive: true }); // Copy recursively
    console.info('Report files copied successfully.');
  } else {
    console.error(
      `Subdirectory ${reportsSubDir} does not exist in the repository.`,
    );
  }
}

// Main function to pull reports and sync donations
async function main() {
  try {
    // Step 1: generate reports by running batch minting service with only report flag
    const batchNumber = await executeBatchMinting(true);

    // Step 2: copy reports
    console.info('Start copy report files...');
    await copyReports();
    console.info('Reports were copy successfully.');

    // Step 3: Sync donations with the blockchain data
    await syncDonationsWithBlockchainData(batchNumber);
    console.info('Data synced successfully.');
    process.exit();
  } catch (error) {
    console.error('Error syncing data:', error);
    process.abort();
  }
}

// Run the main function
main();
