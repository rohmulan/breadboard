/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as StringsHelper from "../../strings/helper.js";
const Strings = StringsHelper.forSection("ProjectListing");

import { LitElement, html, css, nothing, PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  GraphBoardServerAddEvent,
  GraphBoardServerBlankBoardEvent,
  GraphBoardServerDisconnectEvent,
  GraphBoardServerLoadRequestEvent,
  GraphBoardServerRefreshEvent,
  GraphBoardServerRenewAccessRequestEvent,
  GraphBoardServerSelectionChangeEvent,
} from "../../events/events";
import { map } from "lit/directives/map.js";
import { until } from "lit/directives/until.js";
import { BoardServer, GraphProviderStore } from "@google-labs/breadboard";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import "../../flow-gen/describe-flow-panel.js";
import "./homepage-search-button.js";
import type { HomepageSearchButton } from "./homepage-search-button.js";
import { icons } from "../../styles/icons.js";
import "./gallery.js";

const SHOW_OTHER_PEOPLES_BOARDS_KEY =
  "bb-project-listing-show-other-peoples-boards";
const MODE_KEY = "bb-project-listing-mode";
const OVERFLOW_MENU_CLEARANCE = 4;

@customElement("bb-project-listing")
export class ProjectListing extends LitElement {
  @property()
  accessor boardServers: BoardServer[] = [];

  @property()
  accessor boardServerNavState: string | null = null;

  @property({ reflect: true })
  accessor visible = false;

  @property()
  accessor url: string | null = null;

  @property()
  accessor version = "dev";

  @property()
  accessor gitCommitHash = "unknown";

  @property()
  accessor selectedBoardServer = "Browser Storage";

  @property()
  accessor selectedLocation = "Browser Storage";

  @state()
  accessor filter: string | null = null;

  @state()
  accessor showOtherPeoplesBoards = false;

  @state()
  accessor showBoardServerOverflowMenu = false;
  #overflowMenu = {
    x: 0,
    y: 0,
  };

  @state()
  accessor showAdditionalSources = true;

  @state()
  accessor mode: "detailed" | "condensed" = "detailed";

  @property()
  accessor recentItemsKey: string | null = null;

  @property()
  accessor recencyType: "local" | "session" = "session";

  #selectedIndex = 0;

  static styles = [
    icons,
    css`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        background: var(--bb-neutral-0);
      }

      #wrapper {
        margin: 0 auto;
        padding: 0 var(--bb-grid-size-8) var(--bb-grid-size-12)
          var(--bb-grid-size-8);
        width: 100%;
        max-width: 1200px;
        min-height: 100%;

        & #hero {
          padding: 0 16px 28px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;

          & h1 {
            font: 400 var(--bb-title-xx-large) /
              var(--bb-title-line-height-xx-large) var(--bb-font-family);
            padding: 0;
            margin: 76px 0 0 0;

            & .gradient {
              background: linear-gradient(
                0deg,
                #217bfe,
                #078efb,
                #a190ff,
                #bd99fe
              );
              background-clip: text;
              -webkit-text-fill-color: transparent;
            }
          }

          & #cta {
            font: 400 var(--bb-title-small) / var(--bb-title-line-height-small)
              var(--bb-font-family);
            color: var(--bb-neutral-700);
            padding: 0;
            margin: 8px 0 0 0;
          }

          & bb-describe-flow-panel {
            margin-top: 32px;
            width: 100%;
            max-width: 976px;
          }
        }

        & #board-listing {
          margin-top: 24px;
        }

        & #loading-message,
        & #no-projects {
          color: var(--bb-neutral-700);
          font: 400 var(--bb-body-medium) / var(--bb-body-line-height-medium)
            var(--bb-font-family);
          margin: var(--bb-grid-size-10) 0;
          text-align: center;

          & p {
            margin: 0 0 var(--bb-grid-size) 0;
          }
        }

        & #buttons {
          order: 0;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;

          & #mode-container {
            display: flex;
            height: var(--bb-grid-size-10);
            padding-top: var(--bb-grid-size);

            & input {
              display: none;
            }

            & label {
              display: flex;
              align-items: center;
              font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
                var(--bb-font-family);
              cursor: pointer;

              & .detailed {
                display: block;
                width: 52px;
                height: var(--bb-grid-size-9);
                border: 1px solid var(--bb-neutral-300);
                border-radius: var(--bb-grid-size-16) 0 0 var(--bb-grid-size-16);
                background: var(--bb-ui-50) var(--bb-icon-grid-view) 16px
                  center / 20px 20px no-repeat;
              }

              & .condensed {
                display: block;
                width: 52px;
                height: var(--bb-grid-size-9);
                border: 1px solid var(--bb-neutral-300);
                border-left: none;
                border-radius: 0 var(--bb-grid-size-16) var(--bb-grid-size-16) 0;
                margin-right: var(--bb-grid-size-4);
                background: var(--bb-neutral-0) var(--bb-icon-dehaze) 14px
                  center / 20px 20px no-repeat;
              }

              & .sort-by-icon {
                width: 20px;
                height: 20px;
                background: var(--bb-icon-sort-by) center center / 20px 20px
                  no-repeat;
                margin-right: var(--bb-grid-size);
              }
            }

            /* Checked means condensed */
            & input:checked + label {
              & .detailed {
                background-color: var(--bb-neutral-0);
              }

              & .condensed {
                background-color: var(--bb-ui-50);
              }
            }

            & bb-homepage-search-button {
              margin-left: 8px;
            }
          }
        }

        & #new-project-container {
          display: flex;
          justify-content: center;

          & #new-project {
            color: #004a77;
            background-color: #c2e7ff;
            font: 500 var(--bb-title-small) / var(--bb-title-line-height-small)
              var(--bb-font-family);
            display: flex;
            align-items: center;
            border-radius: 100px;
            border: none;
            padding: 6px 12px;
            transition: background 0.2s cubic-bezier(0, 0, 0.3, 1);
            cursor: pointer;

            & > .g-icon {
              margin-right: 4px;
            }

            &:hover,
            &:focus {
              background-color: #96d6ff;
            }
          }
        }

        & #location-selector-container {
          display: flex;
          align-items: center;

          & #location-selector {
            margin: var(--bb-grid-size-5) 0;
            padding: 0;
            border: none;
          }
        }

        & #list-other-peoples-boards-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
            var(--bb-font-family);
          margin-left: var(--bb-grid-size-8);
        }

        & #content {
          display: flex;
          flex-direction: column;

          & .gallery-wrapper {
            order: 1;
          }
        }
      }

      .gallery-title {
        font: 400 var(--bb-title-large) / var(--bb-title-line-height-large)
          var(--bb-font-family);
      }
      .gallery-description {
        font: 400 var(--bb-label-large) / var(--bb-label-line-height-large)
          var(--bb-font-family);
      }

      #board-server-settings {
        width: 32px;
        height: 32px;
        background: var(--bb-neutral-100) var(--bb-icon-folder-managed) center
          center / 20px 20px no-repeat;
        border-radius: var(--bb-grid-size);
        border: none;
        font-size: 0;
        flex: 0 0 auto;
        margin-left: var(--bb-grid-size);
      }

      #overflow-menu {
        z-index: 1000;
        display: grid;
        grid-template-rows: var(--bb-grid-size-11);
        position: fixed;
        box-shadow:
          0px 4px 8px 3px rgba(0, 0, 0, 0.05),
          0px 1px 3px rgba(0, 0, 0, 0.1);
        background: var(--bb-neutral-0);
        border: 1px solid var(--bb-neutral-300);
        border-radius: var(--bb-grid-size-2);
        overflow: auto;
        pointer-events: auto;

        & button {
          display: flex;
          align-items: center;
          background: none;
          margin: 0;
          padding: var(--bb-grid-size-3) var(--bb-grid-size-6)
            var(--bb-grid-size-3) var(--bb-grid-size-3);
          border: none;
          border-bottom: 1px solid var(--bb-neutral-300);
          text-align: left;
          cursor: pointer;

          &:hover,
          &:focus {
            background: var(--bb-neutral-50);
          }

          &:last-of-type {
            border: none;
          }

          &::before {
            content: "";
            width: 20px;
            height: 20px;
            margin-right: var(--bb-grid-size-3);
          }

          &#add-new-board-server::before {
            background: var(--bb-icon-add) center center / 20px 20px no-repeat;
          }

          &#rename-board-server::before {
            background: var(--bb-icon-edit) center center / 20px 20px no-repeat;
          }

          &#refresh-board-server::before {
            background: var(--bb-icon-refresh) center center / 20px 20px
              no-repeat;
          }

          &#remove-board-server::before {
            background: var(--bb-icon-delete) center center / 20px 20px
              no-repeat;
          }
        }
      }

      #app-version {
        font: 400 var(--bb-body-x-small) / var(--bb-body-line-height-x-small)
          var(--bb-font-family);
        color: var(--bb-neutral-500);
        position: relative;
        text-align: right;
        margin-top: -32px;
        padding: 0 var(--bb-grid-size-3);
      }

      .g-icon {
        font-variation-settings:
          "FILL" 0,
          "wght" 600,
          "GRAD" 0,
          "opsz" 48;
      }
    `,
  ];

  #wrapperRef: Ref<HTMLDivElement> = createRef();
  #searchRef: Ref<HTMLInputElement> = createRef();
  #hideBoardServerOverflowMenuBound =
    this.#hideBoardServerOverflowMenu.bind(this);
  #attemptFocus = false;
  #attemptScrollUpdate = false;
  #recentItems: string[] = [];

  connectedCallback(): void {
    super.connectedCallback();

    this.addEventListener("click", this.#hideBoardServerOverflowMenuBound);

    this.showOtherPeoplesBoards =
      this.showAdditionalSources &&
      globalThis.localStorage.getItem(SHOW_OTHER_PEOPLES_BOARDS_KEY) === "true";
    this.#attemptFocus = true;

    this.mode =
      globalThis.localStorage.getItem(MODE_KEY) === "condensed"
        ? "condensed"
        : "detailed";
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.removeEventListener("click", this.#hideBoardServerOverflowMenuBound);
  }

  protected willUpdate(
    changedProperties:
      | PropertyValueMap<{
          boardServerNavState: string | null;
          boardServers: BoardServer[];
          selectedBoardServer: string;
          selectedLocation: string;
          showOtherPeoplesBoards: boolean;
          mode: boolean;
          filter: string | null;
        }>
      | Map<PropertyKey, unknown>
  ): void {
    if (
      changedProperties.has("selectedLocation") ||
      changedProperties.has("selectedBoardServer")
    ) {
      this.recentItemsKey = this.#createUrl(
        this.selectedBoardServer,
        this.selectedLocation
      );
      this.#restoreRecentItemsForKey(this.recentItemsKey);
    }

    if (
      changedProperties.has("boardServerNavState") ||
      changedProperties.has("boardServers") ||
      changedProperties.has("selectedLocation") ||
      changedProperties.has("selectedBoardServer") ||
      changedProperties.has("showOtherPeoplesBoards") ||
      changedProperties.has("filter") ||
      changedProperties.has("mode")
    ) {
      this.#selectedIndex = 0;
      this.#boardServerContents = this.#loadBoardServerContents();
    }
  }

  protected updated(): void {
    // Wait a frame because the overlay animation seems to negate the ability to
    // focus the search control and scroll the contents.
    requestAnimationFrame(() => {
      this.#highlightSelectedBoard();

      if (this.#attemptFocus) {
        this.#attemptFocus = false;
        this.#focusSearchField();
      }
    });
  }

  #hideBoardServerOverflowMenu(evt: Event) {
    if (evt instanceof KeyboardEvent && evt.key !== "Escape") {
      return;
    }

    evt.stopImmediatePropagation();
    const [top] = evt.composedPath();
    if (
      top &&
      top instanceof HTMLButtonElement &&
      top.id === "board-server-settings"
    ) {
      return;
    }

    this.showBoardServerOverflowMenu = false;
  }

  #highlightSelectedBoard() {
    if (!this.#wrapperRef.value) {
      return;
    }

    const selected =
      this.#wrapperRef.value.querySelector<HTMLButtonElement>(
        "button.selected"
      );
    selected?.classList.remove("selected");

    const boardList =
      this.#wrapperRef.value.querySelectorAll<HTMLButtonElement>(
        `button.board`
      );

    const newlySelected = boardList[this.#selectedIndex];
    newlySelected?.classList.add("selected");

    if (!this.#attemptScrollUpdate) {
      return;
    }
    this.#attemptScrollUpdate = false;
    this.#scrollToSelectedBoard();
  }

  #returnToDefaultStore() {
    if (!this.boardServers.length) {
      return;
    }

    const mainBoardServer = this.boardServers[0];
    const selectedBoardServer = mainBoardServer.name;
    if (mainBoardServer.items().size === 0) {
      return;
    }

    const boardServerNames = [...mainBoardServer.items().keys()];
    const selectedLocation = boardServerNames[0];

    if (
      selectedBoardServer !== this.selectedBoardServer &&
      selectedLocation !== this.selectedLocation
    ) {
      this.selectedBoardServer = selectedBoardServer;
      this.selectedLocation = selectedLocation;

      this.dispatchEvent(
        new GraphBoardServerSelectionChangeEvent(
          this.selectedBoardServer,
          this.selectedLocation
        )
      );
    }
  }

  #boardServerContents: Promise<GraphProviderStore | null> =
    Promise.resolve(null);
  async #loadBoardServerContents() {
    const boardServer =
      this.boardServers.find(
        (boardServer) => boardServer.name === this.selectedBoardServer
      ) || this.boardServers[0];

    if (!boardServer) {
      this.#returnToDefaultStore();
      return null;
    }

    await boardServer.ready();

    let store = boardServer.items().get(this.selectedLocation);
    if (!store) {
      store = [...boardServer.items().values()].find(
        (boardServer) =>
          boardServer.url && boardServer.url === this.selectedLocation
      );
    }
    if (!store) {
      this.#returnToDefaultStore();
      return null;
    }

    return store;
  }

  #scrollToSelectedBoard() {
    if (!this.#wrapperRef.value) {
      return;
    }

    const selected =
      this.#wrapperRef.value.querySelector<HTMLButtonElement>(
        "button.selected"
      );
    if (!selected) {
      return;
    }

    selected.scrollIntoView({
      behavior: "instant",
      block: "nearest",
      inline: "nearest",
    });
  }

  #restoreRecentItemsForKey(key: string | null) {
    if (!key) {
      return;
    }

    const store =
      this.recencyType === "local"
        ? globalThis.localStorage
        : globalThis.sessionStorage;
    try {
      const data = store.getItem(`bb-project-listing-${key}`);
      if (!data) {
        return;
      }
      const items = JSON.parse(data);
      if (
        !Array.isArray(items) ||
        !items.every((item) => typeof item === "string")
      ) {
        return;
      }

      this.#recentItems = items;
    } catch (err) {
      console.warn(err);
      return;
    }
  }

  #saveRecentItemsForKey(key: string | null) {
    if (!key) {
      return;
    }

    const items = JSON.stringify(this.#recentItems);
    const store =
      this.recencyType === "local"
        ? globalThis.localStorage
        : globalThis.sessionStorage;
    store.setItem(`bb-project-listing-${key}`, items);
  }

  #focusSearchField() {
    if (!this.#searchRef.value) {
      return;
    }

    this.#searchRef.value.select();
  }

  #toggleMode() {
    this.mode = this.mode === "condensed" ? "detailed" : "condensed";
    globalThis.localStorage.setItem(MODE_KEY, this.mode);
  }

  #createUrl(boardServer: string, location: string) {
    return `${boardServer}::${location}`;
  }

  #parseUrl(url: string) {
    return url.split("::");
  }

  #getCurrentStoreName(url: string) {
    for (const boardServer of this.boardServers) {
      for (const [location, store] of boardServer.items()) {
        const value = `${boardServer.name}::${store.url ?? location}`;

        if (value === url) {
          return store.title;
        }
      }
    }

    return "Unknown Store";
  }

  render() {
    const boardServer =
      this.boardServers.find(
        (boardServer) => boardServer.name === this.selectedBoardServer
      ) || this.boardServers[0];

    if (!boardServer) {
      this.#returnToDefaultStore();
      return html`<nav id="menu">
        ${Strings.from("ERROR_LOADING_PROJECTS")}
      </nav>`;
    }

    const extendedCapabilities = boardServer.extendedCapabilities();

    const selected = this.#createUrl(
      this.selectedBoardServer,
      this.selectedLocation
    );

    return html` <div id="wrapper" ${ref(this.#wrapperRef)}>
        <section id="hero">
          <h1>
            ${Strings.from("LABEL_WELCOME_MESSAGE_A")}
            <span class="gradient"
              >${Strings.from("LABEL_WELCOME_MESSAGE_B")}</span
            >
          </h1>
          <p id="cta">${Strings.from("LABEL_WELCOME_CTA")}</p>
          <bb-describe-flow-panel></bb-describe-flow-panel>
        </section>

        <div id="board-listing">
          <div id="locations">
            <!-- TODO(aomarks) According to mocks, the search button should be
                 rendered lower down, next to "Sort by". But that whole section
                 gets quite aggressively re-rendered on any filter change, which
                 makes it difficult for the button to keep any state. We
                 probably need a small refactor to get the desired layout. -->
            <bb-homepage-search-button
              .value=${this.filter ?? ""}
              @input=${(
                evt: InputEvent & {
                  target: HomepageSearchButton;
                }
              ) => {
                this.filter = evt.target.value;
              }}
            ></bb-homepage-search-button>
            <div id="location-selector-container">
              ${this.showAdditionalSources
                ? html`<select
                      id="location-selector"
                      class="gallery-title"
                      @input=${(evt: Event) => {
                        if (!(evt.target instanceof HTMLSelectElement)) {
                          return;
                        }

                        const [boardServer, location] = this.#parseUrl(
                          evt.target.value
                        );
                        this.selectedBoardServer = boardServer;
                        this.selectedLocation = location;

                        this.dispatchEvent(
                          new GraphBoardServerSelectionChangeEvent(
                            boardServer,
                            location
                          )
                        );
                      }}
                    >
                      ${map(this.boardServers, (boardServer) => {
                        return html`${map(
                          boardServer.items(),
                          ([location, store]) => {
                            const value = `${boardServer.name}::${store.url ?? location}`;
                            const isSelectedOption = value === selected;
                            return html`<option
                              .selected=${isSelectedOption}
                              .value=${value}
                            >
                              ${store.title}
                            </option>`;
                          }
                        )}`;
                      })}
                    </select>

                    <button
                      id="board-server-settings"
                      @click=${(evt: PointerEvent) => {
                        if (!(evt.target instanceof HTMLButtonElement)) {
                          return;
                        }

                        const bounds = evt.target.getBoundingClientRect();
                        this.#overflowMenu.x = bounds.left;
                        this.#overflowMenu.y =
                          window.innerHeight -
                          (bounds.top - OVERFLOW_MENU_CLEARANCE);

                        this.showBoardServerOverflowMenu = true;
                      }}
                    >
                      ${Strings.from("LABEL_PROJECT_SERVER_SETTINGS")}
                    </button>

                    <div id="list-other-peoples-boards-container">
                      <input
                        id="list-other-peoples-boards"
                        type="checkbox"
                        ?checked=${this.showOtherPeoplesBoards}
                        @click=${(evt: Event) => {
                          if (!(evt.target instanceof HTMLInputElement)) {
                            return;
                          }

                          this.showOtherPeoplesBoards = evt.target.checked;
                          globalThis.localStorage.setItem(
                            SHOW_OTHER_PEOPLES_BOARDS_KEY,
                            `${this.showOtherPeoplesBoards}`
                          );
                        }}
                      /><label for="list-other-peoples-boards"
                        >${Strings.from("LABEL_LIST_OTHERS_PROJECTS")}</label
                      >
                    </div>`
                : html`<h2 id="location-selector">
                    ${this.#getCurrentStoreName(selected)}
                  </h2>`}
            </div>
          </div>
          <div
            id="content"
            @bbgraphboardserverloadrequest=${({
              url,
            }: GraphBoardServerLoadRequestEvent) => {
              // Track for future invocations.
              if (this.#recentItems) {
                const currentIndex = this.#recentItems.findIndex(
                  (item) => item === url
                );
                if (currentIndex === -1) {
                  this.#recentItems.unshift(url);
                } else {
                  const [item] = this.#recentItems.splice(currentIndex, 1);
                  this.#recentItems.unshift(item);
                }

                this.#saveRecentItemsForKey(this.recentItemsKey);
              }
            }}
          >
            ${until(
              this.#boardServerContents.then((store) => {
                if (!store) {
                  return nothing;
                }

                const { permission } = store;
                const filter = this.filter
                  ? new RegExp(this.filter, "gim")
                  : undefined;
                const allItems = [...store.items]
                  .filter(
                    ([name, item]) =>
                      !filter ||
                      (item.title && filter.test(item.title)) ||
                      (name && filter.test(name))
                  )
                  .sort(([, dataA], [, dataB]) => {
                    // Sort by recency.
                    const indexA = this.#recentItems.indexOf(dataA.url);
                    const indexB = this.#recentItems.indexOf(dataB.url);
                    if (indexA !== -1 && indexB === -1) {
                      return -1;
                    }
                    if (indexA === -1 && indexB !== -1) {
                      return 1;
                    }

                    if (indexA !== -1 && indexB !== -1) {
                      return indexA - indexB;
                    }

                    // If both are unknown for recency, choose those that are
                    // mine.
                    if (dataA.mine && !dataB.mine) {
                      return -1;
                    }

                    if (!dataA.mine && dataB.mine) {
                      return 1;
                    }

                    return 0;
                  });
                const myItems = allItems.filter(
                  ([, item]) => this.showOtherPeoplesBoards || item.mine
                );
                const sampleItems = allItems.filter(([, item]) =>
                  (item.tags ?? []).includes("featured")
                );
                const boardListings = [
                  myItems.length
                    ? html`
                        <div class="gallery-wrapper">
                          <bb-gallery
                            .items=${myItems}
                            .boardServer=${boardServer}
                            .mode=${this.mode}
                          ></bb-gallery>
                        </div>
                      `
                    : html`
                        <div id="no-projects">
                          <p>${Strings.from("LABEL_NO_PROJECTS_FOUND")}</p>
                          <p>${Strings.from("COMMAND_GET_STARTED")}</p>
                        </div>
                      `,
                  html`
                    <div class="gallery-wrapper">
                      <h2 class="gallery-title">
                        ${Strings.from("LABEL_SAMPLE_GALLERY_TITLE")}
                      </h2>
                      <p class="gallery-description">
                        ${Strings.from("LABEL_SAMPLE_GALLERY_DESCRIPTION")}
                      </p>
                      <bb-gallery
                        .items=${sampleItems}
                        .boardServer=${boardServer}
                        .mode=${this.mode}
                      ></bb-gallery>
                    </div>
                  `,
                ];

                return permission === "granted"
                  ? [
                      boardListings,
                      html` <div id="buttons">
                        ${myItems.length
                          ? html`<div id="mode-container">
                              <input
                                ?checked=${this.mode === "condensed"}
                                type="checkbox"
                                id="mode"
                                @input=${() => {
                                  this.#toggleMode();
                                }}
                              />
                              <label for="mode"
                                ><span class="detailed"></span
                                ><span class="condensed"></span>
                                <span class="sort-by-icon"></span
                                >${Strings.from("LABEL_SORT_BY")}</label
                              >
                            </div>`
                          : nothing}
                        <div id="new-project-container">
                          <button
                            id="new-project"
                            @click=${(evt: Event) => {
                              if (!(evt.target instanceof HTMLButtonElement)) {
                                return;
                              }

                              evt.target.disabled = true;

                              this.dispatchEvent(
                                new GraphBoardServerBlankBoardEvent()
                              );
                            }}
                          >
                            <span class="g-icon">add</span>
                            ${Strings.from("COMMAND_NEW_PROJECT")}
                          </button>
                        </div>
                      </div>`,
                    ]
                  : html`<div id="renew-access">
                      <span
                        >${Strings.from(
                          "LABEL_ACCESS_EXPIRED_PROJECT_SERVER"
                        )}</span
                      >
                      <button
                        id="request-renewed-access"
                        @click=${() => {
                          this.dispatchEvent(
                            new GraphBoardServerRenewAccessRequestEvent(
                              this.selectedBoardServer,
                              this.selectedLocation
                            )
                          );
                        }}
                      >
                        ${Strings.from("COMMAND_RENEW_ACCESS")}
                      </button>
                    </div>`;
              }),
              html`<div id="loading-message">
                ${Strings.from("STATUS_LOADING")}
              </div>`
            )}
          </div>
        </div>
      </div>

      ${this.showBoardServerOverflowMenu
        ? html` <div
            id="overflow-menu"
            style=${styleMap({
              left: `${this.#overflowMenu.x}px`,
              bottom: `${this.#overflowMenu.y}px`,
            })}
          >
            <button
              @click=${() => {
                this.dispatchEvent(new GraphBoardServerAddEvent());
                this.showBoardServerOverflowMenu = false;
              }}
              id="add-new-board-server"
            >
              ${Strings.from("COMMAND_ADD_NEW_PROJECT_SERVER")}
            </button>
            ${extendedCapabilities.refresh
              ? html`<button
                  @click=${() => {
                    this.showBoardServerOverflowMenu = false;
                    this.dispatchEvent(
                      new GraphBoardServerRefreshEvent(
                        this.selectedBoardServer,
                        this.selectedLocation
                      )
                    );
                  }}
                  id="refresh-board-server"
                >
                  ${Strings.from("COMMAND_REFRESH_PROJECT_SERVER")}
                </button>`
              : nothing}
            ${extendedCapabilities.disconnect
              ? html`<button
                  @click=${() => {
                    if (!confirm(Strings.from("QUERY_CONFIRM_REMOVE_SERVER"))) {
                      return;
                    }
                    this.dispatchEvent(
                      new GraphBoardServerDisconnectEvent(
                        this.selectedBoardServer,
                        this.selectedLocation
                      )
                    );
                    this.showBoardServerOverflowMenu = false;
                    this.#returnToDefaultStore();
                  }}
                  id="remove-board-server"
                >
                  ${Strings.from("COMMAND_REMOVE_PROJECT_SERVER")}
                </button>`
              : nothing}
          </div>`
        : nothing}

      <div id="app-version">${this.version} (${this.gitCommitHash})</div>`;
  }
}
