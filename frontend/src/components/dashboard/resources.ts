import { FEATURE_ICONS } from "@/components/site/icons";
import type { Permission } from "@/lib/types";
import type { FieldDef } from "./ui";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const order: FieldDef = { name: "order", label: "Order (lower numbers first)", type: "number" };

export type Row = Record<string, any> & { id: string };
export type Column = [key: string, label: string, render?: "image" | "money" | "badge" | "bool" | "date" | "clip" | "count" | "icon" | "status"];

export type ResourceConfig = {
  title: string;
  singular: string;
  view: Permission;
  write: Permission;
  fields: FieldDef[];
  columns: Column[];
  filter?: { name: string; options: string[] };
  statusOptions?: string[];
  defaults?: Record<string, unknown>;
  sortClient?: (a: Row, b: Row) => number;
  waText?: (r: Row) => string;
  convert?: boolean;
  markRead?: boolean;
  csv?: boolean;
};

const content = { view: "content:view", write: "content:write" } as const;
const inbox = { view: "inbox:view", write: "inbox:write" } as const;

/**
 * Per resource: form fields, table columns, filters and permissions.
 */
export const RESOURCES: Record<string, ResourceConfig> = {
  plans: {
    title: "Membership Plans", singular: "Plan", ...content,
    fields: [
      { name: "name", label: "Plan Name", required: true },
      { name: "monthly", label: "Monthly Price (Rs.)", type: "number", required: true },
      { name: "popular", label: "Show the Most Popular badge", type: "checkbox" },
      { name: "features", label: "Included Features ✓", type: "list" },
      { name: "missing", label: "Not Included ✗", type: "list" },
      order,
    ],
    columns: [["name", "Plan"], ["monthly", "Monthly", "money"], ["popular", "Popular", "bool"], ["features", "Features", "count"]],
    defaults: { features: [], missing: [], popular: false },
  },
  programs: {
    title: "Programs", singular: "Program", ...content,
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "level", label: "Level", placeholder: "Beginner / All Levels" },
      { name: "text", label: "Description", type: "textarea" },
      { name: "image", label: "Image", type: "image" },
      order,
    ],
    columns: [["image", "", "image"], ["title", "Title"], ["level", "Level"], ["text", "Description", "clip"]],
  },
  classes: {
    title: "Class Schedule", singular: "Class", ...content,
    fields: [
      { name: "day", label: "Day", type: "select", options: DAYS, required: true },
      { name: "time", label: "Time", placeholder: "06:00 AM", required: true },
      { name: "name", label: "Class Name", required: true },
      { name: "trainer", label: "Trainer" },
      { name: "room", label: "Room / Hall" },
      order,
    ],
    columns: [["day", "Day"], ["time", "Time"], ["name", "Class"], ["trainer", "Trainer"], ["room", "Room"]],
    filter: { name: "day", options: DAYS },
    defaults: { day: "Monday" },
    sortClient: (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.order - b.order,
  },
  trainers: {
    title: "Trainers", singular: "Trainer", ...content,
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "role", label: "Role / Speciality" },
      { name: "exp", label: "Experience", placeholder: "8 years" },
      { name: "image", label: "Photo", type: "image" },
      { name: "phone", label: "Phone" },
      { name: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/..." },
      { name: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
      order,
    ],
    columns: [["image", "", "image"], ["name", "Name"], ["role", "Role"], ["exp", "Experience"]],
  },
  gallery: {
    title: "Gallery", singular: "Image", ...content,
    fields: [
      { name: "image", label: "Image", type: "image", required: true },
      { name: "category", label: "Category", type: "select", options: ["equipment", "training", "classes"], required: true },
      order,
    ],
    columns: [["image", "", "image"], ["category", "Category", "badge"], ["order", "Order"]],
    filter: { name: "category", options: ["equipment", "training", "classes"] },
    defaults: { category: "training" },
  },
  testimonials: {
    title: "Testimonials", singular: "Testimonial", ...content,
    fields: [
      { name: "name", label: "Member Name", required: true },
      { name: "result", label: "Result", placeholder: "Lost 18 kg in 5 months" },
      { name: "text", label: "Review", type: "textarea" },
      { name: "image", label: "Photo", type: "image" },
      order,
    ],
    columns: [["image", "", "image"], ["name", "Name"], ["result", "Result"], ["text", "Review", "clip"]],
  },
  features: {
    title: "Why Choose Us", singular: "Feature", ...content,
    fields: [
      { name: "icon", label: "Icon", type: "select", options: Object.keys(FEATURE_ICONS), required: true },
      { name: "title", label: "Title", required: true },
      { name: "text", label: "Text", type: "textarea" },
      order,
    ],
    columns: [["icon", "Icon", "icon"], ["title", "Title"], ["text", "Text", "clip"]],
    defaults: { icon: "dumbbell" },
  },
  faqs: {
    title: "FAQs", singular: "FAQ", ...content,
    fields: [{ name: "q", label: "Question", required: true }, { name: "a", label: "Answer", type: "textarea" }, order],
    columns: [["q", "Question"], ["a", "Answer", "clip"]],
  },
  leads: {
    title: "Trial Leads", singular: "Lead", ...inbox,
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "plan", label: "Plan" },
      { name: "time", label: "Preferred Time" },
      { name: "goal", label: "Goal" },
      { name: "status", label: "Status", type: "select", options: ["new", "contacted", "joined", "lost"], required: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [["name", "Name"], ["phone", "Phone"], ["plan", "Plan"], ["goal", "Goal"], ["createdAt", "Date", "date"], ["status", "Status", "status"]],
    filter: { name: "status", options: ["new", "contacted", "joined", "lost"] },
    statusOptions: ["new", "contacted", "joined", "lost"],
    defaults: { status: "new" },
    waText: (r) => `Hello ${r.name}! You requested a free trial on our website. When would you like to visit the gym?`,
    convert: true,
  },
  bookings: {
    title: "Class Bookings", singular: "Booking", ...inbox,
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "className", label: "Class" },
      { name: "day", label: "Day", type: "select", options: DAYS },
      { name: "time", label: "Time" },
      { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "cancelled"], required: true },
    ],
    columns: [["name", "Name"], ["phone", "Phone"], ["className", "Class"], ["day", "Day"], ["time", "Time"], ["status", "Status", "status"]],
    filter: { name: "status", options: ["pending", "confirmed", "cancelled"] },
    statusOptions: ["pending", "confirmed", "cancelled"],
    defaults: { status: "pending" },
    waText: (r) => `Hello ${r.name}! Your ${r.className} class (${r.day}, ${r.time}) is confirmed. See you there 💪`,
  },
  messages: {
    title: "Messages", singular: "Message", ...inbox,
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone" },
      { name: "message", label: "Message", type: "textarea", required: true },
      { name: "read", label: "Read", type: "checkbox" },
    ],
    columns: [["name", "Name"], ["phone", "Phone"], ["message", "Message", "clip"], ["createdAt", "Date", "date"], ["read", "Read", "bool"]],
    waText: (r) => `Hello ${r.name}! Thank you for your message. `,
    markRead: true,
  },
  subscribers: {
    title: "Newsletter Subscribers", singular: "Subscriber", ...inbox,
    fields: [{ name: "email", label: "Email", type: "email", required: true }],
    columns: [["email", "Email"], ["createdAt", "Subscribed", "date"]],
    csv: true,
  },
};
