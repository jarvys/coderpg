interface Props {
  status: "unmarked" | "marked";
  text?: string | React.ReactNode;
}

export default function MarkLabel({ text, status }: Props) {
  return <div style={{ opacity: status === "unmarked" ? 0.4 : 1 }}>{text}</div>;
}
