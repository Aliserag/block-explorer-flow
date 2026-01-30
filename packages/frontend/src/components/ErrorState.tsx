import { Button, Result } from "antd";
import { Link } from "react-router-dom";

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load the data you requested.",
}: ErrorStateProps) {
  return (
    <div className="container">
      <Result
        status="error"
        title={<span style={{ color: "var(--text-primary)" }}>{title}</span>}
        subTitle={<span style={{ color: "var(--text-secondary)" }}>{message}</span>}
        extra={
          <Link to="/">
            <Button type="primary" style={{ background: "var(--flow-green)", borderColor: "var(--flow-green)" }}>
              Go Home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
