// A deliberately schematic hand: palm, four fingers and a thumb, drawn palm
// towards the viewer with the fingers pointing up and the thumb on the left.
// Two flat, non-skin colours tell the hands apart without implying a skin
// tone. `side="right"` mirrors it.

export const LEFT_HAND = { fill: "#cfe9df", stroke: "#145847" };
export const RIGHT_HAND = { fill: "#ffe1b8", stroke: "#8a4b0f" };

const FINGERS = [
  { x: -27, h: 50 },
  { x: -9, h: 62 },
  { x: 9, h: 66 },
  { x: 27, h: 56 },
];

export const Hand: React.FC<{
  side: "left" | "right";
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  // 0 = straight fingers, 1 = fully curled (knuckles only).
  curl?: number;
  // Show nails: the viewer is looking at the back of this hand.
  back?: boolean;
  thumb?: boolean;
  opacity?: number;
}> = ({
  side,
  x,
  y,
  rotate = 0,
  scale = 1,
  curl = 0,
  back = false,
  thumb = true,
  opacity = 1,
}) => {
  const colors = side === "left" ? LEFT_HAND : RIGHT_HAND;
  // The drawing is a left hand seen from the palm; the back of a left hand
  // and the palm of a right hand are both its mirror image.
  const mirror = (side === "right") !== back ? -1 : 1;
  const paint = {
    fill: colors.fill,
    stroke: colors.stroke,
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
  };
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * mirror} ${scale})`}
      opacity={opacity}
    >
      {thumb ? (
        <rect
          x={-9}
          y={-46}
          width={18}
          height={50}
          rx={9}
          transform="translate(-34 22) rotate(-38)"
          {...paint}
        />
      ) : null}
      {FINGERS.map((f) => {
        const h = f.h * (1 - 0.72 * curl);
        return (
          <g key={f.x}>
            <rect
              x={f.x - 8}
              y={-26 - h}
              width={16}
              height={h + 12}
              rx={8}
              {...paint}
            />
            {back && curl < 0.5 ? (
              <rect
                x={f.x - 5}
                y={-24 - h}
                width={10}
                height={11}
                rx={4}
                fill="#ffffff"
                opacity={0.8}
              />
            ) : null}
          </g>
        );
      })}
      <rect x={-38} y={-32} width={76} height={80} rx={22} {...paint} />
    </g>
  );
};
