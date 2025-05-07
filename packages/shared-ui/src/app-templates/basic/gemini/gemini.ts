export type LLMContent = {
  role?: string;
  parts: DataPart[];
};

export type DataPart = FunctionCallCapabilityPart | TextCapabilityPart;

export type TextCapabilityPart = {
  text: string;
};

export type GeminiSchema = {
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: string;
  minItems?: string;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  items?: GeminiSchema;
};

export type FunctionCallCapabilityPart = {
  functionCall: {
    name: string;
    args: object;
  };
};

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters?: GeminiSchema;
};

export type Tool = {
  function_declarations?: FunctionDeclaration[];
};

export type HarmBlockThreshold =
  // Content with NEGLIGIBLE will be allowed.
  | "BLOCK_LOW_AND_ABOVE"
  // Content with NEGLIGIBLE and LOW will be allowed.
  | "BLOCK_MEDIUM_AND_ABOVE"
  // Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed.
  | "BLOCK_ONLY_HIGH"
  // All content will be allowed.
  | "BLOCK_NONE"
  // Turn off the safety filter.
  | "OFF";

export type HarmCategory =
  // Gemini - Harassment content
  | "HARM_CATEGORY_HARASSMENT"
  //	Gemini - Hate speech and content.
  | "HARM_CATEGORY_HATE_SPEECH"
  // Gemini - Sexually explicit content.
  | "HARM_CATEGORY_SEXUALLY_EXPLICIT"
  // 	Gemini - Dangerous content.
  | "HARM_CATEGORY_DANGEROUS_CONTENT"
  // Gemini - Content that may be used to harm civic integrity.
  | "HARM_CATEGORY_CIVIC_INTEGRITY";

export type SafetySetting = {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
};

export type GeminiBody = {
  contents: LLMContent[];
  tools?: Tool[];
  systemInstruction?: LLMContent;
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
};

export type GenerationConfig = {
  responseMimeType?: "text/plain" | "application/json" | "text/x.enum";
  responseSchema?: GeminiSchema;
};

function endpointURL(model: string) {
  if (!model) {
    model = "gemini-2.0-flash";
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=AIzaSyDdyPzV1XXID29vpefaybtUwTeK5wSXnuY`;
}

// example:
// await gemini("Hello, how are you doing?", "The flow can generate jokes based on user prompts. It uses an AI system to create the jokes. The system can also generate other type of contents");
export async function gemini(
  userInput: string,
  boardDescription: string
): Promise<void> {
  console.log(
    "Start fetching from gemini API with userInput as %s and boardDescription as %s",
    userInput,
    boardDescription
  );
  // User Oath token in header to call Gemini instead of api key
  //   headers: {
  //     Authorization: `Bearer ${accessToken}`,
  //   },
  const requestInit: RequestInit = {
    method: "POST",
    headers: {},
  };
  requestInit.body = JSON.stringify(
    consturctGeminiBody(userInput, boardDescription)
  );
  const url = endpointURL("gemini-2.0-flash");
  const data = await fetch(url, requestInit);
  if (!data.ok) {
    console.error("Error fetching from Gemini API. Status:", data.status);
    const errorResponse = await data.json(); // Assuming error response is JSON
    console.error("Error details:", errorResponse);
  } else {
    console.log("Complete fetching from gemini API, status:", data.status);
    // Maybe define a response data type GeminiOutput to parse the response?
    const res = await data.json();
    console.dir(res);
    console.log("Print candidate to see result...");
    console.dir(res.candidates[0].content.parts[0]);
  }
}

function consturctGeminiBody(
  userInput: string,
  boardDescription: string
): GeminiBody {
  // userInput:
  // How are you doing
  // Can you tell me a joke about Tom and Jerry
  // Can you generate some python code for me to get cuurent local time string
  const userInputContents: LLMContent = {
    role: "user",
    parts: [
      {
        text: userInput,
      },
    ],
  };
  const tools: Tool[] = [
    {
      function_declarations: [
        {
          name: "execute_flow",
          description: `Executes a specific flow to perform an action based on user input. ${boardDescription || ""}`,
          parameters: {
            type: "object",
            properties: {
              flow_user_input: {
                type: "string",
                description: "The flow input.",
              },
            },
            required: ["flow_user_input"],
          },
        },
      ],
    },
  ];
  const systemInstruction: LLMContent = {
    parts: [
      {
        text: buildSystemInstructionText(),
      },
    ],
  };

  const safetySettings: SafetySetting[] = [
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_NONE",
    },
  ];
  const body: GeminiBody = {
    contents: [userInputContents],
    tools: tools,
    systemInstruction: systemInstruction,
    safetySettings: safetySettings,
  };
  return body;
}

function buildSystemInstructionText(): string {
  return "You are a helpful assistant. Your primary role is to either engage in normal conversation or, when appropriate, use available tools to fulfill user requests.\n\n**Available Tools:**\n\n* **execute_flow**: Executes a predefined flow to perform a specific action based on user input.\n    * **Flows:**\n        * **Joke Generator**: Generates jokes based on user prompts.\n    * **Invocation**: If the user's request is clearly asking for a joke, you should use the `execute_flow` tool with the flow_name set to 'Joke Generator' and the user's request as the flow_user_input.\n\n**Conversation Mode:**\n\n* If the user's input is a greeting, a general question unrelated to jokes, or any other conversational topic that doesn't explicitly ask for a joke, respond naturally and engage in a normal conversation.\n\n**Do not ask for clarification before using the tool if the user's intent to get a joke is clear.**";
}
