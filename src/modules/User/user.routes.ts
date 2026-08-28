import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { validate } from '../../middlewares/validate';
import {
  createUserSchema,
  listUserQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './user.dto';

export function userRouter(userService: UserService): Router {
  const router = Router();
  const controller = new UserController(userService);

  // TODO: Add `authenticate` middlewarein front of every route

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
  router.delete('/:userId', validate({ params: userIdParamSchema }), controller.delete);

  return router;
}