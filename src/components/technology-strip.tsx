import { TechnologyCarousel } from './technology-carousel';

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
      <div className="grid gap-6">
        {rows.map((technologies, index) => (
          <div className="technology-row min-w-0" key={technologies[0][0]}>
            <h3 className="eyebrow" id={`technology-category-${index}`}>
              {categories[index]}
            </h3>
            <TechnologyCarousel labelledBy={`technology-category-${index}`}>
              <div className="technology-track">
                {[false, true].map((duplicate) => (
                  <ul
                    className={`technology-group m-0 list-none gap-4 p-0${duplicate ? ' technology-duplicate' : ''}`}
                    aria-hidden={duplicate || undefined}
                    key={String(duplicate)}
                  >
                    {technologies.map(([name, icon]) => (
                      <li
                        className="technology-card relative flex min-h-31.5 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-(--surface) px-2.5 py-4 text-xs font-medium text-foreground"
                        key={name}
                      >
                        <span className="technology-icon grid size-16 place-items-center rounded-xl bg-[#f8f9fc]">
                          {/* biome-ignore lint/performance/noImgElement: Local SVG logos need no raster optimization or image client runtime. */}
                          <img
                            className="block size-13 object-contain"
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
            </TechnologyCarousel>
          </div>
        ))}
      </div>
    </section>
  );
}
