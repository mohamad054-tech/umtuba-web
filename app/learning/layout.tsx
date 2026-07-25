type LearningLayoutProps = {
  children: React.ReactNode;
};

/** Shared segment so `loading.tsx` covers the Learning subtree. */
export default function LearningLayout({ children }: LearningLayoutProps) {
  return children;
}
