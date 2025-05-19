/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css, nothing, HTMLTemplateResult, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
    agentspaceErrorContext,
    type AgentspaceErrorContent,
  } from "../../contexts/agentspace-error-context.js";

@customElement("bb-error-display")
export class ErrorDisplay extends LitElement {
  @state()
  accessor error: unknown | undefined = undefined;

  @consume({ context: agentspaceErrorContext })
  accessor agentspaceErrorContent!: AgentspaceErrorContent;


  static styles = css`
    * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        max-width: 500px;
        margin: 0 var(--bb-grid-size-2);
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

    #error-message {
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
        margin-bottom: var(--bb-grid-size-4);
    }
  `;

  render() {
    if (!this.error) {
        return nothing;
    }
   return html `
    <div id="error-message">
        <p>${this.#renderError()}</p>
        <button id="dismiss-button" @click=${this.#onClearError}>&#215</button>
    </div>
   `;
  }

  #renderError() {
    let error = this.error as
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

  #onClearError() {
    this.error = undefined;
  }

  willUpdate(changedProperties: PropertyValues) {
    
    if (changedProperties.has('agentspaceErrorContent') && this.agentspaceErrorContent) {
        this.error = this.agentspaceErrorContent.error;
    }
  }

  connectedCallback(): void {
      super.connectedCallback();
      this.error = this.agentspaceErrorContent?.error;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bb-error-display": ErrorDisplay;
  }
}