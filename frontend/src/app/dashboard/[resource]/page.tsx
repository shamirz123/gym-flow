"use client";
import { useParams } from "next/navigation";
import ResourcePage from "@/components/dashboard/ResourcePage";
import { RESOURCES } from "@/components/dashboard/resources";

export default function GenericResourcePage() {
  const { resource } = useParams<{ resource: string }>();
  const config = RESOURCES[resource];
  if (!config) return <div className="adm-empty">This page does not exist</div>;
  // key: reset state when switching pages
  return <ResourcePage key={resource} name={resource} config={config} />;
}
