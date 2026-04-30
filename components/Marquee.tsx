'use client';

type Props = {
  items: string[];
  speed?: number;
};

export default function Marquee({ items, speed = 38 }: Props) {
  const sequence = [...items, ...items];
  return (
    <div className="aura-marquee">
      <div className="aura-marquee-track" style={{ animationDuration: `${speed}s` }}>
        {sequence.map((item, i) => (
          <span key={i} className="aura-marquee-item">
            <span className="aura-marquee-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
