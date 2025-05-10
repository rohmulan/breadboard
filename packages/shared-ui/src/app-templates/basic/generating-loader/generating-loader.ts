/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {CSSResultGroup, html, LitElement, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {BehaviorSubject, Observable, Subject, merge, of, timer} from 'rxjs';
import {concatMap, filter, takeUntil, takeWhile} from 'rxjs/operators';
import GeneratingLoaderStyle from './generating-loader-style.js';
import ThemeStyle from '../theme-style.js';


/** Duration of the fade in or fade out animation. */
const STATUS_FADE_DURATION_MS = 250;

/** Amount of time the each placeholder message is shown. */
const STATUS_DISPLAY_DURATION_MS = 2000;

/** Amount of time the each placeholder message is shown. */
const STATUS_DISPLAY_DURATION_MS_CHAT_UX = 1000;

/** Displaying a skeleton loader when waiting for the search result. */
@customElement('generating-loader')
export class GeneratingLoader extends LitElement {
  static styles = [ThemeStyle, GeneratingLoaderStyle];

  @property()
  set customText(value: string | undefined) {
    if (value) this.customText$.next(value);
  }
  get customText() {
    return this.customText$.value;
  }

  @property() accessor currentText = 'Generating';

  @state() accessor isFadingIn = false;

  @state() accessor isFadingOut = false;

  protected disconnected$ = new Subject<void>();
  
  private readonly customText$ = new BehaviorSubject<string | undefined>(
    undefined,
  );

  render() {
    return html`
      <div class="main">
        <div class="header">
           <span
            class="text-container ${classMap({
              'fade-in': this.isFadingIn,
              'fade-out': this.isFadingOut,
            })}"
            >${this.currentText}...</span
          >
        </div>
        <span class="first-line skeleton-loader"></span>
        <span class="second-line skeleton-loader"></span>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    const customTextNonEmpty$ = this.customText$.pipe(filter(Boolean));

     customTextNonEmpty$
      .pipe(takeUntil(this.disconnected$))
      .subscribe(async (updateText) => {
        const previousMessage = this.currentText;
        // Fade out previous message
        if (previousMessage) {
          this.isFadingIn = false;
          this.isFadingOut = true;
          await new Promise((r) => void setTimeout(r, STATUS_FADE_DURATION_MS));
        }

        // Fade in new message
        this.isFadingIn = true;
        this.isFadingOut = false;
        this.currentText = updateText;
      });
  }

  override disconnectedCallback(): void {
    // We do not complete the subject as the element class instance may be
    // reconnected to the DOM, for instance if the element is moved with
    // `Node.appendChild`, in which case new subscriptions will be made with
    // `takeUntil(this.disconnected$)` which should be able to emit again next
    // time it is disconnected.
    this.disconnected$.next();
  }
}
