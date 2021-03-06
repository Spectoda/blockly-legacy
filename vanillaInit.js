import { TangleDevice } from "./lib/tangle-js/TangleDevice.js";
import { TimeTrack } from "./lib/tangle-js/TimeTrack.js";
import { TnglCodeParser } from "./lib/tangle-js/TangleParser.js";
import { uint8ArrayToHexString, computeTnglFingerprint, enableDebugMode, deactivateDebugMode } from "./lib/tangle-js/functions.js";
import TangleMsgBox from "./lib/webcomponents/dialog-component.js";
import "./control.js";

window.TangleDevice = TangleDevice;
window.TimeTrack = TimeTrack;
window.TnglCodeParser = TnglCodeParser;
window.uint8ArrayToHexString = uint8ArrayToHexString;
window.computeTnglFingerprint = computeTnglFingerprint;
window.TangleMsgBox = TangleMsgBox;
window.enableDebugMode = enableDebugMode;
window.deactivateDebugMode = deactivateDebugMode;

function injectScript(src) {
  const script = document.createElement("script");
  script.src = src;
  document.head.appendChild(script);
}

injectScript("code_theme.js");
injectScript("code.js");
// injectScript("control.js");
