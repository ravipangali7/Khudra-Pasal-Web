/** User-agents that need server HTML with Open Graph tags (no SPA JavaScript). */
export const SOCIAL_CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|TelegramBot|Telegram|Google-InspectionTool|Pinterest|Embedly|vkShare|redditbot/i;

export function isSocialCrawlerUa(userAgent: string): boolean {
  return SOCIAL_CRAWLER_UA.test(userAgent);
}
