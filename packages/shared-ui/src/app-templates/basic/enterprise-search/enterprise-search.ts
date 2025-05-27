import { GeminiAPIOutputs, LLMContent } from "../gemini/gemini";

function endpointURL() {
    return `https://staging-appcatalyst.sandbox.googleapis.com/v1beta1/executeStep`;
}

export async function search(
      userQuery: string,
      accessToken: string,
): Promise<GeminiAPIOutputs> {
    const requestInit: RequestInit = {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
    };
    requestInit.body = constructBody(userQuery);
     const url = endpointURL();
      const data = await fetch(url, requestInit);
      if (!data.ok) {
        return {error: {message: 'Cannot execute enterprise search right now. Please try again later.'}};
      } else {
        try {
            const res = (await data.json());
            console.log(res);
            const executionOutputs = res.executionOutputs;
            const outputData = executionOutputs.data;
            const outputString = decodeMessage(outputData.chunks[0].data);
            console.log(outputString);
            return {candidates: [{tokenOutput: 0, content: {role:'model', parts: [{
                text: outputString
            }]}}]}
        }
         catch(error: unknown) {
            return {error: {message: 'Cannot execute enterprise search right now. Please try again later.'}};
         }
      }
}

function constructBody(
    userQuery: string,
): string {
    const body = {
        "planStep": {
          "stepName": "enterprise_search",
          "modelApi": "enterprise_search",
          "output": "data",
          "inputParameters": [
            "query",
            "search_engine_resource_name"
          ],
          "isListOutput": false
        },
        "execution_engine": "EXECUTION_ENGINE_AGENT_SPACE",
        "execution_inputs": {
          "query": {
            "chunks": [
              {
                "mimetype": "text/plan",
                "data": `${btoa(unescape(encodeURIComponent(userQuery)))}`
              }
            ]
          },
          "search_engine_resource_name": {
            "chunks": [
              {
                "mimetype": "text/plan",
                "data": "cHJvamVjdHMvODYyNzIxODY4NTM4L2xvY2F0aW9ucy9nbG9iYWwvY29sbGVjdGlvbnMvZGVmYXVsdF9jb2xsZWN0aW9uL2VuZ2luZXMvdGVhbWZvb2QtdjExXzE3MjA2NzEwNjM1NDU="
              }
            ]
          }
        }
      };
    return JSON.stringify(body);
}

function decodeMessage (encodedString: string) {
        // Step 1: Decode from Base64
        const decodedBase64 = atob(encodedString);
      
        // Step 2: Re-escape the string
        // This step is necessary because the original encoding used `unescape()`
        // which removed certain percent-encodings. We need to put them back
        // so decodeURIComponent can process them correctly.
        const reEscaped = escape(decodedBase64);
      
        // Step 3: Decode URI components
        // This will reverse the effect of the original encodeURIComponent,
        // assuming the unescape/escape pair worked correctly.
        const originalString = decodeURIComponent(reEscaped);
      
        return originalString;
}