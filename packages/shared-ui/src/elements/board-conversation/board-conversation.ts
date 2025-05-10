/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as StringsHelper from "../../strings/helper.js";
const Strings = StringsHelper.forSection("ActivityLog");
const GlobalStrings = StringsHelper.forSection("Global");

import {
  BoardServer,
  InspectableRun,
  InspectableRunEvent,
  InspectableRunInputs,
  InspectableRunNodeEvent,
  InspectableRunSecretEvent,
  isLLMContent,
  isLLMContentArray,
  OutputValues,
  Schema,
  SerializedRun,
} from "@google-labs/breadboard";
import { LitElement, html, HTMLTemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import {
  InputEnterEvent,
  InputRequestedEvent,
  RunIsolatedNodeEvent,
} from "../../events/events.js";
import { map } from "lit/directives/map.js";
import { styleMap } from "lit/directives/style-map.js";
import { until } from "lit/directives/until.js";
import { markdown } from "../../directives/markdown.js";
import { SETTINGS_TYPE, TopGraphRunResult, UserInputConfiguration } from "../../types/types.js";
import { styles as activityLogStyles } from "./board-converation.styles.js";
import { SettingsStore } from "../../types/types.js";
import { UserInput } from "../elements.js";
import { formatError } from "../../utils/format-error.js";
import { guard } from "lit/directives/guard.js";
import { icons } from "../../styles/icons.js";
import {
  isLLMContentArrayBehavior,
  isLLMContentBehavior,
} from "../../utils/behaviors.js";
import "../../app-templates/basic/generating-loader/generating-loader.js";
import {ManualEvent} from "@breadboard-ai/shared-ui/app-templates/basic/conversation-manager/conversation-manager.js";
import { DataPart, TextCapabilityPart } from "../../app-templates/basic/gemini/gemini.js";
import { LLMContent } from "@breadboard-ai/types";

export interface ConversationElement {
  model? : HTMLTemplateResult | symbol;
  userInput?: string;
}

@customElement("bb-board-conversation")
export class BoardConversation extends LitElement {
  @property()
  accessor graphUrl: URL | null = null;

  @property({ reflect: false })
  accessor run: InspectableRun | null = null;

  @property({ reflect: false })
  accessor inputsFromLastRun: InspectableRunInputs | null = null;

  @property({ reflect: false })
  accessor events: (InspectableRunEvent | ManualEvent)[] | null = null;

  @property({ reflect: true })
  accessor eventPosition = 0;

  @property({ reflect: true })
  accessor logTitle = "Activity Log";

  @property()
  accessor waitingMessage = Strings.from("LABEL_WAITING_MESSAGE");

  @property({ reflect: true })
  accessor showExtendedInfo = false;

  @property({ reflect: true })
  accessor showLogTitle = true;

  @property()
  accessor settings: SettingsStore | null = null;

  @property()
  accessor boardServers: BoardServer[] = [];

  @property()
  accessor nextNodeId: string | null = null;

  @property()
  accessor scrollHeight: number = 0;

  @property()
  accessor loadingMessage: string = '';

  @property()
  accessor conversationList: ConversationElement[] = [];

  @state()
  accessor downloadStatus: "initial" | "generating" | "ready" = "initial";

  #newestEntry: Ref<HTMLElement> = createRef();
  #isHidden = false;

  #observer = new IntersectionObserver((entries) => {
    if (entries.length === 0) {
      return;
    }

    const [entry] = entries;
    if (!entry.rootBounds) {
      return;
    }

    this.#isHidden =
      entry.rootBounds.width === 0 && entry.rootBounds.height === 0;

    if (
      !this.#isHidden &&
      this.#newestEntry.value &&
      this.#newestEntry.value.querySelector(".user-required")
    ) {
      this.#newestEntry.value
        .querySelector(".user-required")
        ?.addEventListener("animationend", (evt: Event) => {
          if (!(evt.target instanceof HTMLElement)) {
            return;
          }

          evt.target.classList.remove("user-required");
        });
    }
  });


  static styles = [icons, activityLogStyles];

  protected updated(): void {
    setTimeout(() => {
      this.setLastUserInputHeight(this.scrollHeight);
    });
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.#observer.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.#observer.disconnect();
  }


  public setLastUserInputHeight(scrollHeight: number) {
    const nodes = this.renderRoot.querySelectorAll('.user-output');
    if (!!nodes && nodes.length > 0) {
      const lastNode = nodes.item(nodes.length - 1);
      let nextSibling = lastNode.nextElementSibling;
      let heightSum = lastNode.clientHeight;
      let lastHeight = 0;
      while(nextSibling) {
        heightSum += nextSibling.clientHeight;
        lastHeight = nextSibling.clientHeight;
        nextSibling = nextSibling.nextElementSibling;
      }
      // There are 20 padding top and 20 pdding down for scroller. So -40;
      const calculatedHeight = scrollHeight - heightSum + lastHeight - 40;
      this.style.setProperty('--min-last-activity-height', `${calculatedHeight}px`);
      return lastNode.clientHeight;
    }
    return  0;
  }


  render() {
    const waitingMessage =
      this.events && this.events.length
        ? nothing
        : html`<div id="click-run">${this.waitingMessage}</div>`;

    const loader =  html `
                    <section class="activity-entry blocker">
                      ${!!this.loadingMessage? 
                        html `
                            <generating-loader
                              .currentText=${this.loadingMessage}
                            ></generating-loader>
                            `: nothing
                          }
                          </section>
              `;
    console.log('conversation rendering');
    const conversations = this.conversationList.filter((element) => !!element);

    const events = conversations.map((element, index) => {
      if (element.model) {
        const classes: Record<string, boolean> = {
                          "activity-entry": true,
                          running: !!this.loadingMessage,
                          last: (index === conversations.length - 1) && !this.loadingMessage,
                        };
                        return html`<section class="${classMap(classes)}">
                                      ${until(element.model)}
                                    </section>`
      } else {
        return html `
                  <section class="user-output">
                    <div class="output-container">
                      <div class=output-port>
                        <div class="flow">
                        </div>
                        <div class="user">
                          <div class="value-container">
                            <div class="value">
                              <span>
                                <p class="manual-input">${element.userInput}</p>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
        `;
      }
    });

    return [waitingMessage, events, loader];
  }
}
