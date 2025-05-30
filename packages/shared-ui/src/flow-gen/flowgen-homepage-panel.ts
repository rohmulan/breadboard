/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as StringsHelper from "../strings/helper.js";
import { outlineButtonWithIcon } from "../styles/outline-button-with-icon.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { GraphDescriptor } from "@breadboard-ai/types";
import { consume } from "@lit/context";
import {
  GraphBoardServerBlankBoardEventForAgentspace, GraphBoardServerGeneratedBoardEvent,
  UtteranceEvent,
} from "../events/events.js";
import type { ExpandingTextarea } from "../elements/input/expanding-textarea.js";
import { icons } from "../styles/icons.js";
import "../elements/input/expanding-textarea.js";
import { FlowGenerator } from "./flow-generator.js";
import { AppCatalystApiClient } from "./app-catalyst.js";
import { classMap } from "lit/directives/class-map.js";
import {updateFlowBasedOnContext} from './agentspace-flow-generation-util.js';
import {
  agentspaceUrlContext,
  type AgentspaceFlowContent,
} from "../contexts/agentspace-url-context.js";
import { spinAnimationStyles } from "../styles/spin-animation.js";
import {
  type SigninAdapter,
  signinAdapterContext,
} from "../utils/signin-adapter.js";

const Strings = StringsHelper.forSection("ProjectListing");

type State =
  | { status: "initial" }
  | { status: "generating" }
  | { status: "error"; error: unknown };

const SAMPLE_INTENTS = [
  "Create a flow that takes a business name and description, searches information about the business, and generates a social media post with an eye-catching picture.",
  "Create a research agent agent that takes a product, performs research on the web, and produces a competitive analysis report about the product.",
  "Create an app that takes a movie plot description, and generates 3 scene descriptions, along with a compelling storyboard sketch for each scene.",
  "Create a workflow that takes a job description and a potential job candidate and generates a personalized recruitment email for the candidate. Do research about the candidate to personalize the email.",
];

const SAMPLE_INTENTS_ROTATION_MS = 7000;

@customElement("bb-flowgen-homepage-panel")
export class FlowgenHomepagePanel extends LitElement {
  static styles = [
    outlineButtonWithIcon,
    icons,
    spinAnimationStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 15px 0 0 0;
        --display-border-container: flex;
        --display-chips: block;
      }

      #dismiss-button {
        background: none;
        border: none;
        color: var(--bb-neutral-200);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: var(--bb-grid-size-5);
      }

      .dismiss-button:hover {
        color: var(--bb-neutral-400);
      }

      p {
        word-break: break-all;
      }

      #feedback {
        font: 400 var(--bb-title-small) / var(--bb-title-line-height-small)
          var(--bb-font-family);
        color: var(--bb-neutral-200);
        transition: var(--color-transition);
        background: var(--bb-neutral-800);
        border-radius: var(--bb-grid-size-2);
        padding-left: var(--bb-grid-size-5);
        padding-right: var(--bb-grid-size-5);
        word-break: break-all;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: var(--bb-grid-size-4);
      }

      #gradient-border-container {
        flex: 1;
        display: var(--display-border-container);
        align-items: center;
        width: 100%;
        background: linear-gradient(0deg, #fdf7f8, #f7f9fe);
        border-radius: 50px;
        padding: 10px;
        margin: 20px 0 0 0;
        transition: box-shadow 1s ease-out;
      }

      :host([highlighted]) #gradient-border-container {
        transition: box-shadow 200ms ease-in;
        box-shadow: 0 0 10px 4px rgb(255 0 0 / 20%);
      }

      bb-speech-to-text {
        --button-size: var(--bb-grid-size-8);
        --alpha-adjustment: 0;
        --background-color: transparent;
        --active-color: linear-gradient(
          rgb(177, 207, 250) 0%,
          rgb(198, 210, 243) 34%,
          rgba(210, 212, 237, 0.4) 69%,
          rgba(230, 217, 231, 0) 99%
        );
        margin-right: var(--bb-grid-size-2);
      }

      bb-expanding-textarea {
        flex: 1;
        width: 100%;
        background: #fff;
        color: var(--bb-neutral-900);
        border: none;
        border-radius: 40px;
        padding: 0.5lh 1lh;
        --min-lines: 1;
        --max-lines: 6;
        font: 400 var(--bb-title-small) / var(--bb-title-line-height-small)
          var(--bb-font-family);
        line-height: 20px;
        caret-color: var(--bb-ui-500);

        &::part(textarea)::placeholder {
          color: var(--bb-neutral-500);
        }
        > [slot~="submit"] {
          color: #3271ea;
        }
      }

      #chips {
        display: var(--display-chips);
        margin-top: 20px;

        & .bb-chip {
          font-size: 12px;
          color: #3399ff;
          background: #ebf5ff;
        }
      }

      .spin {
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .g-icon {
        font-variation-settings:
          "FILL" 0,
          "wght" 600,
          "GRAD" 0,
          "opsz" 48;
      }

      .agentspace-loading {
        display: flex;
        flex-direction: row;
        justify-content: center;
        background: white;
        border-radius: 15px;
        height: 85px;
        width: 366px;
        .spin-icon {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 16px;
          .large-icon {
            font-size: 28px;
            color: #3271ea;
          }
        }
        .loading-text {
          .first-line {
            font-size: 16px;
            margin-top: 1.5em;
            margin-bottom: 0;
          }
          .second-line {
            font-size: 14px;
            color: grey;
            margin-top: 0.5em;
          }
        }
        
      }
    `,
  ];

  @property()
  accessor prefilledValue = "";

  @property()
  accessor prefilledName = "";

  @property()
  accessor prefilledDescription = "";

  @consume({ context: signinAdapterContext })
  accessor signinAdapter: SigninAdapter | undefined = undefined;

  @consume({ context: agentspaceUrlContext })
  accessor agentspaceFlowContent!: AgentspaceFlowContent;

  @state()
  accessor #state: State = { status: "initial" };

  @property({ reflect: true, type: Boolean })
  accessor highlighted = false;

  @state()
  accessor #sampleIntentIndex = Math.floor(
    Math.random() * SAMPLE_INTENTS.length
  );

  #rotateSampleIntentTimerId?: ReturnType<typeof setInterval>;

  readonly #descriptionInput = createRef<ExpandingTextarea>();

  override connectedCallback() {
    super.connectedCallback();
    this.#rotateSampleIntentTimerId = setInterval(
      () =>
        (this.#sampleIntentIndex =
          (this.#sampleIntentIndex + 1) % SAMPLE_INTENTS.length),
      SAMPLE_INTENTS_ROTATION_MS
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.#rotateSampleIntentTimerId);
    this.#rotateSampleIntentTimerId = undefined;
  }

  override render() {
    const errorFeedback = html` <div id="feedback">
      <p>${this.#renderFeedback()}</p>
      <button id="dismiss-button" @click=${this.#onClearError}>&#215</button>
    </div>`;
    const statusFeedback = html`<p>${this.#renderFeedback()}</p>`;
    return [
      this.#renderInput(),
    ];
  }

  override async updated(changes: PropertyValues) {
    if (changes.has("#state") && this.#state.status === "error") {
      this.#descriptionInput.value?.focus();
      this.highlighted = true;
      setTimeout(() => (this.highlighted = false), 2500);
    }
  }

  #renderFeedback() {
    switch (this.#state.status) {
      case "initial": {
        return Strings.from("LABEL_WELCOME_CTA");
      }
      case "generating": {
        return Strings.from("LABEL_GENERATING_FLOW");
      }
      case "error": {
        let error = this.#state.error as
          | string
          | { message?: string }
          | { error: { message?: string } | string };
        if (typeof error === "object" && error !== null && "error" in error) {
          // Errors from Breadboard are often wrapped in an {error: <Error>}
          // structure. Unwrap if needed.
          error = error.error;
        }
        let message;
        if (typeof error === "object" && error !== null && "message" in error) {
          message = error.message;
        } else {
          message = String(error);
        }
        return html`<span class="error">${message}</span>`;
      }
      default: {
        this.#state satisfies never;
      }
    }
  }

  #renderInput() {
    const isGenerating = this.#state.status === "generating";
    if (isGenerating) return this.#renderAgentspaceLoading();
    return html`
      <div id="gradient-border-container">
        <bb-expanding-textarea
          ${ref(this.#descriptionInput)}
          .placeholder=${SAMPLE_INTENTS[this.#sampleIntentIndex]}
          .tabCompletesPlaceholder=${true}
          .disabled=${isGenerating}
          @change=${this.#onInputChange}
        >
          <bb-speech-to-text
            slot="mic"
            @bbutterance=${(evt: UtteranceEvent) => {
              if (!this.#descriptionInput.value) {
                return;
              }

              this.#descriptionInput.value.value = evt.parts
                .map((part) => part.transcript)
                .join("");
            }}
          ></bb-speech-to-text>
          <span
            slot="submit"
            class=${classMap({ "g-icon": true, spin: isGenerating })}
            >${isGenerating ? "progress_activity" : "spark"}</span
          >
        </bb-expanding-textarea>
      </div>
    `;
  }

  #renderAgentspaceLoading() {
    return html`
    <div class="agentspace-loading">
      <div class="spin-icon">
        <span class=${classMap({ "g-icon": true, spin: true, "large-icon": true })}>progress_activity</span>
      </div>
      <div class="loading-text ">
        <p class="first-line">Generating your agent</p>
        <p class="second-line">Your agent will open automatically when ready<p>
      </div>
    </div>
    
   `
  }

  firstUpdated() {
    const isIframe = this.agentspaceFlowContent.isIframe;
    if (isIframe)
    {
      const prefilledValue = this.agentspaceFlowContent.agentInstructions;
      if (!!prefilledValue) {
        const input = this.#descriptionInput?.value;
        if (input) {
          input.value = prefilledValue;
          input.focus();
          this.#onInputChange();
        }
        this.style.setProperty('--display-border-container', 'none');
        this.style.setProperty('--display-chips', 'none');
      } else {
        this.#state = { status: "generating" };
        this.dispatchEvent(new GraphBoardServerBlankBoardEventForAgentspace());
      }
    }
  }

  #onInputChange() {
    const input = this.#descriptionInput.value;
    const description = input?.value;
    if (description) {
      if (description === "/force generating") {
        this.#state = { status: "generating" };
        return;
      } else if (description === "/force initial") {
        this.#state = { status: "initial" };
        return;
      }
      this.#state = { status: "generating" };
      void this.#generateBoard(description)
        .then((graph) => this.#onGenerateComplete(graph))
        .catch((error) => this.#onGenerateError(error));
    }
  }

  #onClearError() {
    this.#state = { status: "initial" };
  }

  async #generateBoard(intent: string): Promise<GraphDescriptor> {
    if (!this.signinAdapter) {
      throw new Error(`No signinAdapter was configured`);
    }
    const generator = new FlowGenerator(
      new AppCatalystApiClient(this.signinAdapter)
    );
    const { flow } = await generator.oneShot({ intent: intent, agentspaceFlowContext: this.agentspaceFlowContent });
    this.#updateFlowBasedOnContext(flow);
    return flow;
  }

  #updateFlowBasedOnContext(flow: GraphDescriptor) {
    updateFlowBasedOnContext(flow, this.agentspaceFlowContent);
  }

  #onGenerateComplete(graph: GraphDescriptor) {
    if (this.#state.status !== "generating") {
      return;
    }
    this.dispatchEvent(
      new GraphBoardServerGeneratedBoardEvent(graph, { role: "assistant" })
    );
  }

  #onGenerateError(error: unknown) {
    if (this.#state.status !== "generating") {
      return;
    }
    console.error("Error generating board", error);
    this.#state = { status: "error", error };
    this.dispatchEvent(new GraphBoardServerBlankBoardEventForAgentspace({error}));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bb-describe-flow-panel": FlowgenHomepagePanel;
  }
}
