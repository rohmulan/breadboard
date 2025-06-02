/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    entity?: "works" | "authors" | "sources" | "institutions" | "topics" | "publishers" | "funders" | "concepts" | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
    search?: string | undefined;
    select?: string | undefined;
}, {
    url: string;
    meta: {
        count: number;
        db_response_time_ms: number;
        page: number;
        per_page: number;
    };
    results: {
        [x: string]: import("@breadboard-ai/build").JsonSerializable;
        id: string;
        display_name: string;
        title: string;
        relevance_score: number;
    }[];
}>;
export default _default;
//# sourceMappingURL=open-alex-entity-search-list.d.ts.map