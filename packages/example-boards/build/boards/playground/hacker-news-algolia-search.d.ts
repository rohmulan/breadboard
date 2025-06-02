export declare const searchQuery: import("@breadboard-ai/build/internal/board/input.js").Input<string>;
export declare const searchTags: import("@breadboard-ai/build/internal/board/input.js").Input<"story" | "comment" | "poll" | "pollopt" | "show_hn" | "ask_hn" | "front_page">;
export declare const pageNumber: import("@breadboard-ai/build/internal/board/input.js").InputWithDefault<string>;
declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    pageNumber?: string | undefined;
    searchLimit?: number | undefined;
    query: string;
    tags: "story" | "comment" | "poll" | "pollopt" | "show_hn" | "ask_hn" | "front_page";
}, {
    searchQuery: string;
    output: import("@breadboard-ai/build").JsonSerializable;
}>;
export default _default;
//# sourceMappingURL=hacker-news-algolia-search.d.ts.map