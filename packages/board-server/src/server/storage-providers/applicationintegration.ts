import { blank, type ReanimationState } from "@google-labs/breadboard";
import type { BoardServerStore, ServerInfo, StorageBoard } from "../store.js";
// import { GoogleAuth } from 'google-auth-library';

export const APPLICATION_INTEGRATION_SERVER_INFO: ServerInfo = {
  title: "Application Integration",
  description: "Stores boards in Application Integration",
  url: "https://example.com/board-server",
};

// const auth = new GoogleAuth();

const PROJECT_ID: string = "ip-prod-testing";
const REGION: string = "us-central1";

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
    try {
      console.log('Attempting to fetch OAuth 2.0 Access token...');
      // The getAccessToken method handles fetching/caching using ADC.
      // const accessToken = await auth.getAccessToken();
      const accessToken = "hard code token";

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
    console.log("Application Integration Storage Load board");
    const { name, owner, requestingUserId = "" } = opts;
    const integrationVersions = await this.listIntegrationVersions(requestingUserId, name);
    if (integrationVersions.length === 0) {
      return null;
    }else{
      const board =  this.getBoardConfigFromIntegration(integrationVersions[0]);
      return board;
    }
  }

  async listBoards(userId: string): Promise<StorageBoard[]> {  
    console.log("Application Integration Storage List board");
    // Fetch boards from the external API
    const integrationVersions = await this.listIntegrationVersions(userId,"-");

    // Extract boardConfig for each integration
    const boardConfigs = integrationVersions.map((integration: any) => {
      try {
        return this.getBoardConfigFromIntegration(integration);
      } catch (error) {
        console.error(`Failed to extract boardConfig for integration: ${integration.name}`, error);
        return null; // Handle invalid or missing boardConfig gracefully
      }
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
    console.log("Application Integration Storage Create board");
    await this.upsertBoard(board);
  }

  async updateBoard(board: StorageBoard): Promise<void> {
    console.log("Application Integration Storage Update board");

    // First list to see if board exists
    const integrationVersions = await this.listIntegrationVersions(board.owner, board.name);

    // Create board if the board does not exist
    if (integrationVersions.length === 0) {
      throw new Error("No boards found for path: @" + board.owner +"/" + board.name);
    }

    // Update board if the board exists
    const existingIntegrationVersion = integrationVersions[0];
    const existingBoardConfig = this.getBoardConfigFromIntegration(existingIntegrationVersion);
    const updatedBoardConfig: StorageBoard = {
      ...existingBoardConfig,
      ...board,
    };
    const updatedIntgrationVersion =  await this.updateIntegrationVersion(updatedBoardConfig, existingIntegrationVersion.name);
    const updatedBoard: StorageBoard = this.getBoardConfigFromIntegration(updatedIntgrationVersion);
    return;
  }

  async upsertBoard(board: Readonly<StorageBoard>): Promise<StorageBoard> {
    console.log("Application Integration Storage Upsert board");

    console.log("Upsert board: First to List Integration Versions");
    // First list to see if board exists
    const integrationVersions = await this.listIntegrationVersions(board.owner, board.name);
    
    // Create board if the board does not exist
    if (integrationVersions.length === 0) {
      console.log("Upsert board: Need to create Integration Versions");
      const createdIntegrationVersion =  await this.createIntegrationVersion(board);
      const createdBoard: StorageBoard = this.getBoardConfigFromIntegration(createdIntegrationVersion);
      return createdBoard;
    }
    console.log("Upsert board: Just update existing Integration Versions");
    // Upsert board if the board exists
    const existingIntegrationVersion = integrationVersions[0];
    const existingBoardConfig = this.getBoardConfigFromIntegration(existingIntegrationVersion);
    const updatedBoardConfig: StorageBoard = {
      ...existingBoardConfig,
      ...board,
    };

    const updatedIntgrationVersion =  await this.updateIntegrationVersion(updatedBoardConfig, existingIntegrationVersion.name);
    const updatedBoard: StorageBoard = this.getBoardConfigFromIntegration(updatedIntgrationVersion);
    return updatedBoard;
  }

  async deleteBoard(_userId: string, boardName: string): Promise<void> {
    console.log("Application Integration Storage Delete board");
    await this.deleteIntegrationVersions(_userId, boardName);
  }


  async updateIntegrationVersion(board: Readonly<StorageBoard>, integrationVersionName: string): Promise<any> {
    const url = `https://integrations.googleapis.com/v1/${integrationVersionName}?update_mask=integration_parameters`;
    // Convert the board object to a JSON string
    const boardJsonString = JSON.stringify(board);
    // Escape the JSON string for embedding
    const escapedBoardJsonString = JSON.stringify(boardJsonString);
    const accessToken = await this.getOAuthAccessToken();
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: `{"name": "${integrationVersionName}","integrationParameters": [ {"key": "boardConfig", "dataType": "STRING_VALUE", "defaultValue": {"stringValue": `+ escapedBoardJsonString + '}}]}',
    });
    if (!response.ok) {
      throw new Error(`Failed to update board: ${response.statusText}`);
    }    

    return response.json();
  }

  async createIntegrationVersion(board: Readonly<StorageBoard>): Promise<any> {
    const integrationName = board.name.endsWith(".bgl.json")
        ? board.name.slice(0, -".bgl.json".length)
        : board.name;
    const url = `https://integrations.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/integrations/${board.owner}-${integrationName}/versions`;
    // Convert the board object to a JSON string
    const boardJsonString = JSON.stringify(board);
    // Escape the JSON string for embedding
    const escapedBoardJsonString = JSON.stringify(boardJsonString);
    const accessToken = await this.getOAuthAccessToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: '{"description":"'+ board.owner +'", "integrationParameters": [ {"key": "boardConfig", "dataType": "STRING_VALUE", "defaultValue": {"stringValue": '+ escapedBoardJsonString + '}}]}',
    });
    if (!response.ok) {
      throw new Error(`Failed to create board: ${response.statusText}`);
    }    

    return response.json();
  }

  private async deleteIntegrationVersions(userId:string, boardName:string): Promise<void> {
    console.log("ApplicationIntegrationStorage Delete Board");
    const integrationVersinos = await this.listIntegrationVersions(userId, boardName);
    if (integrationVersinos.length === 0) {
      console.log("No boards found for path: @" + userId +"/" + boardName);
      throw new Error("No boards found for path: @" + userId +"/" + boardName);
    }
  
    var integrationName = boardName.endsWith(".bgl.json")
        ? boardName.slice(0, -".bgl.json".length)
        : boardName;
    integrationName = userId + "-" + integrationName;

    const url = `https://integrations.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/integrations/${integrationName}`;
    const accessToken = await this.getOAuthAccessToken();
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to delete boards: ${response.statusText}`);
    }
  }

  private async listIntegrationVersions(userId:string, integrationName: string): Promise<any[]> {
    if (integrationName !== "-"){
      integrationName = integrationName.endsWith(".bgl.json")
        ? integrationName.slice(0, -".bgl.json".length)
        : integrationName;
      integrationName = userId + "-" + integrationName;
    }
    var url = `https://integrations.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/integrations/${integrationName}/versions?filter=description=${userId}`;
    if (userId === "") {
      url = `https://integrations.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/integrations/${integrationName}/versions`;
    }
    const accessToken = await this.getOAuthAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.integrationVersions === undefined) {
      return [];
    }
    // Group integrationVersions by integration name and keep only the latest version
    const latestVersionsByIntegration: Record<string, any> = {};
  
    data.integrationVersions.forEach((version: any) => {
      // Extract the integration name from the `name` field
      const match = version.name.match(/integrations\/([^/]+)/);
      if (!match) return;

      const integrationName = match[1];
  
      // Compare updateTime and keep the latest version
      if (
        !latestVersionsByIntegration[integrationName] ||
        new Date(version.updateTime).getTime() >
          new Date(latestVersionsByIntegration[integrationName].updateTime).getTime()
      ) {
        latestVersionsByIntegration[integrationName] = version;
      }
    });
    // Convert the result back to an array
    const latestVersions = Object.values(latestVersionsByIntegration);
    return latestVersions;
  }
  
   getBoardConfigFromIntegration(integration: any): StorageBoard {
    const boardConfigParam = integration.integrationParameters.find(
      (param: any) => param.key === "boardConfig"
    );
  
    if (!boardConfigParam || !boardConfigParam.defaultValue?.stringValue) {
      throw new Error("boardConfig parameter is missing or invalid");
    }
    const boardJson = JSON.parse(boardConfigParam.defaultValue.stringValue)
    // Parse the JSON string into a StorageBoard object
    return boardJson;
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
