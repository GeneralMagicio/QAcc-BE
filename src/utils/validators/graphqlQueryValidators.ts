import { CustomHelpers, number, ObjectSchema, ValidationResult } from 'joi';
// tslint:disable-next-line:no-var-requires
const Joi = require('joi');
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../errorMessages';
import { NETWORK_IDS } from '../../provider';
import { DONATION_STATUS } from '../../entities/donation';
import { PROJECT_VERIFICATION_STATUSES } from '../../entities/projectVerificationForm';
import { countriesList } from '../utils';

const filterDateRegex = new RegExp('^[0-9]{8} [0-9]{2}:[0-9]{2}:[0-9]{2}$');
const resourcePerDateRegex = new RegExp(
  '((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])',
);

const ethereumWalletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
const tokenSymbolRegex = /^[a-zA-Z0-9]{3,10}$/;

export const validateWithJoiSchema = (data: any, schema: ObjectSchema) => {
  const validationResult = schema.validate(data);
  throwHttpErrorIfJoiValidatorFails(validationResult);
};

const throwHttpErrorIfJoiValidatorFails = (
  validationResult: ValidationResult,
) => {
  if (validationResult.error) {
    throw new Error(validationResult.error.details[0].message);
  }
};

const projectIdValidator = Joi.number().integer().min(0).required();

export const getDonationsQueryValidator = Joi.object({
  fromDate: Joi.string()
    .pattern(filterDateRegex)
    .messages({
      'string.base': i18n.__(translationErrorMessagesKeys.INVALID_FROM_DATE),
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.INVALID_DATE_FORMAT,
      ),
    }),

  toDate: Joi.string()
    .pattern(filterDateRegex)
    .messages({
      'string.base': i18n.__(translationErrorMessagesKeys.INVALID_TO_DATE),
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.INVALID_DATE_FORMAT,
      ),
    }),
});

export const resourcePerDateReportValidator = Joi.object({
  fromDate: Joi.string()
    .allow(null, '')
    .pattern(resourcePerDateRegex)
    .messages({
      'string.base': errorMessages.INVALID_FROM_DATE,
      'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
    }),

  toDate: Joi.string().allow(null, '').pattern(resourcePerDateRegex).messages({
    'string.base': errorMessages.INVALID_TO_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),
});

export const createDonationQueryValidator = Joi.object({
  amount: Joi.number()?.greater(0).required(),
  transactionId: Joi.string()
    .required()
    .pattern(txHashRegex)
    .messages({
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.INVALID_TRANSACTION_ID,
      ),
    }),
  transactionNetworkId: Joi.string()
    .required()
    .valid(...Object.values(NETWORK_IDS)),
  tokenAddress: Joi.string().pattern(ethereumWalletAddressRegex),
  token: Joi.string()
    .required()
    .pattern(tokenSymbolRegex)
    .messages({
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.CURRENCY_IS_INVALID,
      ),
      'string.base': i18n.__(translationErrorMessagesKeys.CURRENCY_IS_INVALID),
    }),
  projectId: Joi.number().integer().min(0).required(),
  nonce: Joi.number().integer().min(0).required(),
  anonymous: Joi.boolean(),
  transakId: Joi.string(),
  referrerId: Joi.string().allow(null, ''),
});

export const updateDonationQueryValidator = Joi.object({
  donationId: Joi.number().integer().min(0).required(),
  status: Joi.string().valid(DONATION_STATUS.VERIFIED, DONATION_STATUS.FAILED),
});

export const createProjectVerificationRequestValidator = Joi.object({
  slug: Joi.string().required(),
});

export const getCurrentProjectVerificationRequestValidator = Joi.object({
  slug: Joi.string().required(),
});

const projectPersonalInfoValidator = Joi.object({
  fullName: Joi.string(),
  walletAddress: Joi.string(),
  email: Joi.string(),
});

const projectRegistryValidator = Joi.object({
  isNonProfitOrganization: Joi.boolean(),
  organizationCountry: Joi.string().valid(
    // We allow country to be empty string
    '',
    ...countriesList.map(({ name, code }) => name),
  ),
  organizationWebsite: Joi.string().allow(''),
  organizationDescription: Joi.string().allow(''),
  organizationName: Joi.string().allow(''),
  attachments: Joi.array()?.items(Joi.string()).max(5),
});

const projectContactsValidator = Joi.array().items(
  Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required(),
  }),
);

const milestonesValidator = Joi.object({
  foundationDate: Joi.date().allow(''),
  mission: Joi.string().allow(''),
  achievedMilestones: Joi.string().allow(''),
  achievedMilestonesProofs: Joi.array()?.items(Joi.string()).max(5),
  problem: Joi.string().allow(''),
  plans: Joi.string().allow(''),
  impact: Joi.string().allow(''),
});

const managingFundsValidator = Joi.object({
  description: Joi.string().required(),
  relatedAddresses: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      address: Joi.string().required().pattern(ethereumWalletAddressRegex),
      networkId: Joi.number()?.valid(
        NETWORK_IDS.MAIN_NET,
        NETWORK_IDS.ROPSTEN,
        NETWORK_IDS.GOERLI,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.CELO,
        NETWORK_IDS.CELO_ALFAJORES,
        // NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.XDAI,
      ),
    }),
  ),
});

export const updateProjectVerificationProjectPersonalInfoStepValidator =
  Joi.object({
    personalInfo: projectPersonalInfoValidator,
  });

export const updateProjectVerificationProjectContactsStepValidator = Joi.object(
  {
    projectContacts: projectContactsValidator,
  },
);

export const updateProjectVerificationProjectRegistryStepValidator = Joi.object(
  {
    projectRegistry: projectRegistryValidator,
  },
);

export const updateProjectVerificationManagingFundsStepValidator = Joi.object({
  managingFunds: managingFundsValidator,
});

export const updateProjectVerificationMilestonesStepValidator = Joi.object({
  milestones: milestonesValidator,
});

export const updateProjectVerificationTermsAndConditionsStepValidator =
  Joi.object({
    isTermAndConditionsAccepted: Joi.boolean().required(),
  });

export const submitProjectVerificationStepValidator = Joi.object({
  isTermAndConditionsAccepted: Joi.boolean().required().valid(true),
  socialProfiles: Joi.array().required().min(0),
  // socialProfiles: Joi.array().required().min(1).messages({
  //   'string.base':
  //     i18n.__(translationErrorMessagesKeys.SHOULD_HAVE_AT_LEAST_ONE_CONNECTED_SOCIAL_NETWORK_BEFORE_SUBMIT),
  // }),
  status: Joi.string().required().valid(PROJECT_VERIFICATION_STATUSES.DRAFT),
  emailConfirmed: Joi.boolean().required().valid(true),
  projectContacts: projectContactsValidator,
  milestones: milestonesValidator,
  managingFunds: managingFundsValidator,
  projectRegistry: projectRegistryValidator,
  personalInfo: projectPersonalInfoValidator,
});
