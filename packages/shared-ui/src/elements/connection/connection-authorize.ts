/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AuthorizeEvent } from "../../events/events";
import { SigninAdapter } from "../../utils/signin-adapter";
import { icons } from "../../styles/icons";

@customElement("bb-connection-authorize-view")
export class ConnectionAuthorizeView extends LitElement {
  static styles = [icons, css`
    @keyframes fadeAndZoomIn {
      from {
        opacity: 0;
        scale: 0.9 0.9;
      }
      to {
        opacity: 1;
        scale: 1 1;
      }
    }

    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100svw;
      height: 100svh;
      overflow: auto;
      background: var(--bb-ui-50);
      padding: var(--bb-grid-size-4);
      box-sizing: border-box;
    }

    #container {
      background: var(--bb-neutral-0);
      border-radius: var(--bb-grid-size-3);
      display: flex;
      flex-direction: column;
      padding: var(--bb-grid-size-9);
      box-shadow: var(--bb-elevation-5);
      animation: fadeAndZoomIn 0.5s cubic-bezier(0, 0, 0.3, 1);
      width: clamp(300px, 90%, 450px);
      max-height: 95%; /* Prevent container from exceeding viewport height */
      overflow-y: auto;
    }

    .flow-diagram-container {
      align-self: center;
    }

    h1 {
      margin: 0 0 var(--bb-grid-size-2) 0;
      padding: 0;
      font: 500 var(--bb-title-medium) / var(--bb-title-line-height-medium)
        var(--bb-font-family);
      color: var(--bb-neutral-800);
    }

    p {
      margin: 12px 0 var(--bb-grid-size-4) 0;
      font: var(--bb-body-medium);
      line-height: var(--bb-body-line-height-medium);
      color: var(--bb-neutral-700);
    }

    p:last-of-type {
       margin-bottom: var(--bb-grid-size-6);
    }

    .flow-diagram {
      align-self: center;
      width: 450px;
    }

    .authorize-container {
      display: flex;
      justify-content: end;
    }

    /* Button Styles */
    .authorize-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #0b57d0;
      color: var(--bb-neutral-0);
      border-radius: var(--bb-grid-size-16);
      padding: 0 var(--bb-grid-size-6);
      text-decoration: none;
      height: var(--bb-grid-size-10);
      font: 500 var(--bb-label-large) / var(--bb-label-line-height-large)
        var(--bb-font-family);
      transition: background-color 0.2s cubic-bezier(0, 0, 0.3, 1);
      border: none;
      cursor: pointer;
    }

    .authorize-button:hover,
    .authorize-button:focus {
      background-color: var(--bb-ui-600);
      outline: none;
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

    .spin-icon {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 16px;
      color: #3271ea;
    }
  `];

  private async _handleAuthorize() {
    if (!this.adapter) {
      return;
    }

    this.buttonClicked = true;
    const url = await this.adapter.getSigninUrl();
    window.open(url, '_blank');

    this.adapter.whenSignedIn(async (adapter) => {
      // The adapter is immutable, this callback will always return a new
      // copy with a new state, including picture and name.
      if (adapter.state === "valid") {
        this.dispatchEvent(new AuthorizeEvent());
      }
    });
  }

  private _reset() {
    this.buttonClicked = false;
  }

  @property()
  accessor adapter: SigninAdapter | null = null;

  @state()
  accessor buttonClicked = false;

  render() {
    if (!this.adapter) {
      return nothing;
    }

    if (this.adapter.state !== "signedout") return nothing;
    return html`
      <div id="container">
        <h1>Authorize Flow Builder</h1>
        <div class="flow-diagram-container">
          <img
            class="flow-diagram"
            src="/images/authorize-flow-diagram.svg"
            alt="Flow diagram illustration"
          />
        </div>
        <p>
          Flow Builder requires separate authorization to interact with
          necessary tools and APIs on your behalf. This is needed only the first
          time you access Flow Builder.
        </p>
        <p>Please grant permission to continue.</p>
        <div class="authorize-container">
          ${!this.buttonClicked? html `
                  <button class="authorize-button" @click=${this._handleAuthorize}>
                    Authorize
                  </button>
            `: html `
                   <div class="spin-icon">
                          <span class="g-icon spin">progress_activity</span>
                   </div>
                   <button class="authorize-button" @click=${this._reset}>
                    Reset
                  </button>
            `}
        </div>
      </div>
    `;
  }
}
