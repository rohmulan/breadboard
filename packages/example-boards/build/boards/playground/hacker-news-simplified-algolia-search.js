/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { output, board, annotate, input, object, } from "@breadboard-ai/build";
import { searchQuery, searchTags } from "./hacker-news-algolia-search";
import { invoke } from "@google-labs/core-kit";
const hackerNewsSearchBoard = input({
    $id: "Hacker News Board",
    title: "board location",
    type: annotate(object({}), {
        behavior: ["board"],
    }),
    description: "The URL of the generator to call",
    default: { kind: "board", path: "hacker-news-algolia-search.json" },
});
const hackerNewsOutput = invoke({
    $id: "Hackernews Board Output",
    $board: hackerNewsSearchBoard,
    query: searchQuery,
    tags: searchTags,
    pageNumber: 1,
    searchLimit: "2",
}).unsafeOutput("output");
const objectManipBoard = input({
    $id: "Object Manipulation Board",
    title: "board location",
    type: annotate(object({}), {
        behavior: ["board"],
    }),
    description: "The URL of the generator to call",
    default: { kind: "board", path: "object-manipulator.json" },
});
const forEachBoard = input({
    $id: "Manipulation Board For Each",
    title: "board location",
    type: annotate(object({}), {
        behavior: ["board"],
    }),
    description: "The URL of the generator to call",
    default: { kind: "board", path: "board-for-each.json" }
});
// ignore until object manip board has been refactored
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const invokeForEach = invoke({ $id: "forEachOutput", $board: forEachBoard, board: objectManipBoard, array: hackerNewsOutput, mode: "pick",
    keys: [
        "created_at",
        "num_comments",
        "comment_text",
        "objectID",
        "points",
        "story_id",
        "title",
        "url",
        "type",
        "_tags"
    ], }).unsafeOutput("outputs");
export default board({
    title: "Hacker News Angolia Simplified Search",
    version: "0.1.0",
    inputs: { query: searchQuery, tags: searchTags, hackerNewsSearchBoard, objectManipBoard, forEachBoard },
    outputs: { output: output(invokeForEach) }
});
//# sourceMappingURL=hacker-news-simplified-algolia-search.js.map