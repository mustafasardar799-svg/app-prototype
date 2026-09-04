interface Props { size?: number }

/** Line icons drawn to a 24px grid, stroked so they inherit the current colour. */
const svg = (path: React.ReactNode) =>
  function Icon({ size = 22 }: Props) {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };

export const IconMenu = svg(
  <>
    <circle cx="7" cy="7" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="7" cy="16" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="7" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
  </>,
);
export const IconBack = svg(<path d="M15 5l-7 7 7 7" />);
export const IconArrow = svg(<><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></>);
export const IconHome = svg(<><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></>);
export const IconOrder = svg(<><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const IconReturn = svg(<><path d="M4 9a8 8 0 1 1 1.6 6" /><path d="M4 4v5h5" /></>);
export const IconMoney = svg(<><path d="M12 3v18" /><path d="M16 7.5c0-1.7-1.8-2.5-4-2.5S8 5.8 8 7.5s1.6 2.3 4 2.9 4 1.2 4 3-1.8 2.6-4 2.6-4-.9-4-2.6" /></>);
export const IconExpense = svg(<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M7 15h4" /></>);
export const IconBonus = svg(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 8v12" /><path d="M12 8s-1-4-3.5-4S6 8 12 8s3.5-4 3.5-4S17 8 12 8z" /></>);
export const IconCalendar = svg(<><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const IconChart = svg(<><path d="M4 19V5" /><path d="M4 15l5-5 4 3 6-7" /><circle cx="19" cy="6" r="1.4" fill="currentColor" stroke="none" /></>);
export const IconUsers = svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.5a3 3 0 0 1 0 5.4M18 20c0-2.6-1-4.2-2.6-5" /></>);
export const IconUser = svg(<><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-3.8 3.3-6 7.5-6s7.5 2.2 7.5 6" /></>);
export const IconPhone = svg(<path d="M6 3h3l2 5-2.2 1.4a12 12 0 0 0 5.8 5.8L16 13l5 2v3a2 2 0 0 1-2.2 2C10.6 19.4 4.6 13.4 4 5.2A2 2 0 0 1 6 3z" />);
export const IconInfo = svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IconTrash = svg(<><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>);
export const IconLogout = svg(<><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l4-4-4-4M14 12H3" /></>);
export const IconPlus = svg(<><path d="M12 5v14M5 12h14" /></>);
export const IconClose = svg(<><path d="M6 6l12 12M18 6L6 18" /></>);
export const IconSearch = svg(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6" /></>);
export const IconEdit = svg(<><path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16.5z" /><path d="M14 6.5 17.5 10" /></>);
export const IconCheck = svg(<path d="M5 12.5 10 17.5 19 7" />);
export const IconTag = svg(<><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>);
