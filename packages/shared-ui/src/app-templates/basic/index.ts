/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  LitElement,
  html,
  css,
  PropertyValues,
  nothing,
  HTMLTemplateResult,
} from "lit";
import { customElement, property, state, query, queryAll} from "lit/decorators.js";
import {
  AppTemplate,
  AppTemplateOptions,
  EdgeLogEntry,
  TopGraphRunResult,
  NodeLogEntry,
  STATUS,
} from "../../types/types";
import * as StringsHelper from "../../strings/helper.js";
const Strings = StringsHelper.forSection("AppPreview");
import Mode from "../shared/styles/icons.js";
import Animations from "../shared/styles/animations.js";
import AppTemplatesStyle from "./index-style.js";
import ThemeStyle from "./theme-style";

import { classMap } from "lit/directives/class-map.js";
import {
  GraphDescriptor,
  InspectableRun,
  InspectableRunSecretEvent,
  isLLMContent,
  isTextCapabilityPart,
  InspectableRunEvent,
  InspectableRunNodeEvent,
  InspectableNode
} from "@google-labs/breadboard";
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import { styleMap } from "lit/directives/style-map.js";
import {
  AddAssetEvent,
  AddAssetRequestEvent,
  BoardDescriptionUpdateEvent,
  BoardTitleUpdateEvent,
  InputEnterEvent,
  RunEvent,
  SignInRequestedEvent,
  StopEvent,
  UtteranceEvent,
} from "../../events/events";
import { when} from "lit/directives/when.js";
import { repeat } from "lit/directives/repeat.js";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { LLMContent, NodeValue, OutputValues } from "@breadboard-ai/types";
import { isLLMContentArrayBehavior, isLLMContentBehavior } from "../../utils";
import { extractError } from "../shared/utils/utils";
import { AssetShelf, BoardConversation, tokenVendorContext } from "../../elements/elements";
import { SigninState } from "../../utils/signin-adapter";

/** Included so the app can be standalone */
import "../../elements/input/add-asset/add-asset-button.js";
import "../../elements/input/add-asset/add-asset-modal.js";
import "../../elements/input/add-asset/asset-shelf.js";
import "../../elements/input/speech-to-text/speech-to-text.js";
import "../../elements/input/drawable/drawable.js";
import './summary/summary.js';


import "../../elements/output/llm-output/llm-output-array.js";
import "../../elements/output/llm-output/export-toolbar.js";
import "../../elements/output/llm-output/llm-output.js";
import "../../elements/output/multi-output/multi-output.js";
import { map } from "lit/directives/map.js";
import { markdown } from "../../directives/markdown";
import "./text-streamer/text-streamer.js";
import { BehaviorSubject, takeUntil, first, last} from "rxjs";
import {ManualEvent, generateUserInputEvent, generateLLMOutputEvent, ConversationManager} from "./conversation-manager/conversation-manager.js";
import { maybeConvertToYouTube } from "../../utils/substitute-input";
import { OutputFileType, transpileModule } from "typescript";
import { icons } from "../../styles/icons";
import { GeminiAPIOutputs, FunctionCallCapabilityPart, LLMContent as GeminiLLMContent, TextCapabilityPart } from "./gemini/gemini";
import { InputStageResult } from "../../../../breadboard/dist/src/run";
import { ConversationElement } from "../../elements/board-conversation/board-conversation";
import { consume } from "@lit/context";
import { TokenVendor } from "@breadboard-ai/connection-client";

@customElement("app-basic")
export class Template extends LitElement implements AppTemplate {
  @property({ type: Object })
  accessor options: AppTemplateOptions = {
    title: "Untitled App",
    mode: "light",
    splashImage: false,
  };

  @property({ reflect: false })
  accessor run: InspectableRun | null = null;

  @property()
  accessor graph: GraphDescriptor | null = null;

  @property()
  accessor topGraphResult: TopGraphRunResult | null = null;

  @property()
  accessor appURL: string | null = null;

  @property()
  accessor eventPosition = 0;

  @property()
  accessor pendingSplashScreen = false;

  @property()
  accessor showGDrive = false;

  @property()
  accessor isInSelectionState = false;

  @property()
  accessor showingOlderResult = false;

  @property()
  accessor state: SigninState = "anonymous";

  @property({ reflect: true, type: Boolean })
  accessor hasRenderedSplash = false;

  @property({ reflect: true, type: Boolean })
  accessor showShareButton = true;

  @property()
  accessor readOnly = true;

  @property()
  accessor events: InspectableRunEvent[] | null = null;
  
  @property({ reflect: true })
  accessor status = STATUS.RUNNING;

  @state()
  accessor showAddAssetModal = false;
  #addAssetType: string | null = null;

  @state()
  accessor eventsQueue: (InspectableRunEvent | ManualEvent)[] = [];

  @state()
  accessor conversationRendered = false;

  @state()
  accessor waitingLLMOutput = false;

  @state()
  accessor currentRunEvents: (InspectableRunEvent | ManualEvent)[] = [];

  @state()
  accessor hidenEventIdList: Set<string> = new Set<string>();

  @state()
  accessor skipFirstUserInput = true;

  @state()
  accessor hidenText = "";

  @state() 
  accessor conversationList: ConversationElement[] = []; 

  @state()
  accessor currentConversation: ConversationElement | undefined = undefined;

  @query('.conversations')
  accessor conversationScroller!: HTMLElement;

  @queryAll('.question-wrapper')
  accessor userInputs!: NodeList;

  @query('bb-board-conversation')
  accessor boardConversation!: BoardConversation;

  @consume({ context: tokenVendorContext })
  accessor tokenVendor!: TokenVendor;
  

  #allowedMimeTypes: string | null = null;
  #conversationManager = new ConversationManager();

  get additionalOptions() {
    return {
      font: {
        values: [
          { title: "Sans-serif", value: "sans-serif" } /* Default */,
          { title: "Serif", value: "serif" },
        ],
        title: "Font",
      },
      fontStyle: {
        values: [
          { title: "Normal", value: "normal" } /* Default */,
          { title: "Italic", value: "italic" },
        ],
        title: "Font Style",
      },
    };
  }

  static styles = [
    ThemeStyle,
    AppTemplatesStyle,
    Mode,
    Animations,
    icons
  ];

  #inputRef: Ref<HTMLDivElement> = createRef();
  #assetShelfRef: Ref<AssetShelf> = createRef();

  #renderFullConversation() {
    const run = this.run ?? null;
    let conversations = [];
    if (this.topGraphResult && !this.#flowIsNotStarted()) {
      conversations = [...this.conversationList, this.currentConversation];
    } else {
      conversations = [...this.conversationList];
    }
      // Initial the event queue.
    if (this.currentRunEvents && this.currentRunEvents.length > 0 && this.#flowIsNotStarted()) {
      this.eventsQueue.push(...this.currentRunEvents);
      this.currentRunEvents = [];
    }
      const hideLast = this.status === STATUS.STOPPED;
      const graphUrl = this.graph?.url ? new URL(this.graph.url) : null;
      const nextNodeId = this.topGraphResult?.currentNode?.descriptor.id ?? null;
  
      return html`
        <div id="board-activity-container">
          <bb-board-conversation
            .graphUrl=${graphUrl}
            .run=${run}
            .showExtendedInfo=${false}
            .showLogTitle=${false}
            .logTitle=${"Run"}
            .hideLast=${hideLast}
            .showDebugControls=${false}
            .nextNodeId=${nextNodeId}
            .waitingMessage=${""}
            .scrollHeight=${this.conversationScroller?.clientHeight ?? 0}
            .loadingMessage=${this.#getLoadingMessage()}
            .conversationList=${conversations}
            name=${Strings.from("LABEL_PROJECT")}
          ></bb-board-conversation>
        </div>
      `;
  }
  
  #toLLMContentWithTextPart(text: string, role = "user"): NodeValue {
    return { role, parts: [{ text }] };
  }

  #renderLog() {
    return html`
    <div class="conversations">
      <div class="conversations-content">
        ${this.#renderFullConversation()} 
      </div>
    </div>
    `
  }

// Right now, it's the same as scroll to the bottom.
#scrollToLatestUserQuery(height: number, behavior: ScrollBehavior = 'smooth') {
  const calculatedTop =  this.conversationScroller.scrollHeight -
  height - 10;
  this.conversationScroller?.scrollTo({
    top: calculatedTop,
    behavior,
  });
}

#getLoadingMessage () {
  if ((this.topGraphResult?.status === 'running' && this.topGraphResult?.currentNode?.descriptor?.metadata?.title) || this.waitingLLMOutput) {
    return 'Generating...';
  }
  return ''
}

#disableTyping() {
  const topGraphResult = this.topGraphResult;
  if (!!topGraphResult && topGraphResult.status === "stopped" && topGraphResult.log.length > 0) {
    console.log('Ended now. Disable typing. ');
    return true;
  }
  return false;
}
  #checkIsEmpty() {
    if (!this.#inputRef.value) {
      console.log('input ref is empty.')
      return true;
    }
    const inputs = this.#inputRef.value.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input,select,textarea");
    for (const input of inputs) {
      const value = input.value;
      if (!!value && value !== '') {
        return false;
      }
    }
    return true;
  }

  #hasFocusableInput = false;
  #renderInput(topGraphResult: TopGraphRunResult) {
    const placeholder = html`<div class="user-input">
        <p>&nbsp;</p>
      </div>

      <div class="controls"></div>`;

    const continueRun = (id: string) => {
      let stringValue = "";
      if (!this.#inputRef.value) {
        return;
      }

      if (this.#checkIsEmpty()) {
        return;
      }

      if (this.#flowIsNotStarted()) {
        return this.#processMessage();
      }

      const inputs = this.#inputRef.value.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input,select,textarea");
     
      const assetShelf =
        this.#inputRef.value.querySelector<AssetShelf>("bb-asset-shelf");
      const inputValues: OutputValues = {};

      let canProceed = true;
      for (const input of inputs) {
        if (!input.checkValidity()) {
          input.reportValidity();
          canProceed = false;
        }

        let value: string | LLMContent = input.value;
        if (typeof value === "string") {
          value = maybeConvertToYouTube(input.value);
        }

        if (typeof value === "string") {
          if (input.dataset.type === "llm-content") {
            inputValues[input.name] =
              input.dataset.empty === "true"
                ? { parts: [] }
                : this.#toLLMContentWithTextPart(value);
          } else if (input.dataset.type === "llm-content-array") {
            inputValues[input.name] = [this.#toLLMContentWithTextPart(value)];
          } else {
            inputValues[input.name] = value;
          }
          stringValue = value;
          value = "";
          input.value = "";
        } else {
          inputValues[input.name] = value as NodeValue;
        }

        if (assetShelf && assetShelf.value) {
          const inputValue = inputValues[input.name];
          if (isLLMContent(inputValue)) {
            const parts = inputValue.parts;
            for (const asset of assetShelf.value) {
              parts.push(...asset.parts);
            }
          }

          // Once we have the values, remove the items from the shelf.
          assetShelf.clear();
        }
      }

      if (!canProceed) {
        return;
      }
      // Push the current conversation to the list which will not be changed later.
      if (this.currentConversation) {
        this.conversationList.push(this.currentConversation);
        this.currentConversation = undefined;
      }
      this.conversationList.push({userInput: stringValue });

      this.dispatchEvent(
        new InputEnterEvent(id, inputValues, /* allowSavingIfSecret */ true)
      );
      this.#startScrolling();
    };

    let inputContents: HTMLTemplateResult | symbol = nothing;
    let active = false;
    let secretPart: HTMLTemplateResult | symbol = nothing;
    const currentItem = topGraphResult.log.at(-1);

    const controls = html`<div class="controls">
      <div class="action-group">
        <bb-add-asset-button
          .anchor=${"above"}
          .useGlobalPosition=${false}
          .showGDrive=${this.showGDrive}
        ></bb-add-asset-button>
        <button class="search-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="rgb(116, 119, 117)"
            stroke-width="1"
          >
            <path
              d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"
            />
          </svg>
          <span class="text">Search</span>
        </button>
        <button class="source-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 0 24 24"
            width="24px"
            fill="rgb(116,119,117)"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path
              d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
            />
          </svg>
          <span class="text">Sources</span>
        </button>
      </div>
      <div class="action-group">
        <button
          id="reset"
          ?disabled=${this.readOnly}
          @click=${() => {
            this.dispatchEvent(new StopEvent(true));
            this.conversationRendered = false;
            this.#reset();
          }}
        >
          <!-- <span class="g-icon">refresh</span> -->
        </button>
        ${topGraphResult.status !== "running"
          ? html`<button
              id="continue"
              @click=${() => {
                continueRun(
                  currentItem?.type === "edge" && currentItem.id
                    ? currentItem.id
                    : "unknown"
                );
              }}
            >
              Continue
            </button>`
          : nothing}
        ${topGraphResult.status === "running"
          ? html` <button
              id="stop"
              title="Stop execution"
              @click=${() => {
                this.dispatchEvent(new RunEvent());
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(8, 66, 160)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>`
          : nothing}
      </div>
    </div>`;
    if (currentItem?.type === "edge") {
      const props = Object.entries(currentItem.schema?.properties ?? {});
      if (this.run && this.run.events.at(-1)?.type === "secret") { 
        secretPart = this.#renderSecretInput();
      }


        active = true;
        const valueIsDefined = currentItem.value !== undefined;
        const valueHasKeys =
          typeof currentItem.value === "object" &&
          Object.keys(currentItem.value).length > 0;
        const valueIsNonEmptyArray =
          Array.isArray(currentItem.value) && currentItem.value.length > 0;
        const disabled =
          valueIsDefined && (valueHasKeys || valueIsNonEmptyArray);

        // We have to inspect the properties to determine what is allowed here,
        // but it is theoretically possible for multiple properties to define
        // different allowed values. For now we just roll through and pick out
        // the first one and go with what it says.
        let allowAddAssets = false;

        // Setting this to null will allow all default types through.
        let allowedUploadMimeTypes: string | null = null;
        let textToSpeech = false;
        let textInput = false;

        const supportedActions = {
          upload: false,
          youtube: false,
          drawable: false,
          gdrive: false,
        };

        propSearch: for (const [, prop] of props) {
          if (!prop.format) {
            continue;
          }

          switch (prop.format) {
            case "upload": {
              allowAddAssets = true;
              supportedActions.upload = true;
              break propSearch;
            }

            case "mic": {
              allowAddAssets = true;
              allowedUploadMimeTypes = "audio/*";
              supportedActions.upload = true;
              break propSearch;
            }

            case "videocam": {
              allowAddAssets = true;
              allowedUploadMimeTypes = "video/*";
              supportedActions.upload = true;
              supportedActions.youtube = true;
              break propSearch;
            }

            case "image": {
              allowAddAssets = true;
              allowedUploadMimeTypes = "image/*";
              supportedActions.upload = true;
              break propSearch;
            }

            case "edit_note": {
              allowAddAssets = true;
              allowedUploadMimeTypes = "text/*";
              supportedActions.upload = true;
              textToSpeech = true;
              textInput = true;
              break propSearch;
            }

            default: {
              // Any.
              allowAddAssets = true;
              textToSpeech = true;
              textInput = true;
              supportedActions.upload = true;
              supportedActions.youtube = true;
              supportedActions.drawable = true;
              supportedActions.gdrive = false;
              break propSearch;
            }
          }
        }

        inputContents = html`
          ${secretPart}
          ${repeat(props.length > 0 ? props : [["", {}]], ([name, schema]) => {
            const dataType = isLLMContentArrayBehavior(schema)
              ? "llm-content-array"
              : isLLMContentBehavior(schema)
                ? "llm-content"
                : "string";

            const propValue = currentItem.value?.[name];
            let inputValue = "";
            // if (isLLMContent(propValue)) {
            //   for (const part of propValue.parts) {
            //     if (isTextCapabilityPart(part)) {
            //       inputValue = part.text;
            //     }
            //   }
            // }

            return html`<div class="user-input">
              <textarea
                placeholder="Search content or ask questions"
                name=${name}
                type="text"
                data-type=${dataType}
                .value=${inputValue}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                  
                      continueRun(currentItem.id ?? "unknown");
                    
                  }
                }}
              ></textarea>
            </div>`;
          })}

          ${controls}
        `;
      // else {
      //   active = true;
      //   inputContents = placeholder;
      // }
    } else if (!topGraphResult || topGraphResult.status === 'stopped' || topGraphResult.log.length === 0) {
      inputContents = html`<div class="user-input">
      <textarea
        placeholder= ${"Search content or ask questions"}
        name="manual-input"
        type="text"
        data-type="string
        .value=""
        
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
              continueRun("unknown");
          }
        }}
      ></textarea>
      
      </div>
      ${controls}
      `;
    } 
    else {
      inputContents = placeholder;
    }

    let status: "stopped" | "paused" | "running" | "finished" =
      topGraphResult.status;


    if (topGraphResult.status === "stopped" && topGraphResult.log.length > 0) {
      status = "finished";
    }

    return html`<div
      @transitionend=${() => {
        if (!this.#inputRef.value || !active) {
          return;
        }

        const input =
          this.#inputRef.value.querySelector<HTMLInputElement>(
            "input,textarea"
          );
        input?.focus();
      }}
      @keydown=${(evt: KeyboardEvent) => {
        const isMac = navigator.platform.indexOf("Mac") === 0;
        const isCtrlCommand = isMac ? evt.metaKey : evt.ctrlKey;

        if (!(evt.key === "Enter" && isCtrlCommand)) {
          return;
        }
          continueRun("unknown");
        
      }}
      id="input"
      class=${classMap({ active, [status]: true })}
    >
      <div id="input-container" ${ref(this.#inputRef)}>${inputContents}</div>
      <div class="disclaimer">Generative AI may display inaccurate information, including about people, so double-check its responses.</div>
    </div>`;
  }

  #renderSecretInput() {
    const secretEvent = this.run!.events.at(-1) as InspectableRunSecretEvent;

    let active = true;
    // TODO: figure out what we should do for these secrets and remove display:none.
    return html`
      <div class="user-input" style="display:none;">
        <p class="api-message">
          When calling an API, the API provider's applicable privacy policy
          and terms apply
        </p>
        ${map(secretEvent.keys, (key) => {
          if (key.startsWith("connection:")) {
            return html`<bb-connection-input
              id=${key}
              .connectionId=${key.replace(/^connection:/, "")}
            ></bb-connection-input>`;
           } else {
            return html`<input
              name=${key}
              type="password"
              autocomplete="off"
              required
              .placeholder=${`Enter ${key}`}
            />`;
          }
        })}
      </div>`;
    
  }

  #totalNodeCount = 0;
  #nodesLeftToVisit = new Set<string>();
  protected async willUpdate(changedProperties: PropertyValues): Promise<void> {
    if (changedProperties.has("topGraphResult")) {
      if (
        this.graph &&
        this.topGraphResult &&
        (this.topGraphResult.log.length === 0 || this.#totalNodeCount === 0)
      ) {
        this.#nodesLeftToVisit = new Set(
          this.graph.nodes.map((node) => node.id)
        );

        this.#totalNodeCount = this.#nodesLeftToVisit.size;

        for (const item of this.topGraphResult.log) {
          if (item.type !== "node") {
            continue;
          }

          this.#nodesLeftToVisit.delete(item.descriptor.id);
        }
      }
      const oldTopGraphResult = changedProperties.get("topGraphResult") as TopGraphRunResult;
      if (this.topGraphResult
          && oldTopGraphResult
          && oldTopGraphResult.status !== this.topGraphResult?.status 
          && this.topGraphResult?.status === "stopped"
          && this.topGraphResult?.log
          && this.topGraphResult?.log.length > 0) {
          // the flow is ended.
          this.conversationList.push({model: this.#renderActivity(this.topGraphResult)});
          this.currentConversation = undefined;      
      } else {
        // For the case flow is not ended.
        if (this.topGraphResult 
          && this.topGraphResult.log.length > 0 
          && this.topGraphResult.status !== "stopped") {
          const currentItem = this.topGraphResult.log.at(-1);
          let lastOutput = null;
          // When edge && paused, it means we need user inputs.
          if ( currentItem?.type === "edge" &&
                this.topGraphResult.status === "paused") {
                const props = Object.entries(currentItem.schema?.properties ?? {});
                // This is the case, in official Opal UI, they render the description above the user-input, which we need
                // to manual add to conversations as well.
                  if (props.length > 0 && currentItem.descriptor?.type === "input") {
                    const anyValue = props.find((prop) => {
                      if (prop && prop[1].description) {
                        return true;
                      }
                      return false;
                    });
                    if (anyValue) {
                      if (this.currentConversation) {
                        this.conversationList.push(this.currentConversation);
                      }
                      const inputMap = await this.#LLMCanProvideAnswer(anyValue[1].description ?? "");
                      if (inputMap && inputMap.length > 0) {
                        setTimeout(() => {
                          this.#dispatchLLMContent(inputMap);
                        });
                      } else {
                        this.currentConversation = {
                          model: html `
                            <p>${anyValue[1].description}</p>
                          `
                        };
                      }
                      return;
                    }
                  }
                  for (let i = this.topGraphResult.log.length - 1; i >= 0; i--) {
                    const result = this.topGraphResult.log[i];
                    if (result.type === "edge" && result.descriptor?.type === "output") {
                      lastOutput = result;
                      break;
                    }
                  }
                  const inputMap = await this.#generateInput(lastOutput);
                  if (inputMap ) {
                    console.log('This is the question LLM can provide answer!');
                    setTimeout(() => {
                        this.#dispatchLLMContent(inputMap);
                    });

                  } else {
                    this.currentConversation = {model: this.#renderActivity(this.topGraphResult)};
                  }
            } else {
              this.currentConversation = {model: this.#renderActivity(this.topGraphResult)};
            }
        }
      }
    }
  }

  render() {
    const classes: Record<string, boolean> = {
      "app-template": true,
      [this.options.mode]: true,
    };

    if (!this.topGraphResult) {
      return nothing;
    }

    if (this.options.additionalOptions) {
      for (const [name, value] of Object.entries(
        this.options.additionalOptions
      )) {
        classes[`${name}-${value}`] = true;
      }
    }

    const styles: Record<string, string> = {};
    if (this.options.theme) {
      styles["--primary-color"] = this.options.theme.primaryColor;
      styles["--primary-text-color"] = this.options.theme.primaryTextColor;
      styles["--secondary-color"] = this.options.theme.secondaryColor;
      styles["--text-color"] = this.options.theme.textColor;
      styles["--background-color"] = this.options.theme.backgroundColor;
      styles["--background-color-secondary"] = this.options.theme.secondaryBackgroundColor;
      styles["--primary-button-color"] = this.options.theme.primaryButtonColor;
      styles["--primary-button-color-text"] = this.options.theme.primaryButtonColorText;
      styles["--primary-button-color-disabled"] = this.options.theme.primaryButtonColorDisabled;
      styles["--primary-button-color-text-disabled"] = this.options.theme.primaryButtonColorTextDisabled;
      styles["--bubble-background-color"] = this.options.theme.bubbleBackgroundColor;
      styles["--secondary-button-color"] = this.options.theme.secondaryButtonColor;
      styles["--secondary-button-color-text"] = this.options.theme.secondaryButtonColorText;
      styles["--primary-border-color"] = this.options.theme.primaryBorderColor;





    }

    if (
      typeof this.options.splashImage === "boolean" &&
      this.options.splashImage
    ) {
      if (!this.topGraphResult || this.topGraphResult.status === "stopped") {
        return html`<section
          class=${classMap(classes)}
          style=${styleMap(styles)}
        >
          <div id="content">
            <div class="loading"><p class="loading-message">Loading...</p></div>
          </div>
        </section>`;
      }
    }

    const splashScreen = html`
      <div
        id="splash"
        @animationend=${() => {
          this.hasRenderedSplash = true;
        }}
      >
        <div id="avatar">${this.options.title?.charAt(0) ?? 'A'}</div>
        <h1
          ?contenteditable=${!this.readOnly}
          @blur=${(evt: Event) => {
            if (this.readOnly) {
              return;
            }

            if (
              !(evt.target instanceof HTMLElement) ||
              !evt.target.textContent
            ) {
              return;
            }
            const newTitle = evt.target.textContent.trim();
            if (newTitle === this.options.title) {
              return;
            }
            this.dispatchEvent(new BoardTitleUpdateEvent(newTitle));
          }}
        >
          ${this.options.title}
        </h1>
        <p
          ?contenteditable=${!this.readOnly}
          @blur=${(evt: Event) => {
            if (this.readOnly) {
              return;
            }

            if (this.readOnly) {
              return;
            }

            if (
              !(evt.target instanceof HTMLElement) ||
              !evt.target.textContent
            ) {
              return;
            }

            const newDescription = evt.target.textContent.trim();
            if (newDescription === this.options.description) {
              return;
            }

            this.dispatchEvent(new BoardDescriptionUpdateEvent(newDescription));
          }}
        >
          ${this.options.description
            ? html`${this.options.description}`
            : nothing}
        </p>
        <div id="input" class="stopped">
          <div>
            ${this.state === "anonymous" || this.state === "valid"
              ? html`<button
                  id="run"
                  ?disabled=${this.#totalNodeCount === 0}
                  @click=${() => {
                    this.#renderRuntime();
                  }}
                >
                  Get Started
                </button>`
              : html`<button
                  id="sign-in"
                  ?disabled=${this.#totalNodeCount === 0}
                  @click=${() => {
                    this.dispatchEvent(new SignInRequestedEvent());
                  }}
                >
                  Sign In
                </button>`}
          </div>
        </div>
      </div>
    `;

    let addAssetModal: HTMLTemplateResult | symbol = nothing;
    if (this.showAddAssetModal) {
      addAssetModal = html`<bb-add-asset-modal
        .assetType=${this.#addAssetType}
        .allowedMimeTypes=${this.#allowedMimeTypes}
        @bboverlaydismissed=${() => {
          this.showAddAssetModal = false;
        }}
        @bbaddasset=${(evt: AddAssetEvent) => {
          if (!this.#assetShelfRef.value) {
            return;
          }

          this.showAddAssetModal = false;
          this.#assetShelfRef.value.addAsset(evt.asset);
        }}
      ></bb-add-asset-modal>`;
    }

    let content: HTMLTemplateResult | symbol = html`${
    !this.conversationRendered
      ? splashScreen
      : [
          this.#renderLog(),
          this.#renderInput(this.topGraphResult),
          addAssetModal,
        ]}`;

    if (this.isInSelectionState && this.topGraphResult.log.length === 0) {
      content = html`<div id="preview-step-not-run">
        <h1>No data available</h1>
        <p>This step has yet to run</p>
      </div>`;
    }

    return html`<section
      class=${classMap(classes)}
      style=${styleMap(styles)}
      @bbaddassetrequest=${(evt: AddAssetRequestEvent) => {
        this.showAddAssetModal = true;
        this.#addAssetType = evt.assetType;
        this.#allowedMimeTypes = evt.allowedMimeTypes;
      }}
    >
      <div id="content">${content}</div>
    </section>`;
  }

  async #renderRuntime() {
    this.conversationRendered = true;
    await this.#llmIntroduction();
  }

  #startFlow() {
    this.dispatchEvent(new RunEvent());
  }
  
  #flowIsNotStarted() {
    if (!this.topGraphResult) {
      return true;
    }
    if (this.topGraphResult.log.length === 0) {
      return true;
    }
    if (this.topGraphResult.status === "stopped") {
      return true;
    }
    if (!this.conversationRendered) {
      return true;
    }
    return false;
  }

  // Occurs when the flow is not started yet or alreayd end.
  async #processMessage() {
    if (!this.#inputRef.value) {
      return;
    }
  
    const inputs = this.#inputRef.value.querySelectorAll<
     HTMLTextAreaElement>("textarea");
     const values = [];
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
      }
      values.push(input.value);
      input.value = "";
    }
    const inputValues = values.join('');
    const inputEvent = this.#conversationManager.acceptUserQuery(inputValues);
    if (this.currentConversation) {
      this.conversationList.push(this.currentConversation);
      this.currentConversation = undefined;
    }
    this.conversationList.push({
      userInput: inputValues,
    })
    this.eventsQueue.push(inputEvent);
    this.requestUpdate();
    this.waitingLLMOutput = true;
    this.#startScrolling();
    const llmOutput = await this.#conversationManager.chatWithLLM();
    if (llmOutput) {
      if (llmOutput.error) {
        // error handling!
        this.conversationList.push({
          model: this.#renderManualLLmOutput(llmOutput),
        })
      } else {
        const llmContent = llmOutput.candidates ? llmOutput.candidates[0].content : undefined;
        if (this.#ifNeedToTriggerFlow(llmContent)) {
          this.#startFlow();
        } else {

          this.conversationList.push({
            model: this.#renderManualLLmOutput(llmOutput),
          })
          this.requestUpdate();
        }
      }
    }
    
    this.waitingLLMOutput = false;
  }

  async #llmIntroduction() {
    this.waitingLLMOutput = true;
    const introduction = await this.#conversationManager.introduceLLM();
    this.waitingLLMOutput = false;
    if (introduction.error) {
      const errorMessage = `Error code: ${introduction.error.code}, Details: ${introduction.error.message}`;
      // only log the error for now and use the default greeting.
      console.log(errorMessage);
      this.conversationList.push({model: html `Hi, what can I do for you?`});
    } else {
      this.conversationList.push({ model: this.#renderManualLLmOutput(introduction) });
    }
    this.requestUpdate();
  }

  #startScrolling() {
    setTimeout(() => {
      // Always scroll to the bottom. We are using modifying the bottom element to control the scroll. 
        this.#scrollToLatestUserQuery(0);
      }, 
      100
    );
  }

  #ifNeedToTriggerFlow(output: GeminiLLMContent | undefined): boolean {
    if (!output) {
      return false;
    }
    if (output.parts && output.parts.length > 0) {
      const anyTrue = output.parts.find((part) => {
        if (!!((part as FunctionCallCapabilityPart).functionCall)) {
          return true;
        }
      });
      return !!anyTrue
    }
    return false;
  } 

  async #reset() {
    this.eventsQueue = [];
    this.currentRunEvents = [];
    this.conversationList = [];
    this.currentConversation = undefined;
    this.#conversationManager.initial(this.graph, this.tokenVendor);
  }


  #dispatchLLMContent(inputMap: [string, string]) {
    const [label, input] = inputMap;

    console.log(`this is the hidden label:${label} with input: ${input}`);
    const inputValues: OutputValues = {};
    
    inputValues['request'] = this.#toLLMContentWithTextPart(input) as NodeValue;

    this.dispatchEvent(
      new InputEnterEvent(
        // id is not used later. 
        '0', 
        inputValues, /* allowSavingIfSecret */ true)
    );
    
  }

  #renderActivity(topGraphResult: TopGraphRunResult) {
    let activityContents:
      | HTMLTemplateResult
      | Array<HTMLTemplateResult | symbol>
      | symbol = nothing;

    const currentItem = topGraphResult.log.at(-1);
    if (currentItem?.type === "error") {
      activityContents = html`
        <divclass="error">
          <p>We are sorry, but there was a problem with this agent.</p>
          <p>${extractError(currentItem.error)}</p>
        </div>
      `;
    } else if (
      currentItem?.type === "edge" &&
      topGraphResult.status === "paused"
    ) {
      // Attempt to find the most recent output. If there is one, show it
      // otherwise show any message that's coming from the edge.
      let lastOutput = null;
      for (let i = topGraphResult.log.length - 1; i >= 0; i--) {
        const result = topGraphResult.log[i];
        if (result.type === "edge" && result.descriptor?.type === "output") {
          lastOutput = result;
          break;
        }
      }

      // Render the output.
      if (lastOutput !== null) {
        activityContents = html`<bb-multi-output
          .showAsStatus=${true}
          .outputs=${lastOutput.value ?? null}
        ></bb-multi-output>`;
      }
    } else if (topGraphResult.status === "running") {
      let bubbledValue: HTMLTemplateResult | symbol = nothing;

      let idx = 0;
      let lastOutput: EdgeLogEntry | null = null;
      for (let i = topGraphResult.log.length - 1; i >= 0; i--) {
        const result = topGraphResult.log[i];
        if (result.type === "edge" && result.value && result.schema) {
          lastOutput = result;
          idx = i;
          break;
        }
      }

      if (lastOutput !== null && lastOutput.schema && lastOutput.value) {
        bubbledValue = html`${repeat(
          Object.entries(lastOutput.schema.properties ?? {}),
          () => idx,
          ([name, property]) => {
            if (!lastOutput.value) {
              return nothing;
            }

            if (property.type !== "string" && property.format !== "markdown") {
              return nothing;
            }

            const value = lastOutput.value[name];
            if (typeof value !== "string") {
              return nothing;
            }

            const classes: Record<string, boolean> = {};
            if (property.title) {
              classes[
                property.title.toLocaleLowerCase().replace(/\W/gim, "-")
              ] = true;
            }

            if (property.icon) {
              classes[property.icon.toLocaleLowerCase().replace(/\W/gim, "-")] =
                true;
            }

            return html`<div class=${classMap(classes)}>
              <h1>${property.title}</h1>
              ${markdown(value)}
            </div> `;
          }
        )}`;
      }

      activityContents = bubbledValue;
    } else {
      // Find the last item.
      let lastOutput = null;
      for (let i = topGraphResult.log.length - 1; i >= 0; i--) {
        const result = topGraphResult.log[i];
        if (result.type === "edge" && result.value) {
          lastOutput = result;
          break;
        }
      }

      if (lastOutput !== null) {
        activityContents = html`<bb-multi-output
          .outputs=${lastOutput.value ?? null}
        ></bb-multi-output>`;
      }
    }

    return html`<div id="activity">${activityContents}</div>`;
  }

    #renderManualLLmOutput(event: GeminiAPIOutputs) {
      const content = event;
      if (!content) {
        return nothing;
      }
      if (content.error) {
        const errorString = `Error code: ${content.error.code}, Details: ${content.error.message}`;
        return html `${errorString}`;
      } else {
        // We assume only text parts are here. 
        if (!content.candidates || !content.candidates[0]) return nothing;
       const textValue =  content.candidates[0].content?.parts
          .map((part) => {
            const textContent = (part as TextCapabilityPart).text;
            return textContent ?? "";
          }).join("");
          return html `
          ${markdown(textValue?? "")}
        `;  
      }
    }



    async #generateInput(output: EdgeLogEntry | null): Promise<[string, string] | undefined > {
      if (!output || !output.value || !output.schema) return undefined;
      const schema = output.schema;
      const titleMatch = output.descriptor?.metadata?.title === "User Input";
      if (!titleMatch) return undefined;
      const checkList = Object.entries(output.value).map(([name, outputValue]) => {
        const insideSchema = schema.properties?.[name];
        if (isLLMContent(outputValue) && outputValue.role === "user" && insideSchema) {
          return (outputValue.parts[0] as TextCapabilityPart).text;
          
          // return this.#LLMCanProvideAnswer(label);
        }
        return undefined;
      }); 
      const validInputs = checkList.filter(input => !!input);
      if (!validInputs || validInputs.length === 0) {
        return undefined;
      }
      return await this.#LLMCanProvideAnswer(validInputs[0]);
      
    }

    async #LLMCanProvideAnswer(question?: string): Promise<[string, string] | undefined> {
      // Hardcode for now to answer any question. 
      if (question) {
        const result = await this.#conversationManager.extractInput(question);
        if (result) {
          return [question, result];
        }
      }
      return undefined;
    }

  async firstUpdated() {
    // This is used to skip the start.
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const skipStart = urlParams.get('start') ?? '';
    if (this.graph) {
      this.#conversationManager.initial(this.graph, this.tokenVendor);
    }
    if (skipStart === 'true' && this.state === "anonymous" || this.state === "valid") {
      await this.#renderRuntime();
    }
  }
}



