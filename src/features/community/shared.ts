import { z } from "zod";

export const categories = {
  coding: "Coding & DSA",
  projects: "Projects",
  academics: "Academics",
  career: "Career guidance",
} as const;
export const topics = {
  dsa: "DSA / LeetCode",
  python: "Python",
  java: "Java",
  cpp: "C++",
  javascript: "JavaScript",
  react: "React",
  backend: "Backend",
  databases: "Databases",
  "machine-learning": "Machine learning",
  devops: "DevOps",
  mathematics: "Mathematics",
  electronics: "Electronics",
  "system-design": "System design",
  career: "Career",
  projects: "Projects",
  "computer-networks": "Computer networks",
  "operating-systems": "Operating systems",
} as const;
export type Topic = keyof typeof topics;
export const postSchema = z.object({
  id: z.uuid(),
  title: z
    .string()
    .trim()
    .min(10, "Use a descriptive title of at least 10 characters.")
    .max(160),
  body: z
    .string()
    .trim()
    .min(
      20,
      "Describe your problem and what you have tried (at least 20 characters).",
    )
    .max(10000),
  stuckOn: z
    .string()
    .trim()
    .min(10, "Tell a mentor where you are stuck (at least 10 characters).")
    .max(2000),
  category: z.enum(
    Object.keys(categories) as [
      keyof typeof categories,
      ...Array<keyof typeof categories>,
    ],
  ),
  tags: z
    .array(z.enum(Object.keys(topics) as [Topic, ...Topic[]]))
    .min(1, "Choose at least one topic.")
    .max(5, "Choose up to five topics."),
});
export const answerSchema = z.object({
  postId: z.uuid(),
  id: z.uuid(),
  body: z
    .string()
    .trim()
    .min(20, "Explain your approach in at least 20 characters.")
    .max(10000),
});

export function imageType(
  bytes: Uint8Array,
): { mime: string; extension: string } | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  )
    return { mime: "image/png", extension: "png" };
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return { mime: "image/jpeg", extension: "jpg" };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", extension: "webp" };
  return null;
}
