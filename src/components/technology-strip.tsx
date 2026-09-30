const rows = [
  [
    ['React', 'react'],
    ['Next.js', 'nextjs'],
    ['TypeScript', 'typescript'],
    ['JavaScript', 'javascript'],
    ['Tailwind CSS', 'tailwindcss'],
    ['HTML', 'html5'],
    ['CSS', 'css3'],
    ['React Native', 'react'],
  ],
  [
    ['Node.js', 'nodejs'],
    ['NestJS', 'nestjs'],
    ['Ruby', 'ruby'],
    ['Ruby on Rails', 'rails'],
    ['PostgreSQL', 'postgresql'],
    ['GraphQL', 'graphql'],
    ['C#', 'csharp'],
    ['ASP.NET', 'dot-net'],
    ['SQL Server', 'microsoftsqlserver'],
  ],
  [
    ['Git', 'git'],
    ['GitHub', 'github'],
    ['Playwright', 'playwright'],
    ['Jest', 'jest'],
    ['RSpec', 'rspec'],
    ['Sentry', 'sentry'],
    ['Storybook', 'storybook'],
    ['Datadog', 'datadog'],
    ['Redux', 'redux'],
  ],
] as const;

export function TechnologyStrip({
  title,
  intro,
  categories,
  instructions,
}: {
  title: string;
  intro: string;
  categories: string[];
  instructions: string;
}) {
  return (
    <section className="technology-section page-width" aria-labelledby="technology-title">
      <div className="technology-heading">
        <h2 id="technology-title">{title}</h2>
        <p>{intro}</p>
      </div>
      <p className="sr-only" id="technology-instructions">
        {instructions}
      </p>
      <div className="technology-rows">
        {rows.map((technologies, index) => (
          <div className="technology-row" key={technologies[0][0]}>
            <h3 className="eyebrow" id={`technology-category-${index}`}>
              {categories[index]}
            </h3>
            <section
              className="technology-viewport"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard focus pauses this reading region, as described by its instructions.
              tabIndex={0}
              aria-labelledby={`technology-category-${index}`}
              aria-describedby="technology-instructions"
            >
              <div className="technology-track">
                {[false, true].map((duplicate) => (
                  <ul
                    className={`technology-group${duplicate ? ' technology-duplicate' : ''}`}
                    aria-hidden={duplicate || undefined}
                    key={String(duplicate)}
                  >
                    {technologies.map(([name, icon]) => (
                      <li className="technology-card" key={name}>
                        <span className="technology-icon">
                          {/* biome-ignore lint/performance/noImgElement: Local SVG logos need no raster optimization or image client runtime. */}
                          <img
                            src={`/technologies/${icon}.svg`}
                            alt=""
                            width={52}
                            height={52}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </section>
          </div>
        ))}
      </div>
    </section>
  );
}
