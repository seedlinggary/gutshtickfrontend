import React from 'react';

/** A short "what is this / how it works" note, used consistently at the top
 * of every owner tool and several customer-facing widgets -- so a first-time
 * user never has to guess what a feature does before trying it. */
export default function ToolExplainer({ children }) {
  return <p className="biz-tool-explainer">{children}</p>;
}
