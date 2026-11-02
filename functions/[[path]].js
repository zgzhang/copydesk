import { routePublic } from "./pages.js";

export async function onRequest(context) {
  return routePublic(context.request);
}
