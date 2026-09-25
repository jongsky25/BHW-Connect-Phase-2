import "./index.css";
import { Composition } from "remotion";
import {
  HANDRUB_DURATION,
  HANDRUB_FPS,
  HandrubSteps,
} from "./hand-hygiene/HandrubSteps";

// Compositions are authored at the lesson format (854×480, see
// scripts/remotion-render.mjs) so the render needs no scaling.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HandrubSteps"
        component={HandrubSteps}
        durationInFrames={HANDRUB_DURATION}
        fps={HANDRUB_FPS}
        width={854}
        height={480}
      />
    </>
  );
};
