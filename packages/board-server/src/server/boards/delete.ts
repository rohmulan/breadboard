/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextFunction, Request, Response } from "express";

import { type BoardServerStore, InvalidRequestError} from "../store.js";

async function del(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const store: BoardServerStore = req.app.locals.store;
  const boardName: string = req.params.name ?? (() => { throw new Error("Board name is required"); })();
  const userId: string = res.locals.userId;
  try {
    await store.deleteBoard(userId, boardName);
    res.sendStatus(200);
  } catch (e) {
    if (e instanceof Error) {
      res.statusMessage = e.message;
      res.sendStatus(400);
    } 
    return;
  }
  return;
}

export default del;
