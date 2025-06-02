declare const _default: import("@breadboard-ai/build/internal/board/board.js").BoardDefinition<{
    query?: string | undefined;
    numberOfResults?: number | undefined;
    language?: "lang_ar" | "lang_bg" | "lang_ca" | "lang_cs" | "lang_da" | "lang_de" | "lang_el" | "lang_en" | "lang_es" | "lang_et" | "lang_fi" | "lang_fr" | "lang_hr" | "lang_hu" | "lang_id" | "lang_is" | "lang_it" | "lang_iw" | "lang_ja" | "lang_ko" | "lang_lt" | "lang_lv" | "lang_nl" | "lang_no" | "lang_pl" | "lang_pt" | "lang_ro" | "lang_ru" | "lang_sk" | "lang_sl" | "lang_sr" | "lang_sv" | "lang_tr" | "lang_zh-CN" | "lang_zh-TW" | undefined;
    safeSearch?: "active" | "off" | undefined;
    startIndex?: number | undefined;
}, {
    results: {
        title: string;
        htmlTitle: string;
        link: string;
        displayLink: string;
        snippet: string;
        htmlSnippet: string;
        formattedUrl: string;
        htmlFormattedUrl: string;
        pagemap?: {
            cse_thumbnail: {
                src: string;
                height: string;
                width: string;
            }[];
            softwaresourcecode: {
                author: string;
                name: string;
                text: string;
            }[];
            metatags: (object & import("@breadboard-ai/build").JsonSerializable)[];
            cse_image: {
                src: string;
            }[];
        } | undefined;
    }[];
}>;
export default _default;
//# sourceMappingURL=google-custom-search-engine.d.ts.map