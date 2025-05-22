import {css} from 'lit';

export default css`
  .text-container {
    color: #747775;
  }

  .text-container.fade-in {
    animation: fadeIn 0.25s linear forwards;
  }

  .text-container.fade-out {
    animation: fadeOut 0.25s linear;
  }

  .text-line-loader {
    background: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.text-line-skeleton {
  height: 16px;
  border-radius: 4px;

  &:last-child {
    width: 55%;
  }
}

@keyframes move-forward {
    to {
      background-position: 1300px 0;
    }
  }

.skeleton {
background-attachment: fixed;
  background-position: 0 0;
  background-repeat: repeat;
  background-size: 1300px 16px;
  animation: var(--_skeleton-animation, move-forward) linear 2s infinite;
  background: linear-gradient(
      90deg,
      #a4cafb 0%,
      #ffd7f4 33.33%,
      #f7f9fd 66.66%,
      #a4cafb 100%
    );
  opacity: var(--bb-loader-opacity, 1);
}
`;
