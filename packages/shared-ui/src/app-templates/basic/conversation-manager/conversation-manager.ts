import {
    GraphDescriptor,
  } from "@google-labs/breadboard";
  import {gemini, LLMContent, GeminiErrorResponse, GeminiAPIOutputs, TextCapabilityPart} from "../gemini/gemini.js";
import { TokenVendor } from "@breadboard-ai/connection-client";


const INTRODUCTION_PROMPT = "Introduce yourself and start the conversation.";

export class ConversationManager {
    #chatHistory: LLMContent[] = [];
    #graphDescription: string = "";
    #tokenVendor?:TokenVendor;
    

    initial(graph: GraphDescriptor | undefined | null, tokenVendor?: TokenVendor) {
        if (graph) {
            this.#graphDescription = (graph.description || graph.metadata?.intent)?? "";
        }
        this.#chatHistory = [];
        if (tokenVendor) {
            this.#tokenVendor = tokenVendor;
        }
    }

    // Introduction is not stored in the chat history. 
    async introduceLLM() {
        return await gemini([{role: "user", parts: [{text:INTRODUCTION_PROMPT}]}], this.#graphDescription, await this.getAccessToken());
    }

    async chatWithLLM() {
        const result = await gemini(this.#chatHistory, this.#graphDescription, await this.getAccessToken());
        if (result.error) {
            // error handling!!!
            console.log(result.error);
            return result;
        } else {
            // happy path;
            const output = result.candidates? result.candidates[0]?.content: undefined;
            if (output) {
                this.#chatHistory.push(output);
                return result;
            }
            return result;
        }
    }

    async generateTheInput(question: string) {
        console.log(question);
    }

      
    async getAccessToken() {
        if (!this.#tokenVendor) return "";
        let token = this.#tokenVendor.getToken("$sign-in");
        const { state } = token;

        if (state === "signedout") {
            return "";
        }
        if (state === "expired") {
            token = await token.refresh();
        }
        const { grant } = token;
        if (!grant) {
            return "";
        }
        return grant.access_token;
    }

    getChatHistory() {
        return this.#chatHistory;
    }

    getLatestUserContent() {
        const userChat = this.#chatHistory.filter((chat) => chat.role === "user");
        return ((userChat.at(-1)?.parts[0]) as TextCapabilityPart).text;
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