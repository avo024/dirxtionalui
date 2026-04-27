import { createRoot } from "react-dom/client";
import "./lib/amplify"; // side-effect: Amplify.configure()
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
