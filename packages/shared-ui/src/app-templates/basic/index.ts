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
  STATUS
} from "../../types/types";
import * as StringsHelper from "../../strings/helper.js";
const Strings = StringsHelper.forSection("AppPreview");
import Mode from "../shared/styles/icons.js";
import Animations from "../shared/styles/animations.js";
import AppTemplatesStyle from "./index-style.js";
import ThemeStyle from "./theme-style";
import "./generating-loader/generating-loader.js";

import { classMap } from "lit/directives/class-map.js";
import {
  GraphDescriptor,
  InspectableRun,
  InspectableRunSecretEvent,
  isLLMContent,
  isTextCapabilityPart,
  InspectableRunEvent,
  InspectableRunNodeEvent
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
import { AssetShelf } from "../../elements/elements";
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
import { BehaviorSubject, takeUntil, first} from "rxjs";
interface Turn {
  query?: string;
  reply? : TopGraphRunResult;
  fixedReply?: string;
}
import { maybeConvertToYouTube } from "../../utils/substitute-input";
import { transpileModule } from "typescript";

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

  @query('.conversations')
  accessor conversationScroller!: HTMLElement;

  @queryAll('.question-wrapper')
  accessor userInputs!: NodeList;

  #resizeObserver? : ResizeObserver;



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
  ];

  #inputRef: Ref<HTMLDivElement> = createRef();
  #assetShelfRef: Ref<AssetShelf> = createRef();
  #turns: Turn[] = [];

  #renderControls(topGraphResult: TopGraphRunResult) {
    if (topGraphResult.currentNode?.descriptor.id) {
      this.#nodesLeftToVisit.delete(topGraphResult.currentNode?.descriptor.id);
    }

     // Hide controls
    return html`<div id="controls">
      <button
        id="back"
        @click=${() => {
          this.dispatchEvent(new StopEvent(true));
        }}
      >
        Back
      </button>

      <div
        id="older-data"
        class=${classMap({
          active: this.isInSelectionState && this.showingOlderResult,
        })}
      >
        Viewing data from an earlier step. Newer data is available.
      </div>
    </div>`;
  }

  #renderIntroduction(fixedReply: string | undefined) {
    const myself = 'introduction';
    return html `
    <div class="summary introduction">
      <text-streamer
        .text=${fixedReply}
        .caller=${myself}
        @gen-introduction-complete=${this.#readyToRenderTurns}>
      </text-streamer>
    </div>`;
  }

  #readyToRenderTurns() {
  }

  #renderOutput(topGraphResult: TopGraphRunResult) {
    let outputContents: HTMLTemplateResult | symbol = nothing;
    let lastOutput = null;
    const currentItem = topGraphResult.log.at(-1);
    
    if (currentItem?.type === "edge" && topGraphResult.status === 'stopped') {
      lastOutput = currentItem;
      if (lastOutput !== null) {
        outputContents = html`<bb-multi-output
          .outputs=${lastOutput.value ?? null}
        ></bb-multi-output>`;
      }
    }

    if (outputContents === nothing) {
      return nothing;
    }
    return html`<div id="activity" class="turn last">${outputContents}</div>`;
  }


  #renderFullConversation() {
      const run = this.run ?? null;
      const events = run?.events ?? [];
      const eventPosition = events.length - 1;
  
      const hideLast = this.status === STATUS.STOPPED;
      const graphUrl = this.graph?.url ? new URL(this.graph.url) : null;
      const nextNodeId = this.topGraphResult?.currentNode?.descriptor.id ?? null;
  
      return html`
        <div id="board-activity-container">
          <bb-board-conversation
            .graphUrl=${graphUrl}
            .run=${run}
            .events=${events}
            .eventPosition=${eventPosition}
            .showExtendedInfo=${false}
            .showLogTitle=${false}
            .logTitle=${"Run"}
            .hideLast=${hideLast}
            .showDebugControls=${false}
            .nextNodeId=${nextNodeId}
            .waitingMessage=${""}
            name=${Strings.from("LABEL_PROJECT")}
          ></bb-board-conversation>
        </div>
      `;
  }
  
  #renderActivity(topGraphResult: TopGraphRunResult) {
    let activityContents:
      | HTMLTemplateResult
      | Array<HTMLTemplateResult | symbol>
      | symbol = nothing;

    const currentItem = topGraphResult.log.at(-1);
    if (currentItem?.type === "error") {
      activityContents = html`
        <details class="error">
          <summary>
            <h1>We are sorry, but there was a problem with this flow.</h1>
            <p>Tap for more details</p>
          </summary>
          <div>
            <p>${extractError(currentItem.error)}</p>
          </div>
        </details>
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
          .outputs=${lastOutput.value ?? null}
        ></bb-multi-output>`;
      }
    } else if (topGraphResult.status === "running") {
      // TODO: move this into conversations.
      let status: HTMLTemplateResult | symbol = nothing;
      let bubbledValue: HTMLTemplateResult | symbol = nothing;

      // if (topGraphResult.currentNode?.descriptor.metadata?.title) {
      //   status = html`<div id="status">
      //     ${topGraphResult.currentNode.descriptor.metadata.title} 
      //   </div>`;
      // }

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

      activityContents = [bubbledValue, status];
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
        activityContents = html`
        <bb-multi-output
          .outputs=${lastOutput.value ?? null}
        ></bb-multi-output>`;
      }
    }

    return html`
    <div id="activity">
      ${activityContents}
    </div>
  `;
  }

  #toLLMContentWithTextPart(text: string): NodeValue {
    return { role: "user", parts: [{ text }] };
  }

  #renderLog(topGraphResult: TopGraphRunResult) {
    return html`
    <div class="conversations">
      <div class="conversations-content">
        ${this.#renderIntro()}
        ${this.#renderFullConversation()} 
        ${topGraphResult.status === 'running'
          ? html`
          <div class="turn last loader">
            <generating-loader
                .currentText=${topGraphResult.currentNode?.descriptor?.metadata?.title}
              ></generating-loader>
          </div>
              `
          : nothing}
      </div>
    </div>
    `
  }

  #renderTurns(topGraphResult: TopGraphRunResult) {
    const logs = topGraphResult.log.filter((logEntry) => logEntry.type === "edge");
    // isReadyToRenderTurns is determined by the event from text streamer. Once we get the event that introduction is printed
    // we can continue render turns.
      return  repeat(logs, (logEntry, index)=>{
        if(logEntry.descriptor?.type === 'input') {
          //This means there is a user input lets fetch both the question and reply
          const props = Object.keys(logEntry.schema?.properties ?? {});
          const lastLog = index === (logs.length - 1);
          return html`
              ${repeat(props, (propKey, index)=>{
                const flowquery = logEntry.schema?.properties?.[propKey].description;
                const userResponse = logEntry.value?.[propKey];
                const lastPropKey = index === (props.length - 1);
  
                return html`
                <div class="turn ${classMap({
                  'last': lastLog && lastPropKey && topGraphResult.status !== 'running'})}">
                ${this.#renderUserInputLabel(flowquery)}
                ${userResponse && this.#renderUserInput(userResponse)}
                </div>
              `
            })}
          `
        }
        })
  
  }

  #renderUserInput(input: NodeValue) {
    if(input && typeof input === 'object' &&  input['parts' as keyof typeof input] ) {
      return html `
      <div class="question-block">
        <div class="question-wrapper">
          <p class="question-bubble">${input['parts' as keyof typeof input][0]['text']}</p>
        </div>
      </div>
        `;
    }
    return html `
      <div class="question-block">
        <div class="question-wrapper">
          <p class="question-bubble">${input}</p>
        </div>
      </div>
        `;
  }

  #renderUserInputLabel(userInput: string | undefined) {
    return html `
    <div class="summary">
      <text-streamer 
        .text=${userInput}>
      </text-streamer>
    </div>`;
  }

  #renderIntro() {
    const intro = `Hello, this is ${this.graph?.title} and this is what I can do: ${this.graph?.description}`
    return this.#renderIntroduction(intro);

}


// Right now, it's the same as scroll to the bottom.
#scrollToLatestUserQuery(behavior: ScrollBehavior = 'smooth') {
  const calculatedTop =  this.conversationScroller.scrollHeight -
      this.#getLastTurnHeight() - 10;
  this.conversationScroller?.scrollTo({
    top: calculatedTop,
    behavior,
  });
}

#getLastTurnHeight() {
  return this.renderRoot.querySelector('.turn.last')?.clientHeight ?? 0;
}

#getLastUserInputHeight() {
  const nodes = this.renderRoot.querySelectorAll('.question-block');
  if (!!nodes && nodes.length > 0) {
    const lastNode = nodes.item(nodes.length - 1);
    return lastNode.clientHeight;
  }
  return  0;
}

#calculateChatHeightAndPropagateItToConversation() {
  if (!this.conversationScroller) return;
  const height = this.conversationScroller.clientHeight;
  const introductionHeight = this.renderRoot.querySelector('.introduction')?.clientHeight ?? 0;
  const userInputHeight = this.#getLastUserInputHeight();
  this.conversationScroller.style.setProperty(
    '--conversation-client-height',
    `${height - (userInputHeight === 0? introductionHeight : userInputHeight) - 40 - /* small padding to avoid parasitic scrollbar */ 3}px`,
  );
}

#disableTyping() {
  const topGraphResult = this.topGraphResult;
  console.log(topGraphResult);
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
      if (!this.#inputRef.value) {
        return;
      }

      let stringInput = "";

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
            inputValues[input.name] = this.#toLLMContentWithTextPart(value);
          } else if (input.dataset.type === "llm-content-array") {
            inputValues[input.name] = [this.#toLLMContentWithTextPart(value)];
          } else {
            inputValues[input.name] = value;
          }

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

      this.dispatchEvent(
        new InputEnterEvent(id, inputValues, /* allowSavingIfSecret */ true)
      );
      setTimeout(() => {
          this.#scrollToLatestUserQuery();
        }, 
        100
      );
    };

    let inputContents: HTMLTemplateResult | symbol = nothing;
    let active = false;
    const currentItem = topGraphResult.log.at(-1);
    if (currentItem?.type === "edge") {
      const props = Object.entries(currentItem.schema?.properties ?? {});

      const controls = html`<div class="controls">
      <div class="action-group">
          <bb-add-asset-button
            .anchor=${"above"}
            .useGlobalPosition=${false}
            .showGDrive=${this.showGDrive}
          ></bb-add-asset-button>
          <button class="search-button">
            <svg xmlns="http://www.w3.org/2000/svg" 
            width="24" height="24" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="rgb(116, 119, 117)" 
            stroke-width="1">
              <path
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"
              />
            </svg>
            <span class="text">Search</span>
          </button>
          <button class="source-button">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="rgb(116,119,117)">
              <path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
            <span class="text">Sources</span>
          </button>
          </div>
          <div class="action-group">
            ${topGraphResult.status !== 'running' ? 
              html`<button
              id="continue"
              ?disabled=${this.#checkIsEmpty()}
              @click=${() => {
                continueRun(currentItem.id ?? "unknown");
              }}
            >
              Continue
            </button>`
              : nothing}
            ${topGraphResult.status === 'running'
              ? html`
              <button id="stop"
              title="Stop execution"
              @click=${() => {
              this.dispatchEvent(new RunEvent());
              }}>
                <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24" height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(8, 66, 160)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
            </button>`
              : nothing}
            </div>
          </div>`;
        active = true;
        const valueIsDefined = currentItem.value !== undefined;
        const valueHasKeys =
          typeof currentItem.value === "object" &&
          Object.keys(currentItem.value).length > 0;
        const valueIsNonEmptyArray =
          Array.isArray(currentItem.value) && currentItem.value.length > 0;
        const disabled =
          valueIsDefined && (valueHasKeys || valueIsNonEmptyArray);

        inputContents = html`
     

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
                placeholder= ${"Search content or ask questions"}
                name=${name}
                type="text"
                data-type=${dataType}
                .value=${inputValue}
                ?disabled=${this.#disableTyping()}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!this.#checkIsEmpty()) {
                      continueRun(currentItem.id ?? "unknown");
                    }
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
    } else {
      inputContents = placeholder;
    }

    let status: "stopped" | "paused" | "running" | "finished" =
      topGraphResult.status;


    if (topGraphResult.status === "stopped" && topGraphResult.log.length > 0) {
      status = "finished";
    }

    this.#hasFocusableInput = active;

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
        if (!this.#checkIsEmpty()) {

          continueRun("unknown");
        }
      }}
      id="input"
      class=${classMap({ active, [status]: true })}
    >
      <div id="input-container" ${ref(this.#inputRef)}>${inputContents}</div>
      <div class="disclaimer">Generative AI may display inaccurate information, including about people, so double-check its responses.</div>
    </div>`;
  }

  #renderSecretInput() {
    if (this.run && this.run.events.at(-1)?.type === "secret") { 
    const secretEvent = this.run.events.at(-1) as InspectableRunSecretEvent;

    let active = true;
    // TODO: figure out what we should do for these secrets and remove display:none.
    let inputContents = html`
      <div class="user-input">
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
  }

  #renderConversations() {
    return html `
      <div class="conversations">
        <div class="conversations-content">
          ${map(this.#turns, (turn: Turn) => {
            return html `
              <div class="turn ${classMap({
                  'last': turn === this.#turns.at(-1),
                })}">
                ${when(turn.query, () => this.#renderQuery(turn.query))}
                ${when(!!turn.reply, () =>this.#renderSummary(turn.reply))}
                ${when(turn.fixedReply, () => this.#renderIntroduction(turn.fixedReply))}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  #renderQuery(query: string | undefined) {
    return html `
      <div class="question-block">
        <div class="question-wrapper">
          <p class="question-bubble">${query}</p>
        </div>
      </div>
        `;
  }

  #renderSummary(topGraphResult: TopGraphRunResult | undefined) {
    if (!!topGraphResult) {
      const value = topGraphResult.currentNode?.descriptor;
      return html `<div class="summary">${value}</div>`;
    } else {
      return html `<div class="summary">PLACEHOLDER</div>`;
    }
  }

  #totalNodeCount = 0;
  #nodesLeftToVisit = new Set<string>();
  protected willUpdate(changedProperties: PropertyValues): void {
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
    }

    if (typeof this.options.splashImage === "string") {
      styles["--splash-image"] = this.options.splashImage;
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
      </div>
      <div id="input" class="stopped">
        <div>
          ${this.state === "anonymous" || this.state === "valid"
            ? html`<md-filled-button
                id="run"
                ?disabled=${this.#totalNodeCount === 0}
                @click=${() => {
                  this.dispatchEvent(new RunEvent());
                }}
              >
                Start
              </md-filled-button>`
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
    `;

    let addAssetModal: HTMLTemplateResult | symbol = nothing;
    if (this.showAddAssetModal) {
      addAssetModal = html`<bb-add-asset-modal
        .assetType=${this.#addAssetType}
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

    let content: HTMLTemplateResult | symbol = html`${(styles[
      "--splash-image"
    ] &&
      this.topGraphResult.status === "stopped" &&
      this.topGraphResult.log.length === 0) ||
    this.#totalNodeCount === 0
      ? splashScreen
      : [
          this.#renderLog(this.topGraphResult),
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
      }}
    >
      <div id="content">${content}</div>
    </section>`;
  }
  

  firstUpdated() {
    // This is used to skip the start.
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const skipStart = urlParams.get('start') ?? '';
    if (skipStart === 'true' && this.state === "anonymous" || this.state === "valid") {
      this.dispatchEvent(new RunEvent());
    }
  }

  updated() {
    this.#calculateChatHeightAndPropagateItToConversation();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#calculateChatHeightAndPropagateItToConversation();
    })
    this.#resizeObserver.observe(this);
  }
}



