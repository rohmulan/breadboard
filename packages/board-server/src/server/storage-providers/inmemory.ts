import { blank, type ReanimationState } from "@google-labs/breadboard";
import type { BoardServerStore, ServerInfo, StorageBoard } from "../store.js";
import { randomUUID } from "crypto";

export const IN_MEMORY_SERVER_INFO: ServerInfo = {
  title: "In-memory board server",
  description: "Stores boards in memory",
  url: "https://example.com/board-server",
};

export class InMemoryStorageProvider implements BoardServerStore {
  #users: Record<string, string> = {};
  /** board userId -> name -> boards */
  #boards: Record<string, Record<string, StorageBoard>> = {};

  #states: Record<string, Record<string, ReanimationState>> = {};

  async getServerInfo(): Promise<ServerInfo | null> {
    return IN_MEMORY_SERVER_INFO;
  }

  async createUser(userId: string, apiKey: string): Promise<void> {
    console.log("in-memory store create user called...local server might not hit this");
    if (Object.values(this.#users).includes(userId)) {
      throw Error("user exists");
    }
    this.#users[apiKey] = userId;
  }

  async findUserIdByApiKey(apiKey: string): Promise<string> {
    // Hard code user/apiKey pair here for testing purpose
    if (apiKey === "bb-2g3o2c1pr1o2f5h6512524a18y5b4ss2io3b1mr433a3194d3j") {
      return "110099467630814779452";
    }
    console.log(`Finding user for API key: ${apiKey}`);
    console.log( `Current users: ${JSON.stringify(this.#users, null, 2)}`);
    return this.#users[apiKey] ?? "";
  }

  async loadBoard(opts: {
    name: string;
    owner?: string;
    requestingUserId?: string;
  }): Promise<StorageBoard | null> {
    console.log("in-memory store load board called...");
    const { name, owner, requestingUserId = "" } = opts;
    console.log("Load board %s for owner %s and requestingUserId %s", name, owner, requestingUserId);
    if (!requestingUserId) {
      throw Error("No credential present in the request, annoymous user can not read any baords");
    }
    if (!owner) {
      throw Error("No owner specified in the request");
    }
    if (owner && requestingUserId && owner !== requestingUserId) {
      throw Error("Requestor does not match with the board owner");
    }
    if (!this.#boards[owner]) {
      console.log("No boards stored for owner %s before", owner);
      return null;
    }
    return this.#boards[owner][name] ?? null;
  }

  async listBoards(userId: string): Promise<StorageBoard[]> {
    console.log("in-memory store list boards called...")
    const result: StorageBoard[] = [];
    
    if (!this.#boards[userId]) {
      return [];
    }
    for (const boardName in this.#boards[userId]) {
      if (this.#boards[userId][boardName]) {
        result.push(this.#boards[userId][boardName]);
      }
    }
    return result;
  }

  async createBoard(userId: string, name: string): Promise<void> {
    console.log("in-memory store create board called... current intput user id is %s and board name is %s", userId, name);
    if (!this.#boards[userId]) {
      this.#boards[userId] = {};
    }
    this.#boards[userId][name] = {
      name,
    owner: userId,
      displayName: name,
      description: "",
      tags: [],
      thumbnail: "",
      graph: blank(),
    };
  }

  async updateBoard(board: StorageBoard): Promise<void> {
    console.log("in-memory store update board called...");
    if (!board.owner) {
      throw Error("board must have an owner");
    }
    if (!this.#boards[board.owner]) {
      this.#boards[board.owner] = {};
    }
    this.#boards[board.owner]![board.name] = board;
  }



  async upsertBoard(board: Readonly<StorageBoard>): Promise<StorageBoard> {
    console.log("Upsert board from inmemory store called");
    const updatedBoard: StorageBoard = {...board, name: board.name || randomUUID()};
    console.dir(updatedBoard);
    if (!updatedBoard.owner) {
      throw Error("board must have an owner");
    }
    if (!this.#boards[updatedBoard.owner]) {
      this.#boards[updatedBoard.owner] = {};
    }
    this.#boards[updatedBoard.owner]![updatedBoard.name] = updatedBoard;
    return updatedBoard;
  }

  async deleteBoard(_userId: string, boardName: string): Promise<void> {
    console.log("in-memory store delete board called...");
    if (!this.#boards[_userId]) {
      return;
    }
    delete this.#boards[_userId][boardName];
  }

  async loadReanimationState(
    _user: string,
    _ticket: string
  ): Promise<ReanimationState | undefined> {
    console.log("Load reanimation state for user %s and ticket %s from in-memory store...", _user, _ticket);
    if (!this.#states[_user]) {
      return undefined;
    }
    const stateFromMemory = this.#states[_user][_ticket];
    console.dir(stateFromMemory);
    return stateFromMemory? stateFromMemory : undefined;
  }

  saveReanimationState(
    _user: string,
    _state: ReanimationState
  ): Promise<string> {
    console.log("Save reanimation state for user %s in in-memory store... will resume later", _user);
    console.dir(_state);
    const ticket = randomUUID();
    if (!this.#states[_user]) {
      this.#states[_user] = {};
    }
    this.#states[_user][ticket] = _state;
    return Promise.resolve(ticket);
  }
}