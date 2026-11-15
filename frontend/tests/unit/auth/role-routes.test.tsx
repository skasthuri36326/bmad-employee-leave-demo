import { routeForRole } from "../../../lib/auth/role-routing";

describe("role routing", () => {
  it("selects the Employee route from the server role", () => {
    expect(routeForRole("EMPLOYEE")).toBe("/employee");
  });

  it("selects the Manager route from the server role", () => {
    expect(routeForRole("MANAGER")).toBe("/manager");
  });

  it("does not route an unknown role", () => {
    expect(routeForRole("ADMIN")).toBeNull();
  });
});
