/* eslint-disable no-console */
import path from 'path';
import _ from 'lodash';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';
import { getRoundByBatchNumber, getStreamDetails } from './helpers';
import { repoLocalDir, getReportsSubDir } from './configs';

async function loadReportFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading report file: ${error.message}`);
    return null;
  }
}

function getAllReportFiles(dirPath: string) {
  let files: string[] = [];

  fs.readdirSync(dirPath).forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getAllReportFiles(fullPath)); // Recursively get files from subdirectories
    } else if (fullPath.endsWith('.json')) {
      files.push(fullPath);
    }
  });

  return files;
}

async function processReportForDonations(
  donations: Donation[],
  reportData: any,
  round: any,
  isEarlyAccess: boolean,
) {
  try {
    const participants = reportData.batch.data.participants;
    const lowerCasedParticipants = Object.keys(participants).reduce(
      (acc, key) => {
        acc[key.toLowerCase()] = participants[key];
        return acc;
      },
      {},
    );

    for (const donation of donations) {
      const participantData =
        lowerCasedParticipants[donation.fromWalletAddress.toLowerCase()];

      if (!participantData) {
        console.error(`No participant data found for donation ${donation.id}`);
        await unassociateDonationIfIsForThisRound(
          donation,
          round,
          isEarlyAccess,
        );
        continue;
      }

      await updateDonationRewardsData(
        participantData,
        donation,
        round,
        isEarlyAccess,
      );
    }
    // todo: can check if there is any transactions that is not in the database
  } catch (error) {
    console.error(
      `Failed to process donations rewards for project ${donations[0].projectId}: ${error.message}`,
    );
  }
}

async function unassociateDonationIfIsForThisRound(
  donation: Donation,
  round: any,
  isEarlyAccess: boolean,
) {
  console.info(`Unassociating donation ${donation.id} if the round is same...`);
  if (isEarlyAccess && donation.earlyAccessRoundId === round.id) {
    donation.earlyAccessRoundId = null;
    await donation.save();
    console.info(
      `Donation ${donation.id} unassociated form early access round ${round.roundNumber}`,
    );
    return;
  }
  if (!isEarlyAccess && donation.qfRoundId === round.id) {
    donation.qfRoundId = null;
    await donation.save();
    console.info(
      `Donation ${donation.id} unassociated form qacc round ${round.roundNumber}`,
    );
    return;
  }
  console.warn(
    `Donation ${donation.id} is not associated to current round!!!\n
    Donation qf round id is ${donation.qfRoundId} and donation early access round id is ${donation.earlyAccessRoundId}\n
    But report is for ${isEarlyAccess ? 'early access' : 'Qacc'} round with id ${round.id} !!!!`,
  );
}

// based the use case of this function, we don't need to save donation in it, because after calling that, we save donation data
function associateDonationToThisRound(
  donation: Donation,
  round: any,
  isEarlyAccess: boolean,
) {
  console.info(
    `Associating donation ${donation.id} if the round is not matched...`,
  );
  if (isEarlyAccess && donation.earlyAccessRoundId !== round.id) {
    console.warn(
      `Associate donation to current round because donation ${donation.id} is not associated correctly!!!\n
      Donation qf round id is ${donation.qfRoundId} and donation early access round id is ${donation.earlyAccessRoundId}\n
      But report is for early access round with id ${round.id} !!!!`,
    );
    donation.earlyAccessRoundId = round.id;
    donation.qfRoundId = null;
    return;
  }
  if (!isEarlyAccess && donation.qfRoundId !== round.id) {
    console.warn(
      `Associate donation to current round because donation ${donation.id} is not associated correctly!!!\n
      Donation qf round id is ${donation.qfRoundId} and donation early access round id is ${donation.earlyAccessRoundId}\n
      But report is for Qacc round with id ${round.id} !!!!`,
    );
    donation.earlyAccessRoundId = null;
    donation.qfRoundId = round.id;
    console.info(
      `Donation ${donation.id} unassociated form qacc round ${round.roundNumber}`,
    );
    return;
  }
  console.info(`Donation is associated correctly from before`);
}

async function updateDonationRewardsData(
  participantData: any,
  donation: Donation,
  round: any,
  isEarlyAccess: boolean,
) {
  const totalValidContribution = ethers.BigNumber.from(
    participantData.validContribution.inCollateral,
  );
  // if issuance allocation is not exist, that mean this user has not any valid contributions
  const issuanceAllocationRow = ethers.BigNumber.from(
    participantData.issuanceAllocation || '0',
  );
  const issuanceAllocation = parseFloat(
    ethers.utils.formatUnits(issuanceAllocationRow, 18),
  ); // Assuming 18 decimal places

  const donationTransaction = participantData.transactions.find(
    (tx: any) =>
      tx.transactionHash.toLowerCase() === donation.transactionId.toLowerCase(),
  );

  if (!donationTransaction) {
    console.error(`No transaction data found for donation ${donation.id}`);
    await unassociateDonationIfIsForThisRound(donation, round, isEarlyAccess);
    return;
  }

  const donationValidContribution = ethers.BigNumber.from(
    donationTransaction.validContribution,
  );
  const contributionPercentage =
    parseFloat(ethers.utils.formatUnits(donationValidContribution, 18)) /
    parseFloat(ethers.utils.formatUnits(totalValidContribution, 18));

  // Calculate the reward proportionally based on the valid contribution
  const rewardAmount = issuanceAllocation * contributionPercentage;
  donation.rewardTokenAmount = rewardAmount || 0;

  if (donation.rewardTokenAmount) {
    const vestingInfo = getStreamDetails(isEarlyAccess);

    donation.cliff = vestingInfo.CLIFF * 1000;
    donation.rewardStreamStart = new Date(vestingInfo.START * 1000);
    donation.rewardStreamEnd = new Date(vestingInfo.END * 1000);
  }

  associateDonationToThisRound(donation, round, isEarlyAccess);

  await donation.save();
  console.debug(`Reward data for donation ${donation.id} successfully updated`);
}

export async function updateRewardsForDonations(batchNumber: number) {
  try {
    const datasource = AppDataSource.getDataSource();
    const donationRepository = datasource.getRepository(Donation);
    const donations = await donationRepository.find({
      where: [
        { rewardStreamEnd: undefined },
        { rewardStreamStart: undefined },
        { rewardTokenAmount: undefined },
      ],
    });

    const { round, isEarlyAccess } = await getRoundByBatchNumber(batchNumber);

    const donationsByProjectId = _.groupBy(donations, 'projectId');

    const reportFilesDir = path.join(repoLocalDir, getReportsSubDir());
    const allReportFiles = getAllReportFiles(reportFilesDir);

    for (const projectId of Object.keys(donationsByProjectId)) {
      console.debug(`Start processing project ${projectId} for donations.`);

      const project = await Project.findOne({
        where: { id: Number(projectId) },
      });
      if (!project || !project.abc?.orchestratorAddress) {
        console.error(
          `Project or orchestratorAddress not found for project ${projectId}!`,
        );
        continue;
      }

      // Look for matching report files based on orchestrator address
      let matchedReportFile = null;
      for (const reportFilePath of allReportFiles) {
        const fileName = path.basename(reportFilePath);

        if (fileName.endsWith(`${batchNumber}.json`)) {
          const reportData = await loadReportFile(reportFilePath);
          if (!reportData) continue;

          const reportOrchestratorAddress =
            reportData.queries?.addresses?.orchestrator?.toLowerCase();
          if (
            reportOrchestratorAddress ===
            project.abc.orchestratorAddress.toLowerCase()
          ) {
            matchedReportFile = reportData;
            break;
          }
        }
      }

      if (!matchedReportFile) {
        console.error(
          `No matching report found for project with orchestrator address ${project.abc.orchestratorAddress}, for batch number ${batchNumber}`,
        );
        continue;
      }

      await updateNumberOfBatchMintingTransactionsForProject(
        project,
        matchedReportFile,
        batchNumber,
      );

      await processReportForDonations(
        donationsByProjectId[projectId],
        matchedReportFile,
        round,
        isEarlyAccess,
      );
    }
  } catch (error) {
    console.error(`Error updating rewards for donations`, error);
  }
}

async function updateNumberOfBatchMintingTransactionsForProject(
  project: Project,
  reportData: any,
  batchNumber: number,
) {
  const transactions = reportData.safe.proposedTransactions;
  if (transactions.length > 0) {
    if (!project.batchNumbersWithSafeTransactions) {
      project.batchNumbersWithSafeTransactions = [batchNumber];
    } else {
      project.batchNumbersWithSafeTransactions.push(batchNumber);
    }
    await project.save();
  }
}
