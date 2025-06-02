export interface HighlightResult {
    author: Author;
    title: Title;
    url: Url;
}
export interface Author {
    matchLevel: string;
    matchedWords: any[];
    value: string;
}
export interface Title {
    fullyHighlighted: boolean;
    matchLevel: string;
    matchedWords: string[];
    value: string;
}
export interface Url {
    matchLevel: string;
    matchedWords: string[];
    value: string;
    fullyHighlighted?: boolean;
}
export interface VerboseSearchResult {
    _highlightResult: HighlightResult;
    _tags: string[];
    author: string;
    children: number[];
    created_at: string;
    created_at_i: number;
    num_comments: number;
    objectID: string;
    points: number;
    story_id: number;
    title: string;
    updated_at: string;
    url: string;
}
declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    hackerNewsSearchBoard?: (object & import("@breadboard-ai/build").JsonSerializable) | undefined;
    objectManipBoard?: (object & import("@breadboard-ai/build").JsonSerializable) | undefined;
    forEachBoard?: (object & import("@breadboard-ai/build").JsonSerializable) | undefined;
    query: string;
    tags: "story" | "comment" | "poll" | "pollopt" | "show_hn" | "ask_hn" | "front_page";
}, {
    output: null;
}>;
export default _default;
//# sourceMappingURL=hacker-news-simplified-algolia-search.d.ts.map