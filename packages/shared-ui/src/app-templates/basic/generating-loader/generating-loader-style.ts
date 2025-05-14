import {css} from 'lit';

export default css`
  :host {
    --_skeleton-gradient1: #dae0f1;
    --_skeleton-gradient2: #3367d6;
    background: none;
  }

  :host([spk2]) {
    --_skeleton-gradient1: var(--color-surface-container-high);
    --_skeleton-gradient2: var(--color-primary);
  }

  .main {
    // background: linear-gradient(180deg, #f4f6fb 0%, #ffffff 100%);
  }

  .skeleton-loader {
    height: 18px;
    display: block;
    background: linear-gradient(
        to right,
        var(--_skeleton-gradient1),
        var(--_skeleton-gradient2),
        var(--_skeleton-gradient1)
      ),
      var(--_skeleton-gradient1);
    border-radius: 100px;
    background-repeat: repeat-y;
    background-size: 100px 200px;
    background-position: -50px 0;
    animation: move-forward 1s infinite;
    margin-top: 16px;
  }

  .text-container {
    color: #747775;
  }

  .text-container.fade-in {
    animation: fadeIn 0.25s linear forwards;
  }

  .text-container.fade-out {
    animation: fadeOut 0.25s linear;
  }

  .first-line.skeleton-loader {
    width: 100%;
  }

  .second-line.skeleton-loader {
    width: 60%;
  }

  @keyframes move-forward {
    to {
      background-position: 100% 0;
    }
  }
`;
