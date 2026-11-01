/** Aria's simple avatar: a warm circle with ఆ. It pulses while she listens or speaks. */
export function AriaAvatar({ size = 40, active = false }: { size?: number; active?: boolean }) {
  return (
    <div
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-[#2b2a6b] ${active ? "pulse" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.48,
        background: "radial-gradient(circle at 30% 30%, #ffd98e, #e9a23b 60%, #d27f1a)",
        lineHeight: 1,
      }}
    >
      ఆ
    </div>
  );
}
