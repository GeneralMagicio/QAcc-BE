/* eslint-disable no-console */
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { repoLocalDir, repoUrl } from './configs';
import config from '../config';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';
import { toScreamingSnakeCase, ensureDirectoryExists } from './helpers';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { QfRound } from '../entities/qfRound';
import { findAllEarlyAccessRounds } from '../repositories/earlyAccessRoundRepository';
import { findQfRounds } from '../repositories/qfRoundRepository';

// Attention: the configs of batches should be saved in the funding pot repo
// this script pulls the latest version of funding pot service,
// fill project details and execute it

async function pullLatestVersionOfFundingPot() {
  const git = simpleGit();

  if (!fs.existsSync(repoLocalDir)) {
    console.info('Cloning funding pot repository...');
    await git.clone(repoUrl, repoLocalDir);
  } else {
    console.info('Pulling latest version of funding pot service...');
    await git.cwd(repoLocalDir).pull();
  }
}

async function getRoundByBatchNumber(batchNumber: number) {
  const datasource = AppDataSource.getDataSource();
  const earlyAccessRoundRepository = datasource.getRepository(EarlyAccessRound);
  const qfRoundRepository = datasource.getRepository(QfRound);

  // Step 1: Check if an Early Access Round exists for the given batchNumber
  let round: any;
  let isEarlyAccess = true; // Set this to true if it's an Early Access Round by default

  round = await earlyAccessRoundRepository.findOne({
    where: { roundNumber: batchNumber },
  });

  if (!round) {
    // No Early Access Round found, fallback to QF Round
    isEarlyAccess = false;

    // Step 2: Get the last Early Access Round to adjust the round number
    const lastEarlyAccessRound = await earlyAccessRoundRepository
      .createQueryBuilder('eaRound')
      .orderBy('eaRound.roundNumber', 'DESC')
      .getOne();

    const lastEarlyAccessRoundNumber = lastEarlyAccessRound
      ? lastEarlyAccessRound.roundNumber
      : 0;

    // Step 3: Find the QF Round, add it to the number of the last Early Access Round
    const qfRound = await qfRoundRepository.findOne({
      where: { roundNumber: batchNumber - lastEarlyAccessRoundNumber },
    });

    // Step 4: If no QF round is found, throw an error
    if (!qfRound) {
      throw new Error(
        `No Early Access or QF round found for batch number ${batchNumber}`,
      );
    }
    round = qfRound;
  }

  return { round, isEarlyAccess };
}

async function generateBatchFile(batchNumber: number, onlyReport?: boolean) {
  console.info(`Generating batch config for batch number: ${batchNumber}`);
  const { round, isEarlyAccess } = await getRoundByBatchNumber(batchNumber);
  if (!isEarlyAccess) {
    round.startDate = round.beginDate;
  }

  const datasource = AppDataSource.getDataSource();
  const earlyAccessRoundRepository = datasource.getRepository(EarlyAccessRound);
  const EA1Round = await earlyAccessRoundRepository.findOne({
    where: { roundNumber: 1 },
  });
  const streamStartDate = Math.floor(
    new Date(EA1Round ? EA1Round.startDate : round.startDate).getTime() / 1000,
  ); // stream start date should be equal to EA1 round start date for every rounds

  // Step 5: Format the data based on the round type
  const batchConfig = {
    TIMEFRAME: {
      FROM_TIMESTAMP: Math.floor(new Date(round.startDate).getTime() / 1000), // Convert to timestamp
      TO_TIMESTAMP: Math.floor(new Date(round.endDate).getTime() / 1000),
    },
    VESTING_DETAILS: {
      START: streamStartDate,
      CLIFF: 31536000, // 1 year in sec
      END: streamStartDate + 63072000, // 2 years after start
    },
    LIMITS: {
      INDIVIDUAL: (round.roundUSDCapPerUserPerProject || '5000').toString(), // Default to 5000 for individual cap
      INDIVIDUAL_2: isEarlyAccess ? '0' : '250', // Only required for QACC rounds
      TOTAL: (round.roundUSDCapPerProject || '100000').toString(), // Default to 100000 for total limit
      TOTAL_2: isEarlyAccess
        ? '0'
        : (round.roundUSDCloseCapPerProject || '1050000').toString(), // Only required for QACC rounds
    },
    IS_EARLY_ACCESS: isEarlyAccess, // Set based on the round type
    PRICE: (round.tokenPrice || '0.1').toString(), // Default price to "0.1" if not provided
    ONLY_REPORT: onlyReport, // If we set this flag, only report will be generated and no transactions propose to the safes
  };

  // Step 6: Define the path to the {batchNumber}.json file inside the funding pot repo
  const batchFilePath = path.join(
    repoLocalDir,
    'data',
    'production',
    'input',
    'batches',
    `${batchNumber}.json`,
  );

  // Ensure the directory exists
  ensureDirectoryExists(path.dirname(batchFilePath));

  // Write the batch data to the {batchNumber}.json file
  await fs.writeJson(batchFilePath, batchConfig, { spaces: 2 });

  console.info(`Batch config successfully written to ${batchFilePath}`);
}

async function fillProjectsData() {
  console.info('Initialize the data source (database connection)...');
  await AppDataSource.initialize(false);
  console.info('Data source initialized.');
  const datasource = AppDataSource.getDataSource();
  const projectRepository = datasource.getRepository(Project);

  const allProjects = await projectRepository.find();

  // Prepare the projects data in the required format
  const projectsData = {};
  allProjects.forEach(project => {
    // Check if project has the required fields (orchestratorAddress, projectAddress, NFT)
    if (project.abc) {
      const screamingSnakeCaseTitle = toScreamingSnakeCase(project.title);
      projectsData[screamingSnakeCaseTitle] = {
        SAFE: project.abc.projectAddress || '',
        ORCHESTRATOR: project.abc.orchestratorAddress || '',
        NFT: project.abc.nftContractAddress || '',
      };
    } else {
      console.warn(
        `Project ${project.id} does not have abc object. Skipping...`,
      );
    }
  });

  // Define the path to the projects.json file inside funding pot repo
  const filePath = path.join(
    repoLocalDir,
    'data',
    'production',
    'input',
    'projects.json',
  );

  // Ensure the directory exists
  ensureDirectoryExists(path.dirname(filePath));

  // Write the projects data to the projects.json file
  await fs.writeJson(filePath, projectsData, { spaces: 2 });

  console.info(`Projects data successfully written to ${filePath}`);
}

async function createEnvFile() {
  const envExamplePath = path.join(repoLocalDir, '.env.example'); // Path to .env.example in funding pot service
  const envFilePath = path.join(repoLocalDir, '.env'); // Path to the new .env file in funding pot service

  if (!fs.existsSync(envExamplePath)) {
    console.error(`.env.example file not found in ${envExamplePath}`);
    throw new Error('.env.example file not found');
  }

  try {
    const envExampleContent = await fs.readFile(envExamplePath, 'utf-8');

    // Replace placeholders with actual values from the service's environment
    const updatedEnvContent = envExampleContent
      .replace(
        /DELEGATE=/g,
        `DELEGATE=${config.get('DELEGATE_PK_FOR_FUNDING_POT') || ''}`,
      )
      .replace(
        'ANKR_API_KEY=""',
        `ANKR_API_KEY="${config.get('ANKR_API_KEY_FOR_FUNDING_POT') || ''}"`,
      );

    await fs.writeFile(envFilePath, updatedEnvContent, 'utf-8');
  } catch (error) {
    console.error('Error creating .env file:', error.message);
    throw error;
  }
}

// Helper function to execute a shell command
function execShellCommand(command: string, workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.info(`Executing command: "${command}" in ${workingDir}...`);

    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return reject(error);
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return reject(new Error(stderr));
      }

      console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
}

const serviceDir = path.join(repoLocalDir);

async function installDependencies() {
  console.info(`Installing npm dependencies in ${serviceDir}...`);
  await execShellCommand('npm install --loglevel=error', serviceDir);
}

async function runFundingPotService(batchNumber: number) {
  const command = 'npm run all ' + batchNumber;
  console.info(`Running "${command}" in ${serviceDir}...`);
  await execShellCommand(command, serviceDir);
}

async function getFirstRoundThatNeedExecuteBatchMinting() {
  console.info('Finding batch number based on rounds data...');
  const allEARounds = await findAllEarlyAccessRounds();

  const EARoundsNeedingBatchMinting = allEARounds
    .filter(round => {
      return !round.isBatchMintingExecuted;
    })
    .sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  // Return the first EA round that needs batch minting execution
  if (EARoundsNeedingBatchMinting.length > 0) {
    if (
      new Date(EARoundsNeedingBatchMinting[0].endDate).getTime() < Date.now()
    ) {
      return {
        batchNumber: EARoundsNeedingBatchMinting[0].roundNumber,
        isExecutedBefore: false,
      };
    }
    if (EARoundsNeedingBatchMinting[0].roundNumber === 1) {
      throw new Error('There is no finished round!');
    }
    return {
      batchNumber: EARoundsNeedingBatchMinting[0].roundNumber - 1,
      isExecutedBefore: true,
    };
  }

  // If all EA rounds have batch minting executed, move to QF rounds
  const allQfRounds = (await findQfRounds({})).sort((a, b) => {
    return new Date(a.beginDate).getTime() - new Date(b.beginDate).getTime();
  });
  const QFRoundsNeedingBatchMinting = allQfRounds.filter(round => {
    return !round.isBatchMintingExecuted;
  });

  const datasource = AppDataSource.getDataSource();
  const earlyAccessRoundRepository = datasource.getRepository(EarlyAccessRound);
  const lastEarlyAccessRound = await earlyAccessRoundRepository
    .createQueryBuilder('eaRound')
    .orderBy('eaRound.roundNumber', 'DESC')
    .getOne();
  const lastEarlyAccessRoundNumber = lastEarlyAccessRound
    ? lastEarlyAccessRound.roundNumber
    : 0;

  if (QFRoundsNeedingBatchMinting.length > 0) {
    if (
      new Date(QFRoundsNeedingBatchMinting[0].endDate).getTime() < Date.now()
    ) {
      return {
        batchNumber:
          lastEarlyAccessRoundNumber +
          (QFRoundsNeedingBatchMinting[0].roundNumber || 0),
        isExecutedBefore: false,
      };
    }
    return {
      batchNumber: lastEarlyAccessRoundNumber,
      isExecutedBefore: true,
    };
  }

  // if batch minting are executed for all rounds, return last qf round
  return {
    batchNumber:
      lastEarlyAccessRoundNumber + (allQfRounds[-1].roundNumber || 0),
    isExecutedBefore: true,
  };
}

async function setBatchMintingExecutionFlag(batchNumber: number) {
  const { round } = await getRoundByBatchNumber(batchNumber);
  round.isBatchMintingExecuted = true;
  await round.save();
}

async function main() {
  try {
    let batchDetails;
    const batchNumberFromArg = Number(process.argv[2]);
    const onlyReportFromArg = Boolean(process.argv[3]);
    if (!batchNumberFromArg) {
      batchDetails = await getFirstRoundThatNeedExecuteBatchMinting();
    }
    const batchNumber = batchNumberFromArg || batchDetails?.batchNumber;
    const onlyReport = onlyReportFromArg || batchDetails?.isExecutedBefore;
    // Step 1
    console.info('Start pulling latest version of funding pot service...');
    await pullLatestVersionOfFundingPot();
    console.info('Funding pot service updates successfully.');

    // Step 2
    console.info('Installing dependencies of funding pot service...');
    await installDependencies();
    console.info('Dependencies installed.');

    // Step 3
    console.info('Filling projects data in to the funding pot service...');
    await fillProjectsData();
    console.info('Projects data filled successfully.');

    // Step 5
    console.info('Create batch config in the funding pot service...');
    await generateBatchFile(batchNumber, onlyReport);
    console.info('Batch config created successfully.');

    // Step 4
    console.info('Creating .env file for funding pot service...');
    await createEnvFile();
    console.info('Env file created successfully.');

    // Step 5
    console.info('Running funding pot service...');
    await runFundingPotService(batchNumber);
    console.info('Funding pot service executed successfully!');

    // Step 6
    if (!onlyReport) {
      console.info('Setting batch minting execution flag in round data...');
      await setBatchMintingExecutionFlag(batchNumber);
      console.info('Batch minting execution flag set successfully.');
    }
    console.info('Done!');
    process.exit();
  } catch (error) {
    console.error('Error in running funding pot service.', error.message);
    process.exit();
  }
}

main();