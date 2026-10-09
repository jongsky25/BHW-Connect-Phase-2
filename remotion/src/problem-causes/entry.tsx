import {Composition, registerRoot} from "remotion";
import {ProblemCausesStory, calculateProblemCausesMetadata, PROBLEM_CAUSES_FPS, PROBLEM_CAUSES_FALLBACK_DURATION} from "./ProblemCausesStory";
const Root = () => <>{(["fil", "en"] as const).map(language => <Composition key={language} id={language === "fil" ? "ProblemCausesStoryFil" : "ProblemCausesStoryEn"} component={ProblemCausesStory} calculateMetadata={calculateProblemCausesMetadata} durationInFrames={PROBLEM_CAUSES_FALLBACK_DURATION} fps={PROBLEM_CAUSES_FPS} width={854} height={480} defaultProps={{language}}/>)}</>;
registerRoot(Root);
