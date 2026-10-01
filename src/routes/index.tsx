import { createFileRoute } from "@tanstack/react-router";
import { RosemaApp } from "@/components/rosema/app";

export const Route = createFileRoute("/")({
  ssr: false,
  component: RosemaApp,
});
