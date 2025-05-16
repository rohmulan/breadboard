/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServerRunConfig, ServerRunRequest } from "./types.js";
import { run } from "../harness/run.js";
import { OutputValues } from "../types.js";
import { timestamp } from "../timestamp.js";
import { createRunStateManager } from "../run/index.js";
import { inflateData } from "../data/inflate-deflate.js";
import { DiagnosticsFilter } from "./diagnostics-filter.js";

export const handleRunGraphRequest = async (
  request: ServerRunRequest,
  config: ServerRunConfig
): Promise<void> => {
  const {
    url,
    kits,
    writer,
    loader,
    dataStore,
    stateStore,
    inputs: defaultInputs,
    graph,
    graphStore,
  } = config;
  const { next, inputs, diagnostics = false } = request;
  console.dir(inputs);
  let inputsToConsume = next ? undefined : inputs;
  if (next) {
    console.log("Next ticket %s present in the request, resume from previous run state", next);
  }

  const resumeFrom = await stateStore?.load(next);

  const state = createRunStateManager(resumeFrom, inputs);

  const runner = run({
    runner: graph,
    url,
    kits,
    loader,
    store: dataStore,
    inputs: defaultInputs,
    interactiveSecrets: false,
    diagnostics,
    state,
    graphStore,
  });

  const filter = new DiagnosticsFilter(writer, diagnostics);

  for await (const result of runner) {
    const { type, data, reply } = result;
    console.log("Printing each run result from runner...");
    switch (type) {
      case "graphstart": {
        await filter.writeGraphStart(data);
        break;
      }
      case "graphend": {
        await filter.writeGraphEnd(data);
        break;
      }
      case "nodestart": {
        await filter.writeNodeStart(data);
        break;
      }
      case "nodeend": {
        await filter.writeNodeEnd(data);
        break;
      }
      case "skip": {
        await filter.writeSkip(data);
        break;
      }
      case "edge": {
        await filter.writeEdge(data);
        break;
      }
      case "input": {
        console.log("input state from runner...");
        if (inputsToConsume && Object.keys(inputsToConsume).length > 0) {
          await reply({ inputs: inputsToConsume });
          inputsToConsume = undefined;
          break;
        } else {
          const reanimationState = state.lifecycle().reanimationState();
          console.log("Prepare store the state")
          const next = await stateStore.save(reanimationState);
          console.log("Require user input, store the current reanimation state in store with ticket %s", next);
          // await filter.writeInput(data, next);
          // Test write response
          // await filter.writeInput(data, "Test to write some data here");
          await filter.writeInputWithState(data, next, reanimationState);
          // We also wanna write the reanimation state here
          await writer.close();
          return;
        }
      }
      case "output": {
        const outputs = (await inflateData(
          dataStore,
          data.outputs
        )) as OutputValues;
        await filter.writeOutput({ ...data, outputs });
        break;
      }
      case "error": {
        await filter.writeError(data);
        await writer.close();
        return;
      }
      case "end": {
        await filter.writeEnd(data);
        await writer.close();
        return;
      }
      default: {
        console.log("Unknown type", type, data);
      }
    }
  }
  await writer.write([
    "error",
    {
      error: "Run completed without signaling end or error.",
      timestamp: timestamp(),
    },
  ]);
};
