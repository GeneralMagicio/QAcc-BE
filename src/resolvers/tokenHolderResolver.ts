import { Arg, Int, Query, Resolver } from 'type-graphql';
import { TokenHolder } from '../entities/tokenHolder';
import {
  findAllTokenHolders,
  findTokenHolderById,
  findTokenHoldersByProjectName,
  findTokenHoldersByAddress,
} from '../repositories/tokenHolderRepository';

@Resolver(_of => TokenHolder)
export class TokenHolderResolver {
  @Query(_returns => [TokenHolder])
  async tokenHolders(): Promise<TokenHolder[]> {
    return findAllTokenHolders();
  }

  @Query(_returns => TokenHolder, { nullable: true })
  async tokenHolder(
    @Arg('id', _type => Int) id: number,
  ): Promise<TokenHolder | null> {
    return findTokenHolderById(id);
  }

  @Query(_returns => [TokenHolder])
  async tokenHoldersByProject(
    @Arg('projectName') projectName: string,
  ): Promise<TokenHolder[]> {
    return findTokenHoldersByProjectName(projectName);
  }

  @Query(_returns => [TokenHolder])
  async tokenHoldersByAddress(
    @Arg('address') address: string,
  ): Promise<TokenHolder[]> {
    return findTokenHoldersByAddress(address);
  }
}
