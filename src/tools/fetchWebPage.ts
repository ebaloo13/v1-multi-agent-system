import { fetchWebPage, type WebHeadingMap } from "../preaudit/webContext.js";
import { defineTool } from "./types.js";
import { requireHttpUrl, requireObject } from "./validation.js";

export type FetchWebPageArgs = {
  url: string;
};

export type FetchWebPageResult = {
  url: string;
  title: string;
  meta_description: string;
  headings: WebHeadingMap;
  visible_text_excerpt: string;
  internal_links: string[];
  social_links: string[];
  raw_html: string;
};

export const fetchWebPageTool = defineTool<FetchWebPageArgs, FetchWebPageResult>({
  name: "fetch_web_page",
  description: "Fetch a public webpage and return structured business context.",
  validate(args: unknown): FetchWebPageArgs {
    const record = requireObject(args, "fetch_web_page args");
    return {
      url: requireHttpUrl(record.url, "fetch_web_page.url"),
    };
  },
  async execute(args: FetchWebPageArgs): Promise<FetchWebPageResult> {
    const page = await fetchWebPage(args.url);

    return {
      url: page.url,
      title: page.title,
      meta_description: page.description,
      headings: page.headings,
      visible_text_excerpt: page.content,
      internal_links: page.internal_links,
      social_links: page.social_links,
      raw_html: page.raw_html,
    };
  },
});
