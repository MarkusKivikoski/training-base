type LoadingProps = {
  label?: string;
};

export const Loading = ({ label = 'Loading…' }: LoadingProps) => (
  <p className="py-6 text-center text-sm text-ink-3">{label}</p>
);
