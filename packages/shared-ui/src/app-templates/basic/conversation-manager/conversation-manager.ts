import {gemini, LLMOutput} from "../gemini/gemini.js";

export async function chat(userInput: string, graphGoal: string): Promise<LLMOutput> {
    return await gemini(userInput, graphGoal);
}

export function generateUserInputEvent(userInput: string): ManualEvent {
    console.log('generate input');
    return {
        type: "manual",
        id: "user-input-manual",
        isInput: true,
        userInput,
        output: {},
        start: Date.now(),
        end: Date.now(),
    };

}

export function generateLLMOutputEvent(result: LLMOutput): ManualEvent {
    return {
        type: "manual",
        id: "llm-output-manual",
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
    output: LLMOutput;
    start: number;
    end: number;
  };
