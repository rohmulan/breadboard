/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css, HTMLTemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { OverflowAction } from "../../../types/types";
import { styleMap } from "lit/directives/style-map.js";
import {
  AddAssetRequestEvent,
  OverflowMenuActionEvent,
} from "../../../events/events";
import { icons } from "../../../styles/icons";

const BUTTON_HEIGHT = 44;

@customElement("bb-add-asset-button")
export class AddAssetButton extends LitElement {
  @property({ type: Boolean })
  accessor disabled = false;

  @property()
  accessor showGDrive = false;

  @property()
  accessor supportedActions = {
    upload: true,
    youtube: true,
    drawable: true,
    gdrive: false,
  };

  @property()
  accessor allowedUploadMimeTypes: string | null = null;

  @property()
  accessor anchor: "above" | "below" = "below";

  @state()
  accessor _showOverflowMenu = false;

  @state()
  accessor _assetType = "file";

  static styles = [
    icons,
    css`
      :host {
        display: flex;
        align-items: flex-end;
        position: relative;
        width: var(--button-size, 40px);
        height: var(--button-size, 40px);
      }

    #add-asset {
      width: var(--button-size, 40px);
      height: var(--button-size, 40px);
      border: none;
      font-size:22px;
      background: #f8fafd;
      color: #747775;
      flex: 0 0 auto;
      border-radius: var(--button-border-radius, 50%);
      transition: opacity 0.3s cubic-bezier(0, 0, 0.3, 1);

        &:not([disabled]) {
          cursor: pointer;

          &:focus,
          &:hover {
            color: #444746;
          }
        }
      }

      bb-overflow-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: min-content;
        --border-color: var(--s-80);
        --inner-border-color: var(--s-80);
        --background-color: var(--s-90);
        --text-color: var(--p-15);
      }
    `,
  ];

  #overflowMenu: { x: number; y: number } = { x: 0, y: 0 };

  render() {
    let overflowMenu: HTMLTemplateResult | symbol = nothing;
    if (this._showOverflowMenu) {
      const actions: OverflowAction[] = [];

      if (this.supportedActions.upload) {
        actions.push({
          icon: "upload",
          name: "upload",
          title: "Upload from Device",
        });
      }

      if (this.supportedActions.youtube) {
        actions.push({
          icon: "youtube",
          name: "youtube",
          title: "Add YouTube Video",
        });
      }

      if (this.supportedActions.gdrive && this.showGDrive) {
        actions.push({
          icon: "gdrive",
          title: "Add from Google Drive",
          name: "gdrive",
        });
      }

      if (this.supportedActions.drawable) {
        actions.push({
          icon: "drawable",
          name: "drawable",
          title: "Add a Drawing",
        });
      }

      if (this.supportedActions.webcamVideo) {
        actions.push({
          icon: "videocam",
          name: "webcam-video",
          title: "Add a Webcam Video",
        });
      }

      if (this.anchor === "above") {
        this.#overflowMenu.y -= 12; // Clearance.
        this.#overflowMenu.y -= actions.length * BUTTON_HEIGHT; // Menu height.
      }

      overflowMenu = html`<bb-overflow-menu
        style=${styleMap({
          left: `${this.#overflowMenu.x}px`,
          top: `${this.#overflowMenu.y}px`,
        })}
        .actions=${actions}
        .disabled=${false}
        @bboverflowmenuaction=${(evt: OverflowMenuActionEvent) => {
          evt.stopImmediatePropagation();
          this._showOverflowMenu = false;

          this.dispatchEvent(
            new AddAssetRequestEvent(evt.action, this.allowedUploadMimeTypes)
          );
        }}
        @bboverflowmenudismissed=${() => {
          this._showOverflowMenu = false;
        }}
      ></bb-overflow-menu>`;
    }

    return html`<button
        ?disabled=${this.disabled}
        @click=${(evt: Event) => {
          if (!(evt.target instanceof HTMLButtonElement)) {
            return;
          }

          const bounds = evt.target.getBoundingClientRect();
          if (this.useGlobalPosition) {
            this.#overflowMenu.x = bounds.x;
            this.#overflowMenu.y = bounds.bottom + 10;
          } else {
            this.#overflowMenu.x = evt.target.offsetLeft - 120;
            this.#overflowMenu.y =
               evt.target.offsetTop + bounds.height;
          }

          this._showOverflowMenu = true;
        }}
        id="add-asset"
      >
        <span class="g-icon">add_circle</span>
      </button>
      ${overflowMenu}`;
  }
}
