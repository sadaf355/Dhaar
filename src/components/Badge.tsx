import type { ReactNode } from 'react';
export default function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'green'|'amber'|'red'|'blue'|'teal'}) { return <span className={`badge badge-${tone}`}>{children}</span> }
