import { TokenHolder } from '../entities/tokenHolder';

export const findAllTokenHolders = async (): Promise<TokenHolder[]> => {
  return TokenHolder.find({
    order: {
      projectName: 'ASC',
      tag: 'ASC',
    },
  });
};

export const findTokenHolderById = async (
  id: number,
): Promise<TokenHolder | null> => {
  return TokenHolder.findOne({
    where: { id },
  });
};

export const findTokenHoldersByProjectName = async (
  projectName: string,
): Promise<TokenHolder[]> => {
  return TokenHolder.find({
    where: { projectName },
    order: {
      tag: 'ASC',
    },
  });
};

export const findTokenHoldersByAddress = async (
  address: string,
): Promise<TokenHolder[]> => {
  return TokenHolder.find({
    where: { address },
    order: {
      projectName: 'ASC',
    },
  });
};
