import React from "react";
import { CSpinner } from "@coreui/react";

const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center py-4"
      style={{ minHeight: "120px" }}
    >
      <CSpinner color="primary" size={size} />
      {text && (
        <div className="mt-2 text-muted" style={{ fontSize: "14px" }}>
          {text}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;