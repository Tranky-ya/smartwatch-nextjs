"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_ROUTES = new Set(["/", "/login", "/privacy-policy"]);

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);

    const token = localStorage.getItem("token");
    const isPublicRoute = PUBLIC_ROUTES.has(pathname);

    if (!token && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (token && pathname === "/login") {
      router.replace("/dashboard");
      return;
    }

    setIsReady(true);
  }, [pathname, router]);

  if (!isReady) {
    return null;
  }

  return children;
}
