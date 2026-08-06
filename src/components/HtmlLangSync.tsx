"use client";

import { useEffect } from "react";
import type { Lang } from "@/types/city";

export function HtmlLangSync({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
