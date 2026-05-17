import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { websiteApi } from "@/lib/api";
import { useChatBoardFabPosition } from "@/hooks/useChatBoardFabPosition";
import { injectSiteScriptSnippet } from "@/lib/injectSiteScript";
import { repositionChatBoardFab } from "@/lib/chatBoardFabLayout";

/** Injects site-wide snippets from Super Admin → Settings (store-info API). */
export default function StoreSiteScripts() {
  useChatBoardFabPosition();

  const { data } = useQuery({
    queryKey: ["website", "store-info", "site-scripts"],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const cleanup = injectSiteScriptSnippet(data?.chabot_script ?? "", "chabot");
    repositionChatBoardFab();
    return cleanup;
  }, [data?.chabot_script]);

  return null;
}
