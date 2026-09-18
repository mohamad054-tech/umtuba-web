const C = {
  red: "#CE1126",
  dark: "#0C2723",
  gold: "#F0A93B",
  green: "#007A3D",
  blue: "#0055A4",
};

export default function FlagMark({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={id}>
      {id === "jp" ? (
        <>
          <rect width="60" height="40" fill="#fff" />
          <circle cx="30" cy="20" r="9" fill="#BC002D" />
        </>
      ) : id === "fr" ? (
        <>
          <rect width="20" height="40" fill={C.blue} />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#EF4135" />
        </>
      ) : id === "de" ? (
        <>
          <rect width="60" height="13.4" fill="#000" />
          <rect y="13.3" width="60" height="13.4" fill="#DD0000" />
          <rect y="26.6" width="60" height="13.4" fill="#FFCE00" />
        </>
      ) : id === "it" ? (
        <>
          <rect width="20" height="40" fill="#009246" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#CE2B37" />
        </>
      ) : id === "tr" ? (
        <>
          <rect width="60" height="40" fill="#E30A17" />
          <circle cx="25" cy="20" r="8" fill="#fff" />
          <circle cx="27.4" cy="20" r="6.3" fill="#E30A17" />
        </>
      ) : id === "ps" ? (
        <>
          <rect width="60" height="13.4" fill="#000" />
          <rect y="13.3" width="60" height="13.4" fill="#fff" />
          <rect y="26.6" width="60" height="13.4" fill={C.green} />
          <polygon points="0,0 22,20 0,40" fill={C.red} />
        </>
      ) : id === "eg" ? (
        <>
          <rect width="60" height="13.4" fill={C.red} />
          <rect y="13.3" width="60" height="13.4" fill="#fff" />
          <rect y="26.6" width="60" height="13.4" fill="#000" />
          <polygon points="30,16 32,22 28,22" fill="#C09300" />
        </>
      ) : id === "sa" ? (
        <>
          <rect width="60" height="40" fill="#006C35" />
          <rect x="14" y="18" width="32" height="4" fill="#fff" />
          <rect x="38" y="14" width="3" height="12" fill="#fff" />
        </>
      ) : id === "ae" ? (
        <>
          <rect width="16" height="40" fill="#FF0000" />
          <rect x="16" width="44" height="13.4" fill="#00732F" />
          <rect x="16" y="13.3" width="44" height="13.4" fill="#fff" />
          <rect x="16" y="26.6" width="44" height="13.4" fill="#000" />
        </>
      ) : id === "se" ? (
        <>
          <rect width="60" height="40" fill="#006AA7" />
          <rect x="16" width="8" height="40" fill="#FECC00" />
          <rect y="16" width="60" height="8" fill="#FECC00" />
        </>
      ) : id === "ch" ? (
        <>
          <rect width="60" height="40" fill="#FF0000" />
          <rect x="26" y="8" width="8" height="24" fill="#fff" />
          <rect x="18" y="16" width="24" height="8" fill="#fff" />
        </>
      ) : (
        <>
          <rect width="60" height="40" fill="#C1272D" />
          <polygon
            points="30,12 32.4,19.2 40,19.2 33.8,23.6 36.2,31 30,26.4 23.8,31 26.2,23.6 20,19.2 27.6,19.2"
            fill="none"
            stroke="#006233"
            strokeWidth="1.4"
          />
        </>
      )}
    </svg>
  );
}
