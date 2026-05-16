import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { websiteApi } from "@/lib/api";
import { injectSiteScriptSnippet } from "@/lib/injectSiteScript";

/** Injects site-wide snippets from Super Admin → Settings (store-info API). */
export default function StoreSiteScripts() {
  const { data } = useQuery({
    queryKey: ["website", "store-info", "site-scripts"],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    return injectSiteScriptSnippet(data?.chabot_script ?? "", "chabot");
  }, [data?.chabot_script]);

  return null;
}
