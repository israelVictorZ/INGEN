import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Divide o texto em palavras JÁ NO SERVIDOR (cada palavra com máscara),
 * para o GSAP animar sem precisar reestruturar o DOM no cliente.
 * Suporta strings, <br/> e <span className="..."> (incluindo .grad-text).
 */
function splitNode(node: ReactNode, inherited: string, key: string): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    const parts = String(node).split(/(\s+)/);
    return parts.map((part, i) =>
      /^\s+$/.test(part) ? (
        " "
      ) : part ? (
        <span key={`${key}-${i}`} className="inline-block overflow-hidden pb-[0.06em] align-top">
          <span data-w className={`inline-block will-change-transform ${inherited}`}>
            {part}
          </span>
        </span>
      ) : null,
    );
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ className?: string; children?: ReactNode }>;
    if (el.type === "br") return cloneElement(el, { key });
    const cls = el.props.className ?? "";
    const isGrad = cls.includes("grad-text");
    return cloneElement(
      el,
      { key, className: isGrad ? cls.replace("grad-text", "") : cls },
      Children.map(el.props.children, (c, i) => splitNode(c, isGrad ? `${inherited} grad-text` : inherited, `${key}-${i}`)),
    );
  }
  if (Array.isArray(node)) return node.map((c, i) => splitNode(c, inherited, `${key}-${i}`));
  return node;
}

export function Split({
  as: Tag = "h2",
  className,
  children,
  delay,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Tag data-reveal="split" data-delay={delay} className={className}>
      {Children.map(children, (c, i) => splitNode(c, "", `s${i}`))}
    </Tag>
  );
}
