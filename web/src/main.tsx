import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RosemaApp } from "./rosema/RosemaApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RosemaApp />
  </StrictMode>,
);
