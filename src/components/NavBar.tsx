export type Screen = 'home' | 'about';

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

const TABS: { id: Screen; label: string }[] = [
  { id: 'home', label: 'בית' },
  { id: 'about', label: 'אודות' },
];

export default function NavBar({ current, onNavigate }: Props) {
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="nav-tab"
          aria-current={current === tab.id ? 'page' : undefined}
          onClick={() => onNavigate(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
