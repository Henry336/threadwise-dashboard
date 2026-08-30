const UUID_SEGMENT = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const STUDY_PATH = new RegExp(`^study/(?:snapshot|search|places|modules(?:/[A-Za-z0-9_-]+(?:/analysis)?)?|analysis-suggestions/[A-Za-z0-9_-]+|items(?:/[A-Za-z0-9_-]+(?:/complete)?)?|resources(?:/[A-Za-z0-9_-]+(?:/content)?)?|note-drafts(?:/${UUID_SEGMENT})?|sessions/(?:start|stop|[A-Za-z0-9_-]+)|mistakes(?:/[A-Za-z0-9_-]+/resolve)?|weekly-plan|review|settings|canvas/sync|canvas/assignments/[A-Za-z0-9_-]+|origins(?:/[A-Za-z0-9_-]+)?|schedule(?:/[A-Za-z0-9_-]+)?|nusmods/import)$`);

export function isAllowedThreadwiseProxyPath(path: string) {
  return STUDY_PATH.test(path) || /^(?:snapshot|workspaces|events|today(?:\/order|\/[A-Za-z0-9_-]+\/(?:plan|complete))?|task-drafts(?:\/[A-Za-z0-9_-]+(?:\/items(?:\/[A-Za-z0-9_-]+)?|\/review|\/commit)?)?|capture\/preview|tasks(?:\/[A-Za-z0-9_-]+(?:\/collaboration)?)?|task-imports\/[A-Za-z0-9_-]+(?:\/(?:items\/[A-Za-z0-9_-]+|import|cancel))?|notes(?:\/[A-Za-z0-9_-]+)?|ideas(?:\/[A-Za-z0-9_-]+(?:\/(?:convert-to-task|analyze))?)?|expenses(?:\/[A-Za-z0-9_-]+)?|search|settings|images(?:\/[A-Za-z0-9_-]+(?:\/content)?)?|scheduling\/polls(?:\/[A-Za-z0-9_-]+(?:\/(?:availability|finalize|remind|cancel|calendar))?)?|integrations\/(?:calendar|excel)\/(?:connect|disconnect)|integrations\/calendar\/(?:sync|task)|integrations\/excel\/(?:sync|workbook)|privacy\/(?:export|account))$/.test(path);
}

export function isAllowedThreadwiseProxyMethod(method: string, path: string) {
  if (path === "study/snapshot" || path === "study/search" || path === "study/places" || /^study\/resources\/[A-Za-z0-9_-]+\/content$/.test(path)) return method === "GET";
  if (path === "study/modules") return method === "POST";
  if (/^study\/modules\/[A-Za-z0-9_-]+\/analysis$/.test(path)) return method === "GET" || method === "POST";
  if (/^study\/analysis-suggestions\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH";
  if (/^study\/modules\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH";
  if (path === "study/items") return method === "POST";
  if (/^study\/items\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH" || method === "DELETE";
  if (/^study\/items\/[A-Za-z0-9_-]+\/complete$/.test(path)) return method === "POST";
  if (path === "study/note-drafts") return method === "GET" || method === "PATCH";
  if (new RegExp(`^study/note-drafts/${UUID_SEGMENT}$`).test(path)) return method === "DELETE";
  if (path === "study/resources") return method === "GET" || method === "POST";
  if (/^study\/resources\/[A-Za-z0-9_-]+$/.test(path)) return method === "GET" || method === "PATCH" || method === "DELETE";
  if (/^study\/sessions\/(?:start|stop)$/.test(path)) return method === "POST";
  if (/^study\/sessions\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH" || method === "DELETE";
  if (path === "study/mistakes") return method === "POST";
  if (/^study\/mistakes\/[A-Za-z0-9_-]+\/resolve$/.test(path)) return method === "POST";
  if (path === "study/weekly-plan" || path === "study/settings") return method === "PATCH";
  if (path === "study/review" || path === "study/canvas/sync") return method === "POST";
  if (/^study\/canvas\/assignments\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH";
  if (path === "study/origins") return method === "POST";
  if (/^study\/origins\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH" || method === "DELETE";
  if (path === "study/schedule") return method === "POST";
  if (/^study\/schedule\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH" || method === "DELETE";
  if (path === "study/nusmods/import") return method === "POST";
  if (path === "snapshot" || path === "workspaces" || path === "events" || path === "search" || path === "privacy/export" || /\/content$/.test(path)) return method === "GET";
  if (path === "capture/preview") return method === "POST";
  if (path === "today") return method === "GET";
  if (path === "today/order") return method === "PATCH";
  if (/^today\/[A-Za-z0-9_-]+\/plan$/.test(path)) return method === "PATCH";
  if (/^today\/[A-Za-z0-9_-]+\/complete$/.test(path)) return method === "POST";
  if (path === "task-drafts") return method === "POST";
  if (/^task-drafts\/[A-Za-z0-9_-]+$/.test(path)) return method === "GET" || method === "DELETE";
  if (/^task-drafts\/[A-Za-z0-9_-]+\/items$/.test(path)) return method === "POST";
  if (/^task-drafts\/[A-Za-z0-9_-]+\/items\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH";
  if (/^task-drafts\/[A-Za-z0-9_-]+\/(?:review|commit)$/.test(path)) return method === "POST";
  if (/^task-imports\/[A-Za-z0-9_-]+$/.test(path)) return method === "GET";
  if (/^task-imports\/[A-Za-z0-9_-]+\/items\/[A-Za-z0-9_-]+$/.test(path)) return method === "PATCH";
  if (/^task-imports\/[A-Za-z0-9_-]+\/(?:import|cancel)$/.test(path)) return method === "POST";
  if (path === "settings") return method === "GET" || method === "PATCH";
  if (/^(tasks|notes|ideas|expenses|images)$/.test(path)) return method === "GET" || method === "POST" && path !== "images";
  if (path === "scheduling/polls") return method === "GET" || method === "POST";
  if (/^scheduling\/polls\/[A-Za-z0-9_-]+$/.test(path)) return method === "GET";
  if (/\/availability$/.test(path)) return method === "PATCH";
  if (/^scheduling\/polls\/.+\/(?:finalize|remind|cancel|calendar)$/.test(path)) return method === "POST";
  if (/^integrations\//.test(path) || /\/(?:convert-to-task|analyze|collaboration)$/.test(path)) return method === "POST";
  if (path === "privacy/account") return method === "DELETE";
  if (/^(tasks|notes|ideas|expenses|images)\//.test(path)) return method === "PATCH" || method === "DELETE";
  return false;
}
