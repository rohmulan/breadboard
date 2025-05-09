import {
    GraphDescriptor,
  } from "@google-labs/breadboard";
  import {gemini, LLMContent, GeminiErrorResponse, GeminiAPIOutputs} from "../gemini/gemini.js";



export class ConversationManager {
    #chatHistory: LLMContent[] = [];
    #graphDescription: string = "";

    initial(graph: GraphDescriptor) {
        this.#graphDescription = (graph.metadata?.intent || graph.description)?? "";
        this.#chatHistory = [];
    }

    async chatWithLLM() {
        const result = await gemini(this.#chatHistory, this.#graphDescription);
        if (result.error) {
            // error handling!!!
            return generateLLMOutputEvent(result, this.#chatHistory.length);
        } else {
            // happy path;
            const output = result.candidates? result.candidates[0]?.content: undefined;
            if (output) {
                this.#chatHistory.push(output);
                return generateLLMOutputEvent(result, this.#chatHistory.length);
            }
            return generateEmptyEvent();
        }
    }

    acceptUserQuery(userInput: string): ManualEvent {
        this.#chatHistory.push(this.generateLLMInputContent(userInput));
        return generateUserInputEvent(userInput, this.#chatHistory.length);
    }

    generateLLMInputContent(userInput: string) {
        return {
            role: "user",
            parts: [
                {
                    text: userInput
                }
            ]
        };
    }
}





export function generateUserInputEvent(userInput: string, index: number): ManualEvent {
    console.log('generate input');
    return {
        type: "manual",
        id: `user-input-manual-${index}`,
        isInput: true,
        userInput,
        output: {},
        start: Date.now(),
        end: Date.now(),
    };

}

export function generateLLMOutputEvent(result: GeminiAPIOutputs, index: number): ManualEvent {
    return {
        type: "manual",
        id: `llm-output-manual-${index}`,
        isInput: false,
        output: result,
        start: Date.now(),
        end: Date.now(),
    }
}


export type ManualEvent = {
    type: "manual";
    id: string;
    isInput?: boolean;
    userInput?: string;
    output?: GeminiAPIOutputs;
    start: number;
    end: number;
  };

  function generateEmptyEvent(): ManualEvent {
    return {
        type: "manual",
        id: `llm-output-manual-empty`,
        isInput: false,
        start: Date.now(),
        end: Date.now(),
    }
  }