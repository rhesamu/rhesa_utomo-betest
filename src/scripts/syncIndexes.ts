import { UserModel } from '../modules/User/user.model';
import { AccountModel } from '../modules/Account/account.model';
import { runScript, scriptLogger } from './lib/runScript';

async function syncIndexes(): Promise<void> {
  for (const model of [UserModel, AccountModel]) {
    const dropped = await model.syncIndexes();
    const indexes = await model.collection.indexes();
    scriptLogger.info(
      { dropped, indexes: indexes.map((i) => i.name) },
      `[syncIndexes] ${model.modelName}`,
    );
  }
}

void runScript('syncIndexes', syncIndexes);
