import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body as LoginDto);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // To confirm a token is valid.
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ account: req.auth });
    } catch (err) {
      next(err);
    }
  };
}
