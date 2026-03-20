import React from "react";
import { AlertTriangle } from "lucide-react";

const StateCard = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral",
}) => {
  const toneClasses =
    tone === "error"
      ? "border-error-500/40 bg-error-500/10"
      : "border-dark-700 bg-dark-800";

  const DisplayIcon = Icon || AlertTriangle;

  return (
    <div className={`card text-center py-10 border ${toneClasses}`}>
      <DisplayIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="text-gray-400 mt-2">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="btn-primary mt-4" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export default StateCard;
