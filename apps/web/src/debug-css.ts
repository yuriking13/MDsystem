// Диагностический скрипт для отладки CSS и Tailwind
console.log("🔍 === ДИАГНОСТИКА CSS ===");

// Проверка загрузки стилей
setTimeout(() => {
  const stylesheets = document.styleSheets;
  console.log(`📊 Всего таблиц стилей загружено: ${stylesheets.length}`);

  for (let i = 0; i < stylesheets.length; i++) {
    const sheet = stylesheets[i];
    try {
      const href = sheet.href || "inline";
      const rulesCount = sheet.cssRules ? sheet.cssRules.length : 0;
      console.log(`  ${i + 1}. ${href} - ${rulesCount} правил`);

      // Проверка наличия Tailwind классов
      if (sheet.cssRules && rulesCount > 0) {
        let hasTailwind = false;
        for (let j = 0; j < Math.min(10, sheet.cssRules.length); j++) {
          const rule = sheet.cssRules[j];
          if (
            rule.cssText &&
            (rule.cssText.includes("tailwind") ||
              rule.cssText.includes("bg-") ||
              rule.cssText.includes("text-") ||
              rule.cssText.includes("flex"))
          ) {
            hasTailwind = true;
            break;
          }
        }
        if (hasTailwind) {
          console.log(`    ✅ Содержит Tailwind классы`);
        }
      }
    } catch (e) {
      console.log(`  ${i + 1}. (CORS блокировка или ошибка)`);
    }
  }

  // Проверка computed styles на root элементе
  const root = document.getElementById("root");
  if (root) {
    const styles = window.getComputedStyle(root);
    console.log("📐 Root элемент computed styles:");
    console.log(`  background: ${styles.background}`);
    console.log(`  color: ${styles.color}`);
    console.log(`  font-family: ${styles.fontFamily}`);
    console.log(`  display: ${styles.display}`);
  }

  // Проверка body стилей
  const bodyStyles = window.getComputedStyle(document.body);
  console.log("📐 Body элемент computed styles:");
  console.log(`  background: ${bodyStyles.background}`);
  console.log(`  color: ${bodyStyles.color}`);
  console.log(`  font-family: ${bodyStyles.fontFamily}`);

  // Проверка наличия Tailwind утилит
  const testDiv = document.createElement("div");
  testDiv.className = "bg-blue-500 text-white p-4";
  document.body.appendChild(testDiv);
  const testStyles = window.getComputedStyle(testDiv);
  console.log("Test Tailwind classes (bg-blue-500 text-white p-4):");
  console.log(`  background-color: ${testStyles.backgroundColor}`);
  console.log(`  color: ${testStyles.color}`);
  console.log(`  padding: ${testStyles.padding}`);

  // Проверка что цвет не прозрачный и padding есть (oklch это нормально для Tailwind v4)
  const hasBgColor =
    testStyles.backgroundColor !== "rgba(0, 0, 0, 0)" &&
    testStyles.backgroundColor !== "transparent";
  const hasPadding = testStyles.padding !== "0px";

  if (hasBgColor && hasPadding) {
    console.log("  OK: Tailwind CSS works correctly!");
  } else {
    console.error("  ERROR: Tailwind CSS NOT WORKING!");
    console.error(
      `  Has background: ${hasBgColor}, Has padding: ${hasPadding}`,
    );
  }

  document.body.removeChild(testDiv);

  // ВАЖНО: Проверка почему Root пустой
  if (root) {
    console.log("CRITICAL: Root element check:");
    console.log(`  innerHTML length: ${root.innerHTML.length}`);
    console.log(
      `  innerHTML preview: ${root.innerHTML.substring(0, 200) || "(empty)"}`,
    );
    console.log(`  children count: ${root.children.length}`);
    if (root.children.length > 0) {
      console.log(`  First child: ${root.children[0].tagName}`);
      console.log(`  First child classes: ${root.children[0].className}`);
    } else {
      console.error("  ERROR: Root has no children! React failed to render!");
    }
  }

  console.log("=== END DIAGNOSTICS ===");
}, 1000);

export {};
