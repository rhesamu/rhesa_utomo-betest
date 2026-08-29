import { z } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { AccountService } from './account.service';
import {
  CreateAccountDto,
  ListAccountQueryDto,
  StaleAccountQueryDto,
  UpdateAccountDto,
  accountIdParamSchema,
} from './account.dto';

type AccountIdParams = z.infer<typeof accountIdParamSchema>;

export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? {}) as ListAccountQueryDto;
      const result = await this.accountService.list(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  listStale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? {}) as StaleAccountQueryDto;
      const result = await this.accountService.listStale(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getByAccountId = async (
    req: Request<AccountIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const account = await this.accountService.getByAccountId(req.params.accountId);
      res.status(200).json(account);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await this.accountService.create(req.body as CreateAccountDto);
      res.status(201).json(account);
    } catch (err) {
      next(err);
    }
  };

  update = async (
    req: Request<AccountIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const account = await this.accountService.update(
        req.params.accountId,
        req.body as UpdateAccountDto,
      );
      res.status(200).json(account);
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: Request<AccountIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.accountService.delete(req.params.accountId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
