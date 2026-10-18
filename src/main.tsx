import { createRoot } from "react-dom/client";
import "./lib/amplify"; // side-effect: Amplify.configure()
import App from "./App.tsx";
import "./index.css";
import "./polish.css";
import { IconSprite } from "@/components/ui/icon";

createRoot(document.getElementById("root")!).render(<><IconSprite /><App /></>);
