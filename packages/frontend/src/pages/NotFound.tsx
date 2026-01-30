import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container" style={{ paddingTop: "var(--space-3xl)" }}>
      <Result
        status="404"
        title={<span style={{ color: "var(--text-primary)" }}>404</span>}
        subTitle={<span style={{ color: "var(--text-secondary)" }}>Sorry, the page you visited does not exist.</span>}
        extra={
          <Link to="/">
            <Button
              type="primary"
              size="large"
              style={{
                background: "var(--flow-green)",
                borderColor: "var(--flow-green)",
              }}
            >
              Back Home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
