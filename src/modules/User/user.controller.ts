import { z } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { UserService } from './user.service';
import {
  CreateUserDto,
  ListUserQueryDto,
  UpdateUserDto,
  userIdParamSchema,
  accountNumberParamSchema,
  registrationNumberParamSchema,
} from './user.dto';

type UserIdParams = z.infer<typeof userIdParamSchema>;
type AccountNumberParams = z.infer<typeof accountNumberParamSchema>;
type RegistrationNumberParams = z.infer<typeof registrationNumberParamSchema>;

export class UserController {
  constructor(private readonly userService: UserService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? {}) as ListUserQueryDto;
      const result = await this.userService.list(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getByUserId = async (
    req: Request<UserIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await this.userService.getByUserId(req.params.userId);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  };

  getByAccountNumber = async (
    req: Request<AccountNumberParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await this.userService.getByAccountNumber(req.params.accountNumber);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  };

  getByRegistrationNumber = async (
    req: Request<RegistrationNumberParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await this.userService.getByRegistrationNumber(req.params.registrationNumber);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.create(req.body as CreateUserDto);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request<UserIdParams>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.update(req.params.userId, req.body as UpdateUserDto);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request<UserIdParams>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.userService.delete(req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
