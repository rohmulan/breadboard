/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    content: {
        role: string;
        parts: ({
            text: string;
        } | {
            inlineData: {
                mimeType: "image/png" | "image/jpeg" | "image/heic" | "image/heif" | "image/webp";
                data: string;
            };
        })[];
    }[];
}, {
    text: null;
}>;
export default _default;
//# sourceMappingURL=openai-gpt-4-turbo-vision.d.ts.map