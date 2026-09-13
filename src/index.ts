/**
 * @surth/core-site
 *
 *   import { singleton, collection, modules, menu, settings } from "@surth/core-site/server";
 *   import { CoreProvider, CoreForm } from "@surth/core-site/client";
 *   import { CoreText, CoreImage, CoreRichText, CoreMenu, CoreHead } from "@surth/core-site/components";
 *   import { createCoreHandlers } from "@surth/core-site/route";
 *   import { coreMetadata, coreField, read, readList } from "@surth/core-site";
 */
export { sanitizeHtml } from "./sanitize.js";
export { coreMetadata, type CoreMetadataInput, type SeoValue } from "./metadata.js";
export { coreField, inlineText, type CoreAttr } from "./mark.js";
export { CONTRACT_VERSION, PACKAGE_VERSION } from "./env.js";
export * from "./types.js";
export { read, readList, readRows, readKeyed, readWithDrift, reportDrift, type DriftReport, type ReadResult } from "./read.js";
