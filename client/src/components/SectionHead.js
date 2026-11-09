export default function SectionHead({ id, eyebrow, title, children, dark = false, compact = false }) {
  return (
    <div className={`section-head reveal${dark ? ' section-head--dark' : ''}${compact ? ' section-head--compact' : ''}${title ? '' : ' section-head--label'}`}>
      <div className="eyebrow-row">
        <h2 id={id} className="eyebrow"><span className="eyebrow__dot" />{eyebrow}</h2>
        <span className="eyebrow-row__rule" aria-hidden="true" />
      </div>
      {title && <p className="section-head__title font-heading">{title}</p>}
      {children && <p className="section-head__lede">{children}</p>}
    </div>
  );
}
