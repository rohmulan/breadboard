import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { BoardServerStore } from "../store.js";
import type { BoardId } from "../types.js";

export function parseBoardId(opts?: { addJsonSuffix?: boolean }) {
  return (req: Request, res: Response, next: NextFunction) => {
    let { user = "", name = "" } = req.params;
    if (!!opts?.addJsonSuffix) {
      name += ".json";
    }
    let boardId: BoardId = {
      user,
      name,
    };
    res.locals.boardId = boardId;
    next();
  };
}

export function loadBoard(opts?: { addJsonSuffix?: boolean }): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let name = req.params.name;
      if (!name) {
        res.sendStatus(400);
        return;
      }
      if (opts?.addJsonSuffix) {
        name += ".json";
      }

      const store: BoardServerStore = res.app.locals.store;
      const board = await store.loadBoard({
        name,
        owner: req.params.user,
        requestingUserId: res.locals.userId,
      });
      if (board) {
        res.locals.loadedBoard = board;
      }
      next();
    } catch (e) {
      if (e instanceof Error) {
        const errorMessage = e.message;
        console.log("Catch error while loading boards with error message: %s", errorMessage);
        if (errorMessage.includes("No credential present in the request")) {
          res.sendStatus(403);
        } else if (errorMessage.includes("No owner specified in the request")) {
          res.sendStatus(400);
        } else if (errorMessage.includes("Requestor does not match with the board owner")) {
          res.sendStatus(401);
        }
      }
      next(e);
    }
  };
}
