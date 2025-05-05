/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GraphDescriptor,
  LLMContent,
  NodeConfiguration,
  NodeDescriptor,
} from "@breadboard-ai/types";
import type {
  AppCatalystApiClient,
  AppCatalystChatRequest,
} from "./app-catalyst.js";
import {
  isLLMContent,
  isTextCapabilityPart,
  Template,
} from "@google-labs/breadboard";
import {
  type AgentspaceFlowContent,
} from "../contexts/agentspace-url-context.js";

export interface OneShotFlowGenRequest {
  intent: string;
  context?: {
    flow?: GraphDescriptor;
  };
  constraint?: FlowGenConstraint;
  agentspaceFlowContext?: AgentspaceFlowContent;
}

export interface OneShotFlowGenResponse {
  flow: GraphDescriptor;
}

export type FlowGenConstraint = EditStepFlowGenConstraint;

export type EditStepFlowGenConstraint = {
  kind: "EDIT_STEP_CONFIG";
  stepId: string;
};

export interface SystemInstructionParams {
  agentName?: string;
  agentGoal?: string;
  agentInstructions?: string;
}

// Input the system instruction from url
const FIXED_SYSTEM_INSTRUCTIONS = `
**Use your knowledge, creativity and common sense:**
  `;

export class FlowGenerator {

  #appCatalystApiClient: AppCatalystApiClient;

  constructor(appCatalystApiClient: AppCatalystApiClient) {
    this.#appCatalystApiClient = appCatalystApiClient;
  }

  async oneShot({
    intent,
    context,
    constraint,
    agentspaceFlowContext,
  }: OneShotFlowGenRequest): Promise<OneShotFlowGenResponse> {
    if (constraint && !context?.flow) {
      throw new Error(
        `Error editing flow with constraint ${constraint.kind}:` +
          ` An original flow was not provided.`
      );
    }
    if (intent.startsWith("/force error ")) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      throw new Error(intent.slice("/force error ".length));
    }
    const params: SystemInstructionParams = {
      agentName: agentspaceFlowContext?.agentName,
      agentGoal: agentspaceFlowContext?.agentGoal,
      agentInstructions: agentspaceFlowContext?.agentInstructions
    }
    console.log("Printing system instruction params in oneShot");
    console.dir(params);
    const request: AppCatalystChatRequest = {
      messages: [
        {
          mimetype: "text/plain",
          data: btoa(unescape(encodeURIComponent(intent))),
        },
      ],
      appOptions: {
        format: "FORMAT_AGENT_SPACE",
        agent_config: {
          search_engine_resource_name: agentspaceFlowContext?.engineName || '',
          system_instruction: this.#buildSystemInstruction(params),
        },
      },
    };
    if (context?.flow) {
      const stringifiedFlow = JSON.stringify(context.flow);
      request.messages.push({
        mimetype: "text/breadboard",
        data: btoa(unescape(encodeURIComponent(stringifiedFlow))),
      });
    }
    if (constraint) {
      request.messages.push({
        mimetype: "text/plain",
        data: btoa(
          unescape(
            encodeURIComponent(
              this.#promptForConstraint(constraint, context!.flow!)
            )
          )
        ),
      });
    }

    const { messages } = await this.#appCatalystApiClient.chat(request);
    console.log(
      `[flowgen] AppCatalyst responses:`,
      ...messages.map((message) => ({ ...message, data: atob(message.data) }))
    );
    const responseFlows: GraphDescriptor[] = [];
    const responseMessages: string[] = [];
    for (
      let i = /* Skip our own messages */ request.messages.length;
      i < messages.length;
      i++
    ) {
      const message = messages[i];
      if (message.mimetype === "text/breadboard") {
        responseFlows.push(JSON.parse(atob(message.data)));
      } else if (message.mimetype === "text/plain") {
        responseMessages.push(atob(message.data));
      }
    }
    const generatedFlow = responseFlows.at(-1);
    if (!generatedFlow) {
      // If the backend can't make a flow, it will usually return some text
      // explaining why.
      const probableErrorMessage = responseMessages.join("\n\n");
      if (probableErrorMessage) {
        // TODO(aomarks) This shouldn't be an exception, it's a very normal part
        // of the expected flow. Return a more detailed result object instead.
        throw new Error(probableErrorMessage);
      }
      throw new Error(
        `Unexpected error: backend did not return a response. Please try again.`
      );
    }

    if (constraint) {
      return {
        flow: this.#applyConstraint(constraint, context!.flow!, generatedFlow),
      };
    }
    return { flow: generatedFlow };
  }

  #promptForConstraint(
    constraint: FlowGenConstraint,
    originalFlow: GraphDescriptor
  ) {
    switch (constraint.kind) {
      case "EDIT_STEP_CONFIG": {
        const originalStep = findStepById(originalFlow, constraint.stepId);
        if (!originalStep) {
          throw new Error(
            `Error creating prompt for ${constraint.kind} constraint:` +
              ` An original step was not found` +
              ` with ID ${JSON.stringify(constraint.stepId)}.`
          );
        }
        const title = originalStep?.metadata?.title;
        if (!title) {
          throw new Error(
            `Error creating prompt for ${constraint.kind} constraint:` +
              ` Original step did not have a title` +
              ` with ID ${JSON.stringify(constraint.stepId)}.`
          );
        }
        return (
          `IMPORTANT: You MUST edit the configuration ONLY for Step "${title}". ` +
          ` You MUST NOT change the step name or output name in any way.` +
          ` Do not change any other steps or metadata in the app.`
        );
      }
      default: {
        constraint.kind satisfies never;
        throw new Error(`Unexpected constraint: ${JSON.stringify(constraint)}`);
      }
    }
  }

  #applyConstraint(
    constraint: FlowGenConstraint,
    originalFlow: GraphDescriptor,
    generatedFlow: GraphDescriptor
  ): GraphDescriptor {
    switch (constraint.kind) {
      case "EDIT_STEP_CONFIG": {
        const originalStepId = constraint.stepId;
        const originalFlowClone = structuredClone(originalFlow);
        const originalStepClone = findStepById(
          originalFlowClone,
          originalStepId
        );
        // The error states below should no longer be possible, but we keep
        // in the case of misbehaving backend.
        if (!originalStepClone) {
          throw new Error(
            `Error applying ${constraint.kind} constraint to flow:` +
              ` An original step was not found` +
              ` with id ${JSON.stringify(originalStepId)}.`
          );
        }
        const originalTitle = originalStepClone.metadata?.title;
        const generatedStep =
          // Prefer to reconcile by ID, then title.
          findStepById(generatedFlow, originalStepId) ??
          (originalTitle
            ? findStepByTitle(generatedFlow, originalTitle)
            : undefined);
        if (!generatedStep) {
          throw new Error(
            `Error applying ${constraint.kind} constraint to flow:` +
              ` A generated step was not found` +
              ` with id ${JSON.stringify(originalStepId)}` +
              ` nor title ${JSON.stringify(originalTitle)}.`
          );
        }
        const originalConfig = originalStepClone.configuration;
        const generatedConfig = structuredClone(generatedStep.configuration);
        if (originalConfig && generatedConfig) {
          reconcileInputReferences(originalConfig, generatedConfig);
        }
        console.log(
          "[flowgen] Configuration updated from",
          originalConfig,
          "to",
          generatedConfig
        );
        originalStepClone.configuration = generatedConfig;
        return originalFlowClone;
      }
      default: {
        constraint.kind satisfies never;
        throw new Error(`Unexpected constraint: ${JSON.stringify(constraint)}`);
      }
    }
  }

  #buildSystemInstruction(params: SystemInstructionParams): string {
    const now = new Date();
    const timeString = now.toDateString();
    const userInfo = `**User information:**
* The current time where the user is located is ${timeString}.`;
    const agentName = `** User provided agent name:** ${params.agentName || ''}`;
    const agentGoal = `** User provided agent goal:** ${params.agentGoal || ''}`;
    const agentInstructions = `** User provided agent instructions:** ${params.agentInstructions || ''}`;
    const commonSense = `**Use your knowledge, creativity and common sense:**
* Never ask for clarification for optional tool parameters. You can simply ignore them if they are not provided.
* For non-critical, but required parameters (like title, description, subject, etc.) you should use your creativity to come up with a good value based on the context, when the user did not provide one.
* You can translate across languages, you can do almost any text processing or manipulation.
* You can answer in any language, if the user asks for it.`;
    const commonPatterns = `**Common patterns:**
1. The user asks for something that is not possible to achieve with the current tools or via your knowledge (eg: "please restart my computer").
* Expected behavior: Let the user immediately know that you cannot perform this action, and offer to perform an alternative solution.
2. The user refers to a date (e.g. "next Tuesday", "Friday", "Christmas", "1st October"), but does not provide the full YYYY-MM-DD date.
* For past events it is always the last occurrence, for future events (eg: time off, create event, new deadline) it is always the next occurrence compared to the current time, that is 2025-02-25 12:37:30 +0100 CET (Week 08, Tuesday).
* Expected behavior: Do not ask back, but use your best guess.
3. Generating code snippets, coding and debugging. Since you are an expert in software development, you should answer the user directly when they ask you to provide code, or debug. Do not invoke any tools in this case.
* Examples: "write a python code that counts the vowels in 'banana'", "what is the problem with this code? code: ...", "explain this code to me: ...", "debug this code: ...", "fix this code: ...", "write a code that calculates <task>", "how to reverse a string in java?".
* Expected behavior: You answer the user directly with the generated code, or the explanation of the code. You make sure that you highlight the pros and cons of the various approaches.`;

    const systemInstruction = `${userInfo}\n${agentName}\n${agentGoal}\n${agentInstructions}\n${commonSense}\n${commonPatterns}`;
    return systemInstruction;
  }
}

function findStepById(
  flow: GraphDescriptor,
  stepId: string
): NodeDescriptor | undefined {
  return (flow?.nodes ?? []).find((step) => step.id === stepId);
}

function findStepByTitle(
  flow: GraphDescriptor,
  stepTitle: string
): NodeDescriptor | undefined {
  return (flow?.nodes ?? []).find((step) => step.metadata?.title === stepTitle);
}

/**
 * Align the "paths" (incoming node IDs) of all "@" input references in
 * `newConfig` with those from `oldConfig`. We prefer aligning by ID, then
 * title. Failing either, the path is left unchanged.
 *
 * Note this does an in-place update of `generatedConfig`.
 */
function reconcileInputReferences(
  originalConfig: NodeConfiguration,
  generatedConfig: NodeConfiguration
): void {
  const originalPaths = new Set<string>();
  const originalTitleToPath = new Map<string, string>();
  for (const content of Object.values(originalConfig)) {
    if (isLLMContent(content)) {
      for (const part of content.parts) {
        if (isTextCapabilityPart(part)) {
          const template = new Template(part.text);
          for (const { title, path } of template.placeholders) {
            originalPaths.add(path);
            originalTitleToPath.set(title, path);
          }
        }
      }
    }
  }
  for (const content of Object.values(generatedConfig)) {
    if (isLLMContent(content)) {
      for (const part of content.parts) {
        if (isTextCapabilityPart(part)) {
          const template = new Template(part.text);
          const withPathsSubstituted = template.transform((part) => ({
            ...part,
            path: originalPaths.has(part.path)
              ? part.path
              : (originalTitleToPath.get(part.title) ?? part.path),
          }));
          part.text = withPathsSubstituted;
        }
      }
    }
  }
}
