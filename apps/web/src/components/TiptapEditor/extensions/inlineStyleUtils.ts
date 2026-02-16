export function getInlineStyleValue(
  element: HTMLElement,
  propertyName: string,
): string | null {
  const styleAttribute = element.getAttribute("style");
  if (!styleAttribute) return null;

  const targetProperty = propertyName.trim().toLowerCase();
  const declarations = styleAttribute.split(";");

  for (const declaration of declarations) {
    const [property, ...valueParts] = declaration.split(":");
    if (!property || valueParts.length === 0) continue;

    if (property.trim().toLowerCase() === targetProperty) {
      const value = valueParts.join(":").trim();
      return value || null;
    }
  }

  return null;
}
