import axios from 'axios';
import { assert, expect } from 'chai';
import { ArgumentValidationError } from 'type-graphql';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { User } from '../entities/user';
import {
  createProjectQuery,
  fetchMultiFilterAllProjectsQuery,
  fetchProjectBySlugQuery,
  projectByIdQuery,
  projectsByUserIdQuery,
} from '../../test/graphqlQueries';
import {
  CreateProjectInput,
  ProjectTeamMemberInput,
} from './types/project-input';
import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { ChainType } from '../types/network';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../constants/validators';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { ProjStatus, ReviewStatus } from '../entities/project';

const ARGUMENT_VALIDATION_ERROR_MESSAGE = new ArgumentValidationError([
  { property: '' },
]).message;

describe('createProject test cases --->', createProjectTestCases);
describe('projectsByUserId test cases --->', projectsByUserIdTestCases);

describe('projectBySlug test cases --->', projectBySlugTestCases);
describe('projectById test cases --->', projectByIdTestCases);
describe('projectSearch test cases --->', projectSearchTestCases);
function createProjectTestCases() {
  let user: User;
  let accessToken: string;

  beforeEach(async () => {
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);
  });

  it('should create project with team members successfully', async () => {
    assert.isOk(user);
    assert.isOk(accessToken);

    const teamMembers: ProjectTeamMemberInput[] = [
      {
        name: 'John Doe',
        image: 'https://example.com/john-doe.jpg',
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/johndoe',
        farcaster: 'https://farcaster.com/johndoe',
      },
      {
        name: 'Jane Doe',
        image: 'https://example.com/jane-doe.jpg',
        twitter: 'https://twitter.com/janedoe',
        linkedin: 'https://linkedin.com/janedoe',
        farcaster: 'https://farcaster.com/janedoe',
      },
    ];

    const projectAddress = generateRandomEtheriumAddress();
    const createProjectInput: CreateProjectInput = {
      title: 'Test Create Project 1',
      adminUserId: user.id,
      description: 'Test Project Description',
      categories: [],
      image: 'https://example.com/test-project.jpg',
      teaser: 'Test Project Text Teaser',
      impactLocation: 'Test Impact Location',
      isDraft: false,
      teamMembers,
      address: projectAddress,
    };

    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: createProjectInput,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.createProject;
    assert.isOk(project);
    expect(project.teamMembers).to.deep.equal(teamMembers);
    const expectedAbc =
      await getAbcLauncherAdapter().getProjectAbcLaunchData(projectAddress);
    expect(project.abc).to.deep.equal(expectedAbc);
  });

  it('should create project with icon successfully', async () => {
    assert.isOk(user);
    assert.isOk(accessToken);

    const projectAddress = generateRandomEtheriumAddress();
    const createProjectInput: CreateProjectInput = {
      title: 'Test Project with Icon',
      adminUserId: user.id,
      description: 'A project to test icon field',
      categories: [],
      image: 'https://example.com/test-project.jpg',
      teaser: 'Test Project Teaser',
      impactLocation: 'Test Location',
      isDraft: false,
      address: projectAddress,
      icon: 'https://example.com/test-icon.jpg',
    };

    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: createProjectInput,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.createProject;
    assert.isOk(project);
    expect(project.icon).to.equal(createProjectInput.icon);
  });

  it('should not create projects with same slug and title', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const sampleProject1 = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const sampleProject2 = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const res1 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const res2 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject2,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const isRes1Ok = !!res1.data.data?.createProject;
    const isRes2Ok = !!res2.data.data?.createProject;
    assert.isTrue(isRes1Ok);
    assert.isFalse(isRes2Ok);
  });
  it('Create Project should return <<Access denied>>, calling without token IN ENGLISH when no-lang header is sent', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {},
    );

    assert.equal(result.status, 200);
    // default is english so it will match
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token IN ENGLISH when non supported language is sent', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'br',
        },
      },
    );

    assert.equal(result.status, 200);
    // default is english so it will match
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token IN SPANISH', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'es',
        },
      },
    );
    i18n.setLocale('es'); // for the test translation scope
    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'en',
        },
      },
    );

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should not get error, when sending one recipient address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [
        SEED_DATA.FOOD_SUB_CATEGORIES[0],
        SEED_DATA.FOOD_SUB_CATEGORIES[1],
      ],
      description: '<div>Sample Project Creation</div>',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.createProject);
    assert.equal(
      result.data.data.createProject.descriptionSummary,
      'Sample Project Creation',
    );
  });
  it('should create project when walletAddress of project is a smart contract address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(addProjectResponse.data.data.createProject);
    assert.equal(
      addProjectResponse.data.data.createProject.title,
      sampleProject.title,
    );
  });

  it('Should get error on too long description and title', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      // Too long description
      description: 'a'.repeat(PROJECT_DESCRIPTION_MAX_LENGTH + 1),
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    let result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );

    // too long title
    sampleProject.title = 'a'.repeat(PROJECT_TITLE_MAX_LENGTH + 1);
    sampleProject.description = 'description';
    result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );
  });

  it('Should create successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);
    assert.equal(
      result.data.data.createProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );

    assert.equal(
      result.data.data.createProject.adminUser.id,
      SEED_DATA.FIRST_USER.id,
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.active),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );

    assert.equal(
      result.data.data.createProject.adminUser.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.equal(result.data.data.createProject.image, sampleProject.image);
    assert.equal(
      result.data.data.createProject.creationDate,
      result.data.data.createProject.updatedAt,
    );
    assert.equal(result.data.data.createProject.addresses.length, 1);
    assert.equal(
      result.data.data.createProject.addresses[0].address,
      sampleProject.address,
    );
    assert.equal(
      result.data.data.createProject.addresses[0].chainType,
      ChainType.EVM,
    );
  });
  it('Should create successfully with special characters in title', async () => {
    const titleWithoutSpecialCharacters = 'title-_' + new Date().getTime();
    const sampleProject: CreateProjectInput = {
      title: titleWithoutSpecialCharacters + `?!@#$%^&*+=.|/<">'` + '`',
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.slug,
      titleWithoutSpecialCharacters,
    );
  });

  it('Should create draft successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'draftTitle1 ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      isDraft: true,
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);
    assert.equal(
      result.data.data.createProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );

    assert.equal(
      result.data.data.createProject.adminUserId,
      SEED_DATA.FIRST_USER.id,
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.drafted),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );
  });
}

function projectsByUserIdTestCases() {
  it('should return projects with specific admin', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    const projectWithAnotherOwner = projects.find(
      project => project.adminUserId !== userId,
    );
    assert.isNotOk(projectWithAnotherOwner);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNull(project.projectVerificationForm);
      assert.isNotOk(project.adminUser.email);
    });
  });

  it('should return projects with current take', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        take,
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects.length, take);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });
}

function projectByIdTestCases() {
  it('should return project with id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.equal(result.data.data.projectById.slug, project.slug);
    assert.isNotEmpty(result.data.data.projectById.addresses);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
    assert.isOk(result.data.data.projectById.categories[0].mainCategory.title);
  });
  it('should return error for invalid id', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        // To make use id is invalid
        id: 9999999,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should not return reaction when user doesnt exist', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,

        // To make sure there is no user with that Id
        connectedWalletUserId: 9999999,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
    assert.isNotOk(result.data.data.projectById.reaction);
  });
  it('should not return reaction when user didnt like the project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
        connectedWalletUserId: user.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isNotOk(result.data.data.projectById.reaction);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
  });
  it('should not return drafted projects if not logged in', async () => {
    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: draftedProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return drafted projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), draftedProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });
  it('should not return drafted project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });

  it('should not return cancelled projects if not logged in', async () => {
    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: cancelledProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return cancelled projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), cancelledProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });
  it('should not return cancelled project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
}

function projectSearchTestCases() {
  it('should return projects with a typo in the end of searchTerm', async () => {
    const limit = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        // Typo in the title
        searchTerm: SEED_DATA.SECOND_PROJECT.title.slice(0, -1) + 'a',
        connectedWalletUserId: USER_DATA.id,
      },
    });

    const projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.equal(projects[0].title, SEED_DATA.SECOND_PROJECT.title);
    assert.equal(projects[0].slug, SEED_DATA.SECOND_PROJECT.slug);
    assert.equal(projects[0].id, SEED_DATA.SECOND_PROJECT.id);
  });

  it('should return projects with the project title inverted in the searchTerm', async () => {
    const limit = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        searchTerm: SEED_DATA.SECOND_PROJECT.title
          .split(' ')
          .reverse()
          .join(' '),
        connectedWalletUserId: USER_DATA.id,
      },
    });

    const projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.equal(projects[0].title, SEED_DATA.SECOND_PROJECT.title);
    assert.equal(projects[0].slug, SEED_DATA.SECOND_PROJECT.slug);
    assert.equal(projects[0].id, SEED_DATA.SECOND_PROJECT.id);
  });
}

function projectBySlugTestCases() {
  it('should return projects with indicated slug and verification form status if owner', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const user = (await User.findOne({
      where: {
        id: project1.adminUserId,
      },
    })) as User;

    const accessToken = await generateTestAccessToken(user!.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: project1.slug,
          connectedWalletUserId: user!.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isOk(project.categories[0].mainCategory.title);
  });

  it('should return projects with indicated slug', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const sampleProject1 = {
      title: walletAddress,
      adminUserId: SEED_DATA.FIRST_USER.id,
      address: walletAddress,
    };
    const res1 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const _project = res1.data.data.createProject;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: _project.slug,
      },
    });
    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), Number(_project.id));
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isNotEmpty(project.addresses);
    assert.equal(project.addresses[0].address, walletAddress);
    assert.equal(project.addresses[0].chainType, ChainType.EVM);
  });
}
