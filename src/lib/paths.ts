export const isGitHubPages = import.meta.env.VITE_GITHUB_PAGES === "true";
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export const routeHref = (path: string) =>
  `${import.meta.env.BASE_URL}${isGitHubPages ? "#" : ""}${path.replace(/^\//, isGitHubPages ? "/" : "")}`;
export const absoluteRoute = (path: string) =>
  new URL(routeHref(path), window.location.origin).href;
