import {css} from 'lit';

export default  css`
* {
  box-sizing: border-box;
}

.archinve {
  --color-on-surface: white;
  --color-background: #201f21;

  --color-on-surface: black;
  --color-background: white;



}
:host {
  display: block;
  width: 100%;
  height: 100%;

}

:host([dark-theme]) {

}

/** Fonts */

@scope (.app-template) {
  :scope {
    --font-family: "Google Sans", roboto, sans-serif;
    --font-style: normal;

    /**
     * Added so that any fixed position overlays are relative to this
     * scope rather than any containing document.
     */
    transform: translateX(0);
  }
}

@scope (.app-template.font-serif) {
  :scope {
    --font-family: serif;
  }
}

@scope (.app-template.fontStyle-italic) {
  :scope {
    --font-style: italic;
  }
}

 /**
 * The styling for bubble & user question.
 */

  .question-block {
      padding: 0;
      margin-left: var(--vais-widget-right-gap, 68px);
      display: flex;
      justify-content: flex-end;
      background: none;

       + summary {
        background: none;
        --vais-widget-left-gap: 0;
        // Override background for ucs-search-skeleton-loader
        --_magi-element-background: none;
        max-width: 1250px;
      }

      .question-wrapper {
        flex-direction: initial;
        max-width: 400px;
        box-sizing: border-box;
        min-height: 32px;
        display: inline-flex;
        align-items: center;
        background: var(--bubble-background-color);
        padding: 16px;
        border-radius: 26px 4px 26px 26px;

        .question-bubble {
          background: none;
          padding: 0;
          margin: 0;
          border-radius: 0;
          color: var(--color-on-surface);
          font-size: var(--body-large-size);
          line-height: var(--body-large-line-height);
          font-weight: var(--body-large-weight);
          letter-spacing: var(--body-large-tracking);
        }
      }
  }

  .conversations { 
    font-size: 16px;
    font-family: "Google Sans", roboto, sans-serif;
    line-height: 28px;
    --font-family: "Google Sans", roboto, sans-serif;
    --bb-body-small: 14px;
    --bb-body-medium: 16px;
    --bb-body-large: 18px;
    --bb-body-line-height-medium: 28px;
    
  }

/** General styles */

:host([hasrenderedsplash]) {
  @scope (.app-template) {
    & #content {
      & #splash {
        animation: none;
      }
    }
  }
}

@scope (.app-template) {
  :scope {
    background: var(--background-color);
    color: var(--text-color);
    display: flex;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  & #content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    max-height: 100svh;
    
    
    flex: 1;
    scrollbar-width: none;
    position: relative;

    &::before {
      content: "";
      width: 100svw;
    }

    &:has(.loading) {
      align-items: center;
      justify-content: center;
      background: var(--background-color);
    }

    .conversations {
      padding: 20px 16px;
      overflow-y: auto;
      scrollbar-gutter: stable;
      scrollbar-width: none;
      flex: 1;
      justify-content: center;


      .conversations-content {
        max-width: 708px;
        .turn {
          .summary {
            padding-top: 24px;
            padding-bottom: 40px;
          }
        }
        .turn.last {
          min-height: var(--conversation-client-height, 0);
        }
        .turn.last.loader {
          padding-top: 24px;
          padding-bottom: 40px;
        }
      }

    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100svw;
      height: 100svh;

      & .loading-message {
        display: flex;
        align-items: center;
        height: var(--bb-grid-size-8);
        padding-left: var(--bb-grid-size-8);
        background: var(--bb-progress) 4px center / 20px 20px no-repeat;
      }
    }

    #preview-step-not-run {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex: 1;
      animation: fadeIn 1s cubic-bezier(0, 0, 0.3, 1);
      padding: 0 var(--bb-grid-size-8);
      font: 400 var(--font-style, normal) var(--bb-title-medium) /
        var(--bb-title-line-height-medium)
        var(--font-family, var(--bb-font-family));
      color: var(--text-color, var(--bb-neutral-900));

      & h1 {
        font: 500 var(--font-style, normal) var(--bb-title-large) /
          var(--bb-title-line-height-large)
          var(--font-family, var(--bb-font-family));
        margin: 0 0 var(--bb-grid-size) 0;
      }

      & p {
        margin: 0 0 var(--bb-grid-size-2) 0;
      }
    }

    & #splash {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex: 1;
      animation: fadeIn 1s cubic-bezier(0, 0, 0.3, 1);

      // &::before {
      //   content: "";
      //   width: 100%;
      //   flex: 1;
      //   background: var(--splash-image, url(/images/app/generic-flow.jpg))
      //     center center / cover no-repeat;
      //   mask-image: linear-gradient(
      //     to bottom,
      //     rgba(255, 0, 255, 1) 0%,
      //     rgba(255, 0, 255, 1) 70%,
      //     rgba(255, 0, 255, 0.75) 80%,
      //     rgba(255, 0, 255, 0.4) 90%,
      //     rgba(255, 0, 255, 0) 100%
      //   );
      // }

      & h1 {
        background: var(--background-color, none);
        border-radius: var(--bb-grid-size-2);
        font: 500 var(--font-style) 32px / 42px var(--font-family);
        margin: 0 0 var(--bb-grid-size-3);
        flex: 0 0 auto;
        max-width: 80%;
        width: max-content;
        text-align: center;
      }

      & p {
        flex: 0 0 auto;
        font: 400 var(--font-style) var(--bb-body-large) /
          var(--bb-body-line-height-large) var(--font-family);
        margin: 0 0 var(--bb-grid-size-3);

        max-width: 65%;
        width: max-content;
        text-align: center;
      }

      #avatar {
        border-radius: 100px;
        height: 80px;
        width: 80px;
        background-color: var(--background-color-secondary);
        background-color: var(--background-color-secondary);

        text-transform: uppercase;
        font-size: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--bb-grid-size-3);
      }
    }

    & #controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 76px;
      border-bottom: 1px solid var(--secondary-color, var(--bb-neutral-0));
      padding: 0 var(--bb-grid-size-4);
      position: relative;

      #older-data {
        position: absolute;
        width: max-content;
        max-width: 70%;
        text-align: center;
        left: 50%;
        top: 50%;
        user-select: none;
        transform: translate(-50%, -50%);
        padding: var(--bb-grid-size-2) var(--bb-grid-size-3);
        font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
          var(--bb-font-family);
        background: var(--bb-ui-50);
        color: var(--bb-ui-800);
        border-radius: var(--bb-grid-size-2);
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0, 0, 0.3, 1);

        &.active {
          opacity: 1;
        }
      }

      button {
        width: 20px;
        height: 20px;
        background: transparent;
        border: none;
        font-size: 0;
        opacity: 0.6;
        transition: opacity 0.3s cubic-bezier(0, 0, 0.3, 1);

        &#back {
          background: var(--bb-icon-arrow-back) center center / 20px 20px
            no-repeat;
        }

        &#share {
          background: var(--bb-icon-share) center center / 20px 20px
            no-repeat;
        }

        &:not([disabled]) {
          cursor: pointer;

          &:hover,
          &:focus {
            opacity: 1;
          }
        }
      }

      div#share {
        width: 20px;
        height: 20px;
        background: transparent;
      }
    }

    & #introduce {
      padding-top: 8px;
    }
    
    & .generating-icon {
      color: #3367d6;
      @include spark-icon();
    }

    & .generating {
      animation: rotate 2s linear infinite;
    }

    & #activity {
      flex: 1;
      overflow: auto;

      display: flex;
      flex-direction: column;
      // padding: var(--bb-grid-size-3);
      color: var(--text-color);
      scollbar-width: none;
  


      & bb-multi-output {



        animation: fadeIn 0.6s cubic-bezier(0, 0, 0.3, 1) forwards;
      }

      & .error {
        flex: 1 0 auto;
        display: flex;
        flex-direction: column;
        width: 80%;
        margin: 0 auto;

        & summary {
          list-style: none;
          cursor: pointer;

          & h1 {
            margin: 0 0 var(--bb-grid-size-2) 0;
            font: 400 var(--bb-title-large) /
              var(--bb-title-line-height-large) var(--bb-font-family);
            color: var(--primary-color);
          }

          & p {
            font: 400 var(--bb-label-medium) /
              var(--bb-label-line-height-medium) var(--bb-font-family);
            margin: 0;
            color: oklch(
              from var(--text-color) l c h / calc(alpha - 0.6)
            );
          }
        }

        & p {
          margin: var(--bb-grid-size-4) 0 var(--bb-grid-size-2) 0;
          font: 400 var(--bb-title-medium) /
            var(--bb-title-line-height-medium) var(--bb-font-family);
          color: var(--secondary-color);
        }

        &::-webkit-details-marker {
          display: none;
        }
      }

      & .thought {
        font: 400 var(--font-style, normal) var(--bb-title-medium) /
          var(--bb-title-line-height-medium)
          var(--font-family, var(--bb-font-family));
        color: var(--text-color, var(--bb-neutral-900));
        margin: 0 var(--bb-grid-size-3)
          var(--output-string-margin-bottom-y, var(--bb-grid-size-2))
          var(--bb-grid-size-3);
        padding: 0 var(--bb-grid-size-3);
        opacity: 0;
        animation: fadeIn 0.6s cubic-bezier(0, 0, 0.3, 1) 0.05s forwards;

        & p {
          margin: 0 0 var(--bb-grid-size-2) 0;
        }

        & h1 {
          font: 500 var(--font-style, normal) var(--bb-title-small) /
            var(--bb-title-line-height-small)
            var(--font-family, var(--bb-font-family));
          color: var(--primary-color, var(--bb-neutral-900));
          margin: 0 0 var(--bb-grid-size-2) 0;
        }

        &.generative h1 {
          padding-left: var(--bb-grid-size-7);
          background: var(--bb-icon-generative) 0 center / 20px 20px
            no-repeat;
        }
      }

      & #status {
        position: absolute;
        display: flex;
        align-items: center;
        bottom: var(--bb-grid-size-6);
        width: calc(100% - var(--bb-grid-size-12));
        left: 50%;
        transform: translateX(-50%);
        background: var(--bb-progress) var(--primary-color) 16px center /
          20px 20px no-repeat;
        color: var(--primary-text-color);
        padding: var(--bb-grid-size-3) var(--bb-grid-size-4)
          var(--bb-grid-size-3) var(--bb-grid-size-12);
        border-radius: var(--bb-grid-size-3);
        z-index: 1;
        font: 400 var(--bb-title-medium) /
          var(--bb-title-line-height-medium) var(--bb-font-family);
        opacity: 0;
        animation: fadeIn 0.6s cubic-bezier(0, 0, 0.3, 1) 0.6s forwards;

        &::after {
          content: "Working";
          flex: 0 0 auto;
          margin-left: var(--bb-grid-size-3);
          color: oklch(
            from var(--primary-text-color) l c h / calc(alpha - 0.4)
          );
        }
      }
    }

    & #input {
      --user-input-padding-left: 0;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;

      background: var(--background-color, var(--bb-neutral-0));

      & #sign-in,
      & #run {
        min-width: 76px;
        height: var(--bb-grid-size-10);
        background: var(--primary-button-color);
        color: var(--primary-button-color-text, var(--bb-ui-700));
        border-radius: 20px;
        border: 1px solid var(--primary-button-color, var(--bb-ui-100));
        font: 400 var(--bb-label-large) /
          var(--bb-label-line-height-large) var(--bb-font-family);
        padding: 0 var(--bb-grid-size-5) 0 var(--bb-grid-size-5);
        opacity: 0.85;

        --transition-properties: opacity;
        transition: var(--transition);

        &.running {
          background: var(--bb-ui-500) url(/images/progress-ui.svg) 8px
            center / 16px 16px no-repeat;
        }

        &:not([disabled]) {
          cursor: pointer;

          &:hover,
          &:focus {
            opacity: 1;
          }
        }
        &:disabled {
          background-color: var(--primary-button-color-disabled);
          border-color: var(--primary-button-color-disabled);
          color: var(--primary-button-color-text-disabled)
        }
      }

      & #sign-in {
        /* background-image: var(--bb-icon-login-inverted); */
      }

      &.stopped {
        min-height: 100px;
        padding: var(--bb-grid-size-2) var(--bb-grid-size-3);
      }

     
        .disclaimer{
          color: rgb(95, 99, 104);
          font-size: 12px;
          font-weight: 400;
          line-height: 20px;
          margin-bottom: 5px;
          margin-top: 5px;
          max-width: 650px;
          text-align: center;
          width: 100%;
        }

        & #input-container {
          max-width: 760px;
          padding: 6px;
          transition: transform 0.6s cubic-bezier(0, 0, 0.3, 1);
          transform: translateY(0);
          color: black;
          width: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--primary-border-color);
          border-radius: 24px;
          

          min-height: 100px;
          max-height: 385px; 

          bb-add-asset-button {
            display: none;
            margin-right: var(--bb-grid-size-2);
          }

          & .user-input {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: auto;
       
            color: var(--text-color);

            & p {
              display: flex;
              align-items: flex-end;
              font: 400 var(--bb-title-medium) /
                var(--bb-title-line-height-medium) var(--bb-font-family);
              margin: 0 0 var(--bb-grid-size-3) 0;
              flex: 1;

              &.api-message {
                font: 400 var(--bb-body-x-small) /
                  var(--bb-body-line-height-x-small) var(--bb-font-family);
              }
            }

            & textarea,
            & input[type="password"] {
              field-sizing: content;
              resize: none;
              background: transparent;
              padding: 8px 6px;
              color: var(--text-color);
              font: 400 var(--bb-title-medium) /
                var(--bb-title-line-height-medium) var(--bb-font-family);
              border: none;
              border-radius: var(--bb-grid-size-2);
              outline: none;
              width: 100%;
              scrollbar-width: none;

              &::placeholder {
                color: #747775
              }
            }
          }

          & .controls {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-left: auto;
            align-items: flex-end;

            & .action-group {
              display: flex;
              gap: 4px;
              margin-left: auto;
            }           

            & #stop {
              margin-left: var(--bb-grid-size-2);
              --transition-properties: opacity;
              transition: var(--transition);
              background-color: #d3e3fd;
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              // transition: background-color 0.3s;
            }
            & #reset,
            & #continue {
              color: var(--secondary-button-color-text);
              width: 40px;
              height: 40px;
              font-size: 0;
              border: none;
              border-radius: 50%;
              background-color: var(--secondary-button-color);

              --transition-properties: opacity;
              transition: var(--transition);

              &[disabled] {
                cursor: auto;
                opacity: 0.5;
              }

              &:not([disabled]) {
                cursor: pointer;
                // opacity: 0.5;

                &:hover,
                &:focus {
                  // opacity: 1;
                  color: #444746;
                  background-color: var(--bb-neutral-100);
                }
              }
            }

            & #continue {
              background: var(--secondary-button-color) var(--bb-icon-send) center center / 20px 20px no-repeat;
            }

            & #reset {
              background: var(--secondary-button-color) var(--bb-icon-restart-alt) center center / 24px 24px no-repeat;
            }

          & .search-button,
          & .source-button {
              margin-left: var(--bb-grid-size-2);
              cursor: pointer;
              background: var(--secondary-button-color);
              
              color: var(--secondary-button-color-text);
              height: 40px;
              border: none;
              border-radius: 20px; /* pill shape for icon+text */
              display: flex;
              align-items: center;
              padding: 0 12px;
              gap: 8px; /* space between icon and text */

              --transition-properties: opacity;
              transition: var(--transition);
          }

          & search-button .icon {
            width: 20px;
            height: 20px;
            color: var(--secondary-button-color-text);
          }

          & .search-button .text {
            font-size: 14px;
          }
        }
      }
    }
  }
}
`;