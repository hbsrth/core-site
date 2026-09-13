export type CoreAttr = "src" | "href" | "alt" | "title" | "placeholder";
export declare function coreField(collection: string, field: string, recordId?: string, options?: {
    attr?: CoreAttr;
}): Record<string, string>;
/** `**kalın**` işaretlemesini React öğelerine çevirir; başka işaretleme yorumlanmaz. */
export declare function inlineText(value: string): Array<string | {
    bold: string;
}>;
