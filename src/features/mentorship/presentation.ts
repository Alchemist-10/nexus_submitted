import { topics, type Topic } from "@/features/community/shared";

const normalise = (value: string) =>
  value.toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim();
const aliases: Partial<Record<Topic, string[]>> = {
  dsa: ["dsa", "leetcode", "data structures", "algorithms"],
  "machine-learning": ["ml", "machine learning"],
  mathematics: ["math", "maths", "mathematics"],
  javascript: ["js", "javascript"],
  "operating-systems": ["os", "operating systems"],
  "computer-networks": ["networks", "computer networks"],
  backend: ["back end", "backend"],
};

export function matchesMentorTopic(expertise: string[], topic: string) {
  if (!Object.hasOwn(topics, topic)) return false;
  const key = topic as Topic;
  const names = [key, topics[key], ...(aliases[key] || [])].map(normalise);
  return expertise.some((skill) => names.includes(normalise(skill)));
}

export function expertiseLabel(skill: string) {
  const key = (Object.keys(topics) as Topic[]).find((topic) =>
    matchesMentorTopic([skill], topic),
  );
  return key ? topics[key] : skill;
}
