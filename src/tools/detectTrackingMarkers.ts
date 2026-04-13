import { defineTool } from "./types.js";
import { requireObject, requireString } from "./validation.js";

export type DetectTrackingMarkersArgs = {
  content: string;
};

export type DetectTrackingMarkersResult = {
  ga4_detected: boolean;
  gtm_detected: boolean;
  meta_pixel_detected: boolean;
  linkedin_insight_detected: boolean;
  other_markers: string[];
};

const OTHER_MARKER_PATTERNS = [
  { name: "microsoft_clarity", pattern: /clarity\.ms\/tag|window\.clarity/i },
  { name: "hotjar", pattern: /static\.hotjar\.com|hj\s*=/i },
  { name: "segment", pattern: /cdn\.segment\.com\/analytics\.js|analytics\.load\(/i },
  { name: "hubspot_analytics", pattern: /js\.hs-analytics\.net|_hsq/i },
  { name: "tiktok_pixel", pattern: /analytics\.tiktok\.com\/i18n\/pixel|ttq\.(?:load|page)/i },
];

export const detectTrackingMarkersTool = defineTool<
  DetectTrackingMarkersArgs,
  DetectTrackingMarkersResult
>({
  name: "detect_tracking_markers",
  description: "Detect basic analytics and ad tracking markers from page HTML or extracted content.",
  validate(args: unknown): DetectTrackingMarkersArgs {
    const record = requireObject(args, "detect_tracking_markers args");
    return {
      content: requireString(record.content, "detect_tracking_markers.content"),
    };
  },
  async execute(args: DetectTrackingMarkersArgs): Promise<DetectTrackingMarkersResult> {
    const source = args.content;

    return {
      ga4_detected:
        /googletagmanager\.com\/gtag\/js\?id=G-/i.test(source) ||
        /gtag\(\s*["']config["']\s*,\s*["']G-[A-Z0-9]+["']/i.test(source) ||
        /\bG-[A-Z0-9]{6,}\b/i.test(source),
      gtm_detected:
        /googletagmanager\.com\/gtm\.js\?id=GTM-[A-Z0-9]+/i.test(source) ||
        /\bGTM-[A-Z0-9]{4,}\b/i.test(source),
      meta_pixel_detected:
        /connect\.facebook\.net\/.*fbevents\.js/i.test(source) ||
        /fbq\(\s*["']init["']/i.test(source) ||
        /\bfbq\s*\(/i.test(source),
      linkedin_insight_detected:
        /snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/i.test(source) ||
        /_linkedin_partner_id/i.test(source),
      other_markers: OTHER_MARKER_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(
        ({ name }) => name,
      ),
    };
  },
});
