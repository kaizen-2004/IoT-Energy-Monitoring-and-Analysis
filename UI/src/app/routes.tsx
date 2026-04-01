import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import { loadDashboardPage, loadReportsPage, loadSettingsPage } from "./pageLoaders";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await loadDashboardPage()).default,
        }),
      },
      {
        path: "settings",
        lazy: async () => ({
          Component: (await loadSettingsPage()).default,
        }),
      },
      {
        path: "reports",
        lazy: async () => ({
          Component: (await loadReportsPage()).default,
        }),
      },
    ],
  },
]);
