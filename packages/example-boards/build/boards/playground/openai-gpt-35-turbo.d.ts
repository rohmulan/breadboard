/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Schema } from "@google-labs/breadboard";
declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    text?: string | undefined;
    tools?: {
        name: string;
        description: string;
        parameters: Schema;
    }[] | undefined;
    context?: {
        role: "model" | "user" | "tool" | "$metadata";
        parts: ({
            text: string;
        } | {
            inlineData: {
                mimeType: "image/png" | "image/jpeg" | "image/heic" | "image/heif" | "image/webp";
                data: string;
            };
        } | {
            function_call: {
                name: string;
                args: {
                    [x: string]: string;
                };
            };
        } | {
            function_response: {
                name: string;
                response: import("@breadboard-ai/build").JsonSerializable;
            };
        })[];
    }[] | undefined;
}, {
    context: null;
    text: null;
    toolCalls: null;
}>;
export default _default;
//# sourceMappingURL=openai-gpt-35-turbo.d.ts.map