import type messages from '@/messages/en.json';

export function ExperienceSection({ copy }: { copy: typeof messages.experience }) {
  return (
    <section
      className="content-section page-width experience-section"
      aria-labelledby="experience-title"
    >
      <div className="experience-intro">
        <p className="eyebrow section-label">{copy.label}</p>
        <h2 id="experience-title">{copy.title}</h2>
        <p className="section-description">{copy.intro}</p>
      </div>
      <ol className="timeline">
        {copy.items.map((item) => (
          <li key={item.company}>
            <span className="timeline-dot" aria-hidden="true" />
            <article className="employer-card">
              <div className="timeline-meta mb-5 flex flex-wrap justify-between gap-2 font-mono text-[11px] leading-[1.6] text-muted">
                <span>{item.date}</span>
                <span>{item.mode}</span>
              </div>
              <h3>{item.company}</h3>
              <p className="job-role">{item.role}</p>
              <p>{item.body}</p>
              {item.contributions.map((contribution) => (
                <div className="employer-contribution" key={contribution.company}>
                  <p className="company-label">{contribution.company}</p>
                  <h4>{contribution.title}</h4>
                  <p>{contribution.body}</p>
                  <ul className="tags mt-5 flex list-none flex-wrap gap-2 p-0">
                    {contribution.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
