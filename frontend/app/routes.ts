import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("residences", "routes/residences.tsx"),
  route("messaging", "routes/messaging.tsx"),
  // Legacy route for backward compatibility
  route("emails", "routes/messaging.tsx", { id: "emails-legacy" }),
] satisfies RouteConfig;
