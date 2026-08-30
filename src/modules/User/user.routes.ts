import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/authenticate';
import { ITokenService } from '../../infra/jwt/ITokenService';
import {
  createUserSchema,
  listUserQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './user.dto';

export function userRouter(userService: UserService, tokenService: ITokenService): Router {
  const router = Router();
  const controller = new UserController(userService);

  router.use(authenticate(tokenService));

  router.get('/', validate({ query: listUserQuerySchema }), controller.list);
  router.get('/by-account/:accountNumber', controller.getByAccountNumber);
  router.get('/by-registration/:registrationNumber', controller.getByRegistrationNumber);
  router.get('/:userId', validate({ params: userIdParamSchema }), controller.getByUserId);
  router.post('/', validate({ body: createUserSchema }), controller.create);
  router.put(
    '/:userId',
    validate({ params: userIdParamSchema, body: updateUserSchema }),
    controller.update,
  );
  router.delete(
    '/:userId',
    authorize('admin'),
    validate({ params: userIdParamSchema }),
    controller.delete,
  );

  return router;
}
