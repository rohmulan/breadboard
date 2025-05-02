/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response } from "express";

import type { RemoteMessage } from "@google-labs/breadboard/remote";

import type { ServerConfig } from "../config.js";
import { secretsKit } from "../proxy/secrets.js";
import { asPath } from "../store.js";

import { createBoardLoader } from "./utils/board-server-provider.js";
import { runBoard, timestamp } from "./utils/run-board.js";
import { verifyKey } from "./utils/verify-key.js";
import type { BoardServerStore } from "../store.js";
import type { BoardId } from "../types.js";
import {InMemoryStorageProvider} from "../storage-providers/inmemory.js";



async function runHandler(
  config: ServerConfig,
  req: Request,
  res: Response
): Promise<void> {
  console.log("Starting point of runBoard API...");
  const store: BoardServerStore = req.app.locals.store;

  console.log("Printing BoardServerStore from request for run board API and check whether its type is inmemory store %s", store instanceof InMemoryStorageProvider);
  console.log("Printing the run board request to check what it looks like...");
  // console.dir(req);

  const boardId: BoardId = res.locals.boardId;
  const path = asPath(boardId.user, boardId.name);

  const serverUrl = (await store.getServerInfo())?.url ?? "";

  const url = new URL(req.url, config.hostname);
  url.pathname = `boards/${path}`;
  url.search = "";

  const {
    $next: next,
    $diagnostics: diagnostics,
    $board: board,
    $state: state,
    ...inputs
  } = req.body as Record<string, any>;
  console.log("The next token(resume ticket) is from the request body %s", next);
  const writer = new WritableStream<RemoteMessage>({
    write(chunk) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    },
  }).getWriter();
  res.setHeader("Content-Type", "text/event-stream");
  res.statusCode = 200;

  // const userId = await verifyKey(inputs, store);
  // Fetch the key from request token
  const userId = res.locals.userId;
  console.log("Get userId from request token: %s", userId);

  if (!userId) {
    await writer.write([
      "graphstart",
      {
        path: [],
        timestamp: timestamp(),
        graph: { nodes: [], edges: [] },
        graphId: "",
      },
    ]);
    await writer.write([
      "error",
      { error: "Invalid or missing key", code: 403, timestamp: timestamp() },
    ]);
    await writer.write([
      "graphend",
      {
        path: [],
        timestamp: timestamp(),
      },
    ]);
    await writer.close();
    res.end();
    return;
  }

  if (board) {
    console.log("Board data is present in the request body and printing the board object");
    console.dir(board);
    await store.upsertBoard({
      name: boardId.name,
      owner: userId,
      displayName: board.title || boardId.name,
      description: board.description ?? "",
      tags: board.metadata?.tags ?? [],
      thumbnail: "",
      graph: board,
    });
  }
  // if (state) {

  // }
  // TODO(jimmyxing)
  // Store the reanimation state as well...

  await runBoard({
    serverUrl,
    url: url.href,
    path,
    user: userId,
    inputs,
    loader: createBoardLoader(store, userId),
    kitOverrides: [secretsKit],
    writer,
    next,
    runStateStore: store,
    diagnostics,
  });
  // await writer.close();
  res.end();
}

export default runHandler;
