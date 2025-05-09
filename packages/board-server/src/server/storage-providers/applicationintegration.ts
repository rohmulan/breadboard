import { blank, board, type ReanimationState } from "@google-labs/breadboard";
import type { BoardServerStore, ServerInfo, StorageBoard } from "../store.js";
import { GoogleAuth } from 'google-auth-library';

export const APPLICATION_INTEGRATION_SERVER_INFO: ServerInfo = {
  title: "Application Integration",
  description: "Stores boards in Application Integration",
  url: "https://example.com/board-server",
};

const auth = new GoogleAuth();

const PROJECT_ID: string = "ip-prod-testing";
const PROJECT_NUMBER: string = "267922162744";
const REGION: string = "us-central1";
const COLLECTION_ID: string = "default_collection";
const ENGINE_ID: string = "teamfood-v11";
const ASSISTANT_ID: string = "default_assistant";
const ENDPOINT: string = "https://stagingqualuscentral1-integrations.sandbox.googleapis.com";
const PARENT_RESOURCE_NAME: string = `projects/${PROJECT_NUMBER}/locations/${REGION}/collections/${COLLECTION_ID}/engines/${ENGINE_ID}/assistants/${ASSISTANT_ID}`;


export class ApplicationIntegrationStorageProvider implements BoardServerStore {

  /** API key -> user ID */
  #users: Record<string, string> = {};

  /** board name -> boards */
  #boards: Record<string, StorageBoard> = {};

  async getServerInfo(): Promise<ServerInfo | null> {
    return APPLICATION_INTEGRATION_SERVER_INFO;
  }

  async createUser(userId: string, apiKey: string): Promise<void> {
    if (Object.values(this.#users).includes(userId)) {
      throw Error("user exists");
    }
    this.#users[apiKey] = userId;
  }

  async findUserIdByApiKey(apiKey: string): Promise<string> {
    return this.#users[apiKey] ?? "";
  }

  /**
   * Generates an OAuth 2.0 Access Token for the current service account.
   * Note: Scopes are typically defined by the IAM roles granted to the service account.
   * This token grants access to Google Cloud APIs.
   * @returns {Promise<string>} - The OAuth 2.0 Access Token string.
   */
  async getOAuthAccessToken(): Promise<string> {
    // For locall test, comment out the try/catch block and uncomment the AUTH_TOKEN line, and add your own auth token.
    // const AUTH_TOKEN = "";
    // return AUTH_TOKEN;

    try {
      // The getAccessToken method handles fetching/caching using ADC.
      const accessToken = await auth.getAccessToken();

      if (!accessToken) {
        throw new Error('Failed to fetch Access token, received undefined.');
      }
      return accessToken;
    } catch (error) {
      console.error('Error fetching OAuth Access Token:', error);
      throw error; // Rethrow or handle as needed
    }
  }

  async loadBoard(opts: {
    name: string;
    owner?: string;
    requestingUserId?: string;
  }): Promise<StorageBoard | null> {
    console.log("Loading board:", opts.name);
    const agentFlow = await this.getAgentFlow(opts.name);
    return JSON.parse(agentFlow.flowConfig);
  }

  async listBoards(userId: string): Promise<StorageBoard[]> {
    console.log("Listing boards for user:", userId);
    const agentFlows = await this.listAgentFlows(COLLECTION_ID, ENGINE_ID, `creator="${userId}"`);
    if (agentFlows.length === 0) {
      return [];
    }

    const boardConfigs = agentFlows.map((agentFlow: any) => {
      return JSON.parse(agentFlow.flowConfig);
    }).filter((config) => config !== null); // Remove null entries

    return boardConfigs as StorageBoard[];
  }

  async createBoard(userId: string, name: string): Promise<void> {
    const board = {
      name,
      owner: userId,
      displayName: name,
      description: "",
      tags: [],
      thumbnail: "",
      graph: blank(),
    };
    console.log("Creating board:", board);
    await this.upsertBoard(board);
  }

  async updateBoard(board: StorageBoard): Promise<void> {
    console.log("Updating board:", board);
    await this.upsertBoard(board);
    return;
  }

  async upsertBoard(board: Readonly<StorageBoard>): Promise<StorageBoard> {
    console.log("Upserting board");
    console.log("[Upserting board] Received Board:", board);
  
    var agentFlow;
    try {
      // Attempt to get the agent flow
      const agentFlowId = this.parseBoardId(board.name);
      console.log(`[Upserting board] Attempting to get agent flow with ID: ${agentFlowId}`);
      agentFlow = await this.getAgentFlow(agentFlowId);

    } catch (error) {
      // Check if the error is a "not found" error
      if (error instanceof Error && error.message.includes("404")) {
        console.log(`[Upserting board] Agent flow not found, creating a new one.`);
        const createdAgentFlow = await this.createAgentFlow(board);
        console.log(`[Upserting board] Successfully created AgentFlow:`, createdAgentFlow.name);
        const createdBoard: StorageBoard = JSON.parse(createdAgentFlow.flowConfig);
        createdBoard.name = createdAgentFlow.name.split("/agentFlows/").pop() ?? "";
        console.log(`[Upserting board] Update flowConfig with new board.name:`, createdBoard.name);
        const updatedAgentFlow = await this.updateAgentFlow(createdBoard, createdAgentFlow.name);
        const updatedBoard: StorageBoard = JSON.parse(updatedAgentFlow.flowConfig);
        return updatedBoard;
      } else {
        // Rethrow the error for other cases
        console.error(`[Upserting board] Error while getting agent flow:`, error);
        throw error;
      }
    }

    if (!agentFlow) {
      console.log(`[Upserting board] Agent flow not found or invalid, creating a new one.`);
      const createdAgentFlow = await this.createAgentFlow(board);
      console.log(`[Upserting board] Successfully created AgentFlow:`, createdAgentFlow.name);
      const createdBoard: StorageBoard = JSON.parse(createdAgentFlow.flowConfig);
      // Need to update the board.name with UUID from spanner.
      createdBoard.name = createdAgentFlow.name.split("/agentFlows/").pop() ?? "";
      console.log(`[Upserting board] Update flowConfig with new board.name:`, createdBoard.name);
      const updatedAgentFlow = await this.updateAgentFlow(createdBoard, createdAgentFlow.name);
      const updatedBoard: StorageBoard = JSON.parse(updatedAgentFlow.flowConfig);
      return updatedBoard;
    }

    console.log(`[Upserting board] Found existing agent flow, updating it.`);
    // Update the agent flow if it exists
    const existingBoardConfig: StorageBoard = JSON.parse(agentFlow.flowConfig);
    const updatedBoardConfig: StorageBoard = {
      ...existingBoardConfig,
      ...board,
    };
    const updatedAgentFlow = await this.updateAgentFlow(updatedBoardConfig, agentFlow.name);
    const updatedBoard: StorageBoard = JSON.parse(updatedAgentFlow.flowConfig);
    return updatedBoard;

  }

  async deleteBoard(_userId: string, boardName: string): Promise<void> {
    console.log("Deleting board:", boardName);
    await this.deleteAgentFlow(boardName);
  }

  private async updateAgentFlow(board: Readonly<StorageBoard>, agentFlowResourceName: string): Promise<any> {
    console.log("Updating agent flow:", agentFlowResourceName);
    var updateMask = "flowConfig";
    const description = board.description ?? "";
    const displayName = board.displayName ?? "";
    const noCodeAgentId = board.graph?.metadata?.noCodeAgentId ?? "";
    if (description !== "" && board.description !== undefined) {
      updateMask += ",description";
    }
    if (displayName !== "" && board.displayName !== undefined) {
      updateMask += ",display_name";
    }
    if (noCodeAgentId !== "" && board.graph?.metadata?.noCodeAgentId !== undefined) {
      updateMask += ",no_code_agent";
    }
    // Clear the fields from board.graph.metadata
    if (board.graph?.metadata) {
      delete board.graph.metadata.noCodeAgentId;
      delete board.graph.metadata.noCodeAgentParent;
    }
    // Convert the board object to a JSON string
    const boardJsonString = JSON.stringify(board);
    // Escape the JSON string for embedding
    const escapedBoardJsonString = JSON.stringify(boardJsonString);

    const url = `${ENDPOINT}/v1/${agentFlowResourceName}?update_mask=${updateMask}`;
    const accessToken = await this.getOAuthAccessToken();
    const generatedBody =  '{"name":"' + agentFlowResourceName + '","description":"' + description + '", "displayName":"' + displayName + '", "flowConfig":' + escapedBoardJsonString + ', "noCodeAgent":"' + noCodeAgentId + '"}';
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": `${PROJECT_NUMBER}`,
      },
      body: generatedBody,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, "UpdateAgentFlow");
    }

    return await response.json();
  }

  private async createAgentFlow(board: Readonly<StorageBoard>): Promise<any> {
    console.log("Creating agent flow");
    const accessToken = await this.getOAuthAccessToken();
    const noCodeAgentId = board.graph?.metadata?.noCodeAgentId ?? "";
    const noCodeAgentParent = board.graph?.metadata?.noCodeAgentParent ?? "";
    const description = board.description ?? "";
    const displayName = board.displayName ?? "";
    const creator = board.creatorEmail ?? board.owner;

    // Clear the fields from board.graph.metadata
    if (board.graph?.metadata) {
      delete board.graph.metadata.noCodeAgentId;
      delete board.graph.metadata.noCodeAgentParent;
    }
    // Convert the board object to a JSON string
    const boardJsonString = JSON.stringify(board);
    // Escape the JSON string for embedding
    const escapedBoardJsonString = JSON.stringify(boardJsonString);

    var url = `${ENDPOINT}/v1/${PARENT_RESOURCE_NAME}/agentFlows`;
    if (noCodeAgentParent !== "") {
      const { project, location, collection, engine } = this.parseResourcePath(noCodeAgentParent);
      url = `${ENDPOINT}/v1/projects/${PROJECT_NUMBER}/locations/${REGION}/collections/${collection}/engines/${engine}/agentFlows`;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": `${PROJECT_NUMBER}`,
      },
      body: '{"description":"' + description + '", "displayName":"' + displayName + '", "flowConfig":' + escapedBoardJsonString + ', "creator":"' + creator + '", "noCodeAgent":"' + noCodeAgentId + '"}',
    });


    if (!response.ok) {
      await this.handleErrorResponse(response, "CreateAgentFlow");
    }
    const data = await response.json();
    return data;
  }


  private async getAgentFlow(boardName: string): Promise<any> {
    console.log("Getting agent flow:", boardName);
    if (boardName === "") {
      throw new Error("Board name is empty");
    }
    const agentFlowId = this.parseBoardId(boardName);
    const url = `${ENDPOINT}/v1/${PARENT_RESOURCE_NAME}/agentFlows/${agentFlowId}`;
    const accessToken = await this.getOAuthAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-user-project": `${PROJECT_NUMBER}`,
      },
    });
    if (!response.ok) {
      await this.handleErrorResponse(response, "GetAgentFlow");
    }
    return await response.json();
  }

  private async deleteAgentFlow(boardName: string): Promise<void> {
    console.log("Deleting agent flow:", boardName);
    const agentFlowId = this.parseBoardId(boardName);
    const url = `${ENDPOINT}/v1/${PARENT_RESOURCE_NAME}/agentFlows/${agentFlowId}`;
    const accessToken = await this.getOAuthAccessToken();

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-user-project": `${PROJECT_NUMBER}`,
      },
    });
    if (!response.ok) {
      await this.handleErrorResponse(response, "DeleteAgentFlow");
    }
  }

  private async listAgentFlows(collectionId: string, engineId: string, filter: string): Promise<any[]> {
    console.log("Listing agent flows with filter:", filter);
    var url = `${ENDPOINT}/v1/projects/${PROJECT_NUMBER}/locations/${REGION}/collections/${collectionId}/engines/${engineId}/assistants/${ASSISTANT_ID}/agentFlows`;
    if (filter !== "") {
      const encodedFilter = encodeURIComponent(filter);
      url += "?filter=" + encodedFilter;
    }
    const accessToken = await this.getOAuthAccessToken();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-user-project": `${PROJECT_NUMBER}`,
      },
    });
    if (!response.ok) {
      await this.handleErrorResponse(response, "ListAgentFlows");
    }

    const data = await response.json();
    if (data.agentFlows === undefined) {
      return [];
    }
    return data.agentFlows;
  }

  parseBoardId(boardName: string): string {
    const agentFlowId = boardName.endsWith(".bgl.json")
      ? boardName.slice(0, -".bgl.json".length)
      : boardName;
    return agentFlowId;
  }

  parseResourcePath(resourcePath: string): Record<string, string> {
    const regex = /^projects\/([^/]+)\/locations\/([^/]+)\/collections\/([^/]+)\/engines\/([^/]+)$/;
    const match = resourcePath.match(regex);

    if (!match) {
      throw new Error("Invalid resource path format");
    }

    return {
      project: match[1] ?? (() => { throw new Error("Project ID is undefined"); })(),
      location: match[2] ?? (() => { throw new Error("Location is undefined"); })(),
      collection: match[3] ?? (() => { throw new Error("Collection is undefined"); })(),
      engine: match[4] ?? (() => { throw new Error("Engine is undefined"); })(),
    };
  }

  private async handleErrorResponse(response: Response, action: string): Promise<void> {
    console.log(`${action} - Response Status:`, response.status);
    console.log(`${action} - Response Headers:`, response.headers);
    console.log(`${action} - Response Body:`, await response.text());
    throw new Error(`Failed to ${action}: ${response.status} - ${response.statusText}`);
  }

  async loadReanimationState(
    _user: string,
    _ticket: string
  ): Promise<ReanimationState | undefined> {
    throw Error("unimplemented");
  }

  saveReanimationState(
    _user: string,
    _state: ReanimationState
  ): Promise<string> {
    throw Error("unimplemented");
  }
}
