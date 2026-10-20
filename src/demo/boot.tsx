import { createRoot } from "react-dom/client";
import App from "../App";
import "../index.css";
import "../polish.css";
import { IconSprite } from "@/components/ui/icon";

createRoot(document.getElementById("root")!).render(<><IconSprite /><App /></>);
