/* eslint-disable react-refresh/only-export-components */
import { OfficialLayout } from "@/components/Official/officialLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import {
  FocalForgotPasswordFlow,
  FocalForgotPasswordVerification,
  Landing,
  LoginFocal,
  RegisterAccount,
} from "../pages/Focal";
import VerifyAccount from "../pages/Focal/LoginFocal/pages/RegisterAccount/VerifyAccount";
import VerificationSignin from "../pages/Focal/LoginFocal/pages/SignAccount/VerificationSignin";
import {
  CommunityGroups,
  LoginOfficial,
  Reports,
  Tabular,
  VerificationOfficial,
  Visualization,
} from "../pages/Official";
import { ForgotPasswordFlow } from "../pages/Official/LoginDispatcher/ForgotPasswordFlow";
// TypeScript declaration for window property
declare global {
  interface Window {
    isFocalAuthenticated?: boolean;
  }
}

import FocalDashboard from "../pages/Focal/Dashboard";
import { FocalAuthProvider } from "../pages/Focal/context/focalAuthContext";
import SettingLocationPage from "../pages/Official/CommunityGroups/components/SettingLocationPage";
import { Dispatchers } from "../pages/Official/DispatcherCRUD";
import { Terminals } from "../pages/Official/Terminal";

// Protective route for focal pages
const FocalProtectedRoute: React.FC = () => {
  // Check for focalToken in localStorage (or useFocalAuth if context is available)
  const hasToken = Boolean(localStorage.getItem("focalToken"));
  if (!hasToken) {
    return <Navigate to="/login-focal" replace />;
  }
  return <Outlet />;
};

// Root layout with AuthProvider
const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Landing />,
      },
      // Public login route for focal users
      {
        path: "/login-focal",
        element: <LoginFocal />,
      },
      // Public register route for focal users
      {
        path: "/register-focal",
        element: <RegisterAccount />,
      },
      // Focal verification page (public, uses tempToken)
      {
        path: "/verification-signin-focal",
        element: (
          <FocalAuthProvider>
            <VerificationSignin />
          </FocalAuthProvider>
        ),
      },
      // Focal forgot password flow (public)
      {
        path: "/forgot-password-focal",
        element: <FocalForgotPasswordFlow />,
      },
      // Focal forgot password verification (public)
      {
        path: "/forgot-password-verification-focal",
        element: <FocalForgotPasswordVerification />,
      },
      // Focal Routes (protected)
      {
        element: <FocalProtectedRoute />,
        children: [
          {
            path: "/verify-account-focal",
            element: <VerifyAccount />,
          },
          // {
          //   path: '/register/personal-info',
          //   element: <InfoDetailsRegister step={1} />,
          // },
          // {
          //   path: '/register/profile-picture',
          //   element: <InfoDetailsRegister step={2} />,
          // },
          // {
          //   path: '/register/create-password',
          //   element: <InfoDetailsRegister step={3} />,
          // },
          // {
          //   path: '/register/location-details',
          //   element: <InfoDetailsRegister step={4} />,
          // },
          // {
          //   path: '/register/alternative-focal-person',
          //   element: <InfoDetailsRegister step={5} />,
          // },
          // {
          //   path: '/register/alternative-profile-picture',
          //   element: <InfoDetailsRegister step={6} />,
          // },
          // {
          //   path: '/register/about-neighborhood',
          //   element: <InfoDetailsRegister step={7} />,
          // },
          // {
          //   path: '/register/about-residents',
          //   element: <InfoDetailsRegister step={8} />,
          // },
          // {
          //   path: '/register/floodwater-duration',
          //   element: <InfoDetailsRegister step={9} />,
          // },
          // {
          //   path: '/register/flood-hazards',
          //   element: <InfoDetailsRegister step={10} />,
          // },
          // {
          //   path: '/register/other-info',
          //   element: <InfoDetailsRegister step={11} />,
          // },
          // {
          //   path: '/register/account-review',
          //   element: <AccountReview />,
          // },
          {
            path: "/focal-dashboard",
            element: (
              <FocalAuthProvider>
                <FocalDashboard />
              </FocalAuthProvider>
            ),
          },
        ],
      },

      {
        path: "/login-official",
        element: <LoginOfficial />,
      },
      {
        path: "/verification-official",
        element: <VerificationOfficial />,
      },
      {
        path: "/forgot-password-dispatcher",
        element: <ForgotPasswordFlow />,
      },
      {
        path: "/",
        element: (
          <OfficialLayout>
            <Outlet />
          </OfficialLayout>
        ),
        children: [
          {
            path: "visualization",
            element: <Visualization />,
          },
          {
            path: "reports",
            element: <Reports />,
          },
          {
            path: "community-groups",
            element: <CommunityGroups />,
          },
          {
            path: "dispatchers",
            element: (
              <ProtectedRoute adminOnly={true}>
                <Dispatchers />
              </ProtectedRoute>
            ),
          },
          {
            path: "terminal",
            element: (
              <ProtectedRoute adminOnly={true}>
                <Terminals />
              </ProtectedRoute>
            ),
          },
          {
            path: "tabular",
            element: <Tabular />,
          },
        ],
      },
      {
        path: "community-groups/setting-location",
        element: <SettingLocationPage />,
      },
    ],
  },
]);
