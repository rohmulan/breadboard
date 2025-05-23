/**
 * @fileoverview Utility for calling generate_webpage tool.
 */

import fetch from "@fetch";
import secrets from "@secrets";

import { err, ok, toLLMContent, toLLMContentInline, toText } from "./utils";
import { executeStep } from "./step-executor";
import type { ExecuteStepRequest, Content, ContentMap } from "./step-executor";
import { report } from "./output";

export { callGenWebpage };

const OUTPUT_KEY = "rendered_outputs";

function base64DecodeNonAsciiStandard(base64String: string) {
  const byteString = atob(base64String);
  let encodedString = "";
  for (let i = 0; i < byteString.length; i++) {
    encodedString +=
      "%" + byteString.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return decodeURIComponent(encodedString);
}

async function callGenWebpage(
  instruction: string,
  content: LLMContent[],
  renderMode: string
): Promise<LLMContent> {
  const executionInputs: ContentMap = {};
  const inputParameters: string[] = [];
  let i = 0;
  for (let val of content) {
    for (let part of val.parts) {
      i++;
      if ("text" in part) {
        const key = `text_${i}`;
        inputParameters.push(key);
        const encodedText = btoa(unescape(encodeURIComponent(part.text)));
        executionInputs[key] = {
          chunks: [
            {
              mimetype: "text/plain",
              data: encodedText,
            },
          ],
        };
      } else if ("inlineData" in part) {
        const key = `media_${i}`;
        inputParameters.push(key);
        executionInputs[key] = {
          chunks: [
            {
              mimetype: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          ],
        };
      } else {
        console.error("Skipping unexpected content part");
      }
    }
  }
  const body = {
    planStep: {
      stepName: "GenerateWebpage",
      modelApi: "generate_webpage",
      inputParameters: inputParameters,
      systemPrompt: instruction,
      stepIntent: instruction,
      output: OUTPUT_KEY,
      options: {
        disablePromptRewrite: true,
        renderMode: renderMode,
      },
    },
    execution_inputs: executionInputs,
  } satisfies ExecuteStepRequest;
  // Add the contents
  // TODO(askerryryan): Remove once functional.
  console.log("request body");
  console.log(body);
  const response = await executeStep(body);
  // TODO(askerryryan): Remove once functional.
  console.log("response");
  console.log(response);
  if (!ok(response)) {
    return toLLMContent("Webpage generation failed: " + response.$error);
  }

  let returnVal;
  let outputChunk = response.executionOutputs[OUTPUT_KEY];
  if (!outputChunk) {
    return toLLMContent("Error: Malformed response. No page generated.");
  }
  const mimetype = outputChunk.chunks[0].mimetype;
  const base64Data = outputChunk.chunks[0].data;
  const data = base64DecodeNonAsciiStandard(base64Data);
  console.log(data);
  if (mimetype == "text/html") {
    returnVal = toLLMContentInline(mimetype, data);
  } else {
    returnVal = toLLMContent(data);
  }
  if (!returnVal) {
    return toLLMContent("Error: No webpage returned from backend");
  }
  return returnVal;
}
