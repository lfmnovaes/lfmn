export function CountryFlag({ country }: { country: 'US' | 'BR' }) {
  return (
    <svg viewBox="0 0 100 60" className="country-flag" aria-hidden="true" focusable="false">
      <title>{country}</title>
      {country === 'US' ? (
        <>
          <path fill="#b22234" d="M0 0h100v60H0z" />
          {[1, 3, 5, 7, 9, 11].map((stripe) => (
            <path key={stripe} fill="#fff" d={`M0 ${(stripe * 60) / 13}h100v${60 / 13}H0z`} />
          ))}
          <path fill="#3c3b6e" d="M0 0h40v32.3H0z" />
          {Array.from({ length: 50 }, (_, star) => {
            const row = Math.floor(star / 11) * 2 + (star % 11 >= 6 ? 1 : 0);
            const column = star % 11 >= 6 ? (star % 11) - 6 : star % 11;
            return (
              <path
                key={`star-${row}-${column}`}
                fill="#fff"
                d="M0-1.4l.4 1H1.5l-.9.6.3 1.1L0 .7l-.9.6.3-1.1-.9-.6h1.1z"
                transform={`translate(${3.3 + column * 6.6 + (row % 2 ? 3.3 : 0)} ${2 + row * 3.5})`}
              />
            );
          })}
        </>
      ) : (
        <>
          <path fill="#009b3a" d="M0 0h100v60H0z" />
          <path fill="#fedf00" d="M50 7 91 30 50 53 9 30z" />
          <circle fill="#002776" cx="50" cy="30" r="15" />
          <path fill="none" stroke="#fff" strokeWidth="3" d="M36 25q15-3 28 8" />
          <path
            fill="#fff"
            d="m46 34 1 1-1 1-1-1zm9 3 1 1-1 1-1-1zm-5 5 1 1-1 1-1-1zm10-7 1 1-1 1-1-1z"
          />
        </>
      )}
    </svg>
  );
}
