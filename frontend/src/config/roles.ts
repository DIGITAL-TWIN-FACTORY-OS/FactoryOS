import type { UserRole } from "../components/Login/Login";

export interface RolePermissions {
  dashboard: boolean;
  factoryLayout: boolean;
  machines: boolean;
  alerts: boolean;
  maintenance: boolean;
  workOrders: boolean;
  analytics: boolean;
  reports: boolean;
  aiAssistant: boolean;
  settings: boolean;
  userManagement: boolean;
}

export const rolePermissions: Record<
  UserRole,
  RolePermissions
> = {
  admin: {
    dashboard: true,
    factoryLayout: true,
    machines: true,
    alerts: true,
    maintenance: true,
    workOrders: true,
    analytics: true,
    reports: true,
    aiAssistant: true,
    settings: true,
    userManagement: true,
  },

  supervisor: {
    dashboard: true,
    factoryLayout: true,
    machines: true,
    alerts: true,
    maintenance: true,
    workOrders: true,
    analytics: true,
    reports: true,
    aiAssistant: true,
    settings: true,
    userManagement: false,
  },

  maintenance: {
    dashboard: true,
    factoryLayout: true,
    machines: true,
    alerts: true,
    maintenance: true,
    workOrders: true,
    analytics: true,
    reports: true,
    aiAssistant: true,
    settings: true,
    userManagement: false,
  },

  operator: {
    dashboard: true,
    factoryLayout: true,
    machines: true,
    alerts: true,
    maintenance: true,
    workOrders: true,
    analytics: false,
    reports: false,
    aiAssistant: false,
    settings: false,
    userManagement: false,
  },
};