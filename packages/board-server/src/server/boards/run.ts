/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response } from "express";

import type { RemoteMessage} from "@google-labs/breadboard/remote";
import type { ReanimationState } from "@google-labs/breadboard";

import type { ServerConfig } from "../config.js";
import { secretsKit } from "../proxy/secrets.js";
import { asPath } from "../store.js";

import { createBoardLoader } from "./utils/board-server-provider.js";
import { runBoard, timestamp } from "./utils/run-board.js";
import { verifyKey } from "./utils/verify-key.js";
import type { BoardServerStore } from "../store.js";
import type { BoardId } from "../types.js";
import {InMemoryStorageProvider} from "../storage-providers/inmemory.js";
import { gemini, type TextCapabilityPart } from "./gemini.js";



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
    $userInput: userInput,
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
  if (state && next) {
    console.log("Reanimation state is present in the request body and printing the state");
    console.dir(state);
    // {
    //   states: { '': { state: [Object], path: [Array] } },
    //   visits: [ [ 'input-04eae35b', [Array] ] ]
    // }
    // We do not need the userId for state anymore, use the $next token(UUID) as key for state
    await store.saveReanimationStateWithTicket!(next, state);
  }

  // const stateDataInString: string = '{"states":{"":{"state":"{\\"state\\":{\\"descriptor\\":{\\"id\\":\\"input-04eae35b\\",\\"type\\":\\"input\\",\\"metadata\\":{\\"visual\\":{\\"x\\":-507,\\"y\\":-351,\\"collapsed\\":\\"expanded\\"},\\"title\\":\\"Input\\"},\\"configuration\\":{\\"schema\\":{\\"properties\\":{\\"context\\":{\\"type\\":\\"array\\",\\"title\\":\\"Context\\",\\"items\\":{\\"type\\":\\"object\\",\\"examples\\":[],\\"behavior\\":[\\"llm-content\\"]},\\"default\\":\\"[{\\\\"role\\\\":\\\\\\"user\\\\",\\\\\\"parts\\\\":[{\\\\"text\\\\":\\\\\\"\\\\\\"}]}]\\"}},\\"type\\":\\"object\\",\\"required\\":[]}}},\\"inputs\\":{\\"schema\\":{\\"properties\\":{\\"context\\":{\\"type\\":\\"array\\",\\"title\\":\\"Context\\",\\"items\\":{\\"type\\":\\"object\\",\\"examples\\":[],\\"behavior\\":[\\"llm-content\\"]},\\"default\\":\\"[{\\\\"role\\\\":\\\\\\"user\\\\",\\\\\\"parts\\\\":[{\\\\"text\\\\":\\\\\\"\\\\\\"}]}]\\"}},\\"type\\":\\"object\\",\\"required\\":[]}},\\"missingInputs\\":[],\\"current\\":{\\"from\\":\\"$entry\\",\\"to\\":\\"input-04eae35b\\"},\\"opportunities\\":[],\\"newOpportunities\\":[{\\"from\\":\\"input-04eae35b\\",\\"to\\":\\"output-36b2e0d0\\",\\"out\\":\\"context\\",\\"in\\":\\"context\\"}],\\"state\\":{\\"state\\":{\\"$type\\":\\"Map\\",\\"value\\":[]},\\"constants\\":{\\"$type\\":\\"Map\\",\\"value\\":[]}}},\\"type\\":\\"nodestart\\"}","path":[1]}},"visits":[["input-04eae35b",[1]]]}';
  // convertJsonStringToJson(stateDataInString);

  // To resume execution from a previous state, we need to input the previous reanimation state
  // And we need to give a next token as UUID for system to know that is the state we are going to use

  // POC to use fetch to call gemini...
  // userInput:
  // How are you doing
  // Can you tell me a joke about Tom and Jerry
  // Can you generate some python code to generate UUID
  // Can you generate some python code for me to get cuurent local time string?

  // const geminiResult = await gemini([], "not used", "user who you want to meet");
  // const output = geminiResult.candidates? geminiResult.candidates[0]?.content: undefined;
  // const textData = (output!.parts[0] as TextCapabilityPart).text;
  // console.dir("Printing gemini result");
  // console.dir(textData);
  // const cleanedText = textData.replace(/```json\n?|```/g, '').trim();
  // const jsData = JSON.parse(cleanedText);
  // console.log("Print json")
  // console.dir(jsData);
  

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

function convertJsonStringToJson(data: string): object {
  const jsonObject = JSON.parse(data);
  console.log("Print json object");
  console.dir(jsonObject);
  return jsonObject;
}

export default runHandler;
