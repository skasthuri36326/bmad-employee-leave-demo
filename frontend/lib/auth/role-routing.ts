export function routeForRole(role: unknown): "/employee" | "/manager" | null {
  if (role === "EMPLOYEE") return "/employee";
  if (role === "MANAGER") return "/manager";
  return null;
}
