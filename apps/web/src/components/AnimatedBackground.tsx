import { useEffect, useState } from "react";

/**
 * AnimatedBackground — static gradient background.
 * Theme-aware:
 *   Light → linear-gradient(-29deg, #f3b067, #211f1f)
 *   Dark  → linear-gradient(-29deg, #01111D, #074F83)
 */
export default function AnimatedBackground() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDark(theme !== "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="animated-bg" data-theme-mode={isDark ? "dark" : "light"} />
  );
}
