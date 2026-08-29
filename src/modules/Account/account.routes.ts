import { Router } from 'express';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/authenticate';
import { ITokenService } from '../../infra/jwt/ITokenService';
import {
  accountIdParamSchema,
  createAccountSchema,
  listAccountQuerySchema,
  staleAccountQuerySchema,
  updateAccountSchema,
} from './account.dto';

export function accountRouter(accountService: AccountService, tokenService: ITokenService): Router {
  const router = Router();
  const controller = new AccountController(accountService);

  router.get(
    '/',
    authenticate(tokenService),
    authorize('admin'),
    validate({ query: listAccountQuerySchema }),
    controller.list,
  );
  router.get(
    '/stale',
    authenticate(tokenService),
    authorize('admin'),
    validate({ query: staleAccountQuerySchema }),
    controller.listStale,
  );
  router.get(
    '/:accountId',
    authenticate(tokenService),
    validate({ params: accountIdParamSchema }),
    controller.getByAccountId,
  );
  router.post('/', validate({ body: createAccountSchema }), controller.create);
  router.put(
    '/:accountId',
    authenticate(tokenService),
    validate({ params: accountIdParamSchema, body: updateAccountSchema }),
    controller.update,
  );
  router.delete(
    '/:accountId',
    authenticate(tokenService),
    validate({ params: accountIdParamSchema }),
    controller.delete,
  );

  return router;
}
