"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Upload,
  Button,
  Alert,
  Steps,
  message,
  Spin,
} from "antd";
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CodeOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

interface VerifyContractFormProps {
  address: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  contractName: string;
  compilerVersion: string;
  optimizationEnabled: boolean;
  optimizationRuns: number;
  evmVersion: string;
  constructorArgs: string;
}

const EVM_VERSIONS = [
  "default",
  "cancun",
  "shanghai",
  "paris",
  "london",
  "berlin",
  "istanbul",
  "petersburg",
  "constantinople",
  "byzantium",
];

export default function VerifyContractForm({
  address,
  open,
  onClose,
  onSuccess,
}: VerifyContractFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [compilerVersions, setCompilerVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>({});
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch compiler versions
  useEffect(() => {
    if (open && compilerVersions.length === 0) {
      fetchCompilerVersions();
    }
  }, [open]);

  const fetchCompilerVersions = async () => {
    setLoadingVersions(true);
    try {
      const response = await fetch("/api/verify/compilers");
      if (response.ok) {
        const data = await response.json();
        setCompilerVersions(data.versions || []);
      } else {
        message.error("Failed to fetch compiler versions");
      }
    } catch (err) {
      message.error("Failed to connect to verification service");
    } finally {
      setLoadingVersions(false);
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setSourceFiles((prev) => ({
      ...prev,
      [file.name]: content,
    }));
    return false; // Prevent default upload behavior
  }, []);

  const handleFileRemove = useCallback((file: UploadFile) => {
    setSourceFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[file.name];
      return newFiles;
    });
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setError(null);

      if (Object.keys(sourceFiles).length === 0) {
        setError("Please upload at least one source file");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/verify/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          contractName: values.contractName,
          compilerVersion: values.compilerVersion,
          sourceFiles,
          optimizationEnabled: values.optimizationEnabled,
          optimizationRuns: values.optimizationEnabled ? values.optimizationRuns : undefined,
          evmVersion: values.evmVersion !== "default" ? values.evmVersion : undefined,
          constructorArgs: values.constructorArgs || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Verification failed");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      message.success("Contract verified successfully!");
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setSourceFiles({});
    setFileList([]);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const steps = [
    {
      title: "Source Files",
      icon: <FileTextOutlined />,
    },
    {
      title: "Compiler",
      icon: <CodeOutlined />,
    },
    {
      title: "Settings",
      icon: <SettingOutlined />,
    },
    {
      title: "Verify",
      icon: <SafetyCertificateOutlined />,
    },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return Object.keys(sourceFiles).length > 0;
      case 1:
        return form.getFieldValue("compilerVersion") && form.getFieldValue("contractName");
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: "var(--flow-green)" }} />
          <span>Verify Contract</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      styles={{
        content: {
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        },
        header: {
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-subtle)",
        },
      }}
    >
      {/* Address Display */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          marginBottom: 24,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--text-secondary)",
          wordBreak: "break-all",
        }}
      >
        {address}
      </div>

      {/* Steps */}
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        style={{ marginBottom: 32 }}
      />

      {/* Success State */}
      {success ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <CheckCircleOutlined
            style={{ fontSize: 64, color: "var(--status-success)", marginBottom: 16 }}
          />
          <h3 style={{ fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>
            Contract Verified!
          </h3>
          <p style={{ color: "var(--text-muted)" }}>
            The contract source code has been verified and stored.
          </p>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            optimizationEnabled: true,
            optimizationRuns: 200,
            evmVersion: "default",
          }}
        >
          {/* Step 0: Source Files */}
          {currentStep === 0 && (
            <div>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
                Upload your Solidity source files (.sol). If your contract uses imports,
                upload all required files.
              </p>

              <Upload.Dragger
                multiple
                accept=".sol"
                fileList={fileList}
                beforeUpload={(file) => {
                  handleFileUpload(file);
                  setFileList((prev) => [...prev, file as any]);
                  return false;
                }}
                onRemove={(file) => {
                  handleFileRemove(file);
                  setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                }}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px dashed var(--border-default)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <p style={{ fontSize: 32, color: "var(--text-muted)", marginBottom: 8 }}>
                  <UploadOutlined />
                </p>
                <p style={{ color: "var(--text-primary)", fontSize: 14 }}>
                  Click or drag Solidity files to upload
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Supports .sol files
                </p>
              </Upload.Dragger>

              {Object.keys(sourceFiles).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
                    {Object.keys(sourceFiles).length} file(s) ready for verification
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Compiler */}
          {currentStep === 1 && (
            <div>
              <Form.Item
                name="contractName"
                label="Contract Name"
                rules={[{ required: true, message: "Please enter the contract name" }]}
              >
                <Input
                  placeholder="e.g., MyToken"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </Form.Item>

              <Form.Item
                name="compilerVersion"
                label="Compiler Version"
                rules={[{ required: true, message: "Please select a compiler version" }]}
              >
                <Select
                  showSearch
                  placeholder="Select compiler version"
                  loading={loadingVersions}
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={compilerVersions.map((v) => ({
                    value: v,
                    label: v,
                  }))}
                  notFoundContent={
                    loadingVersions ? (
                      <Spin size="small" />
                    ) : (
                      "No versions available"
                    )
                  }
                />
              </Form.Item>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 2 && (
            <div>
              <Form.Item
                name="optimizationEnabled"
                label="Optimization"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.optimizationEnabled !== curr.optimizationEnabled
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue("optimizationEnabled") ? (
                    <Form.Item name="optimizationRuns" label="Optimization Runs">
                      <InputNumber min={1} max={10000} style={{ width: "100%" }} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              <Form.Item name="evmVersion" label="EVM Version">
                <Select
                  options={EVM_VERSIONS.map((v) => ({
                    value: v,
                    label: v.charAt(0).toUpperCase() + v.slice(1),
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="constructorArgs"
                label="Constructor Arguments (hex, optional)"
                tooltip="ABI-encoded constructor arguments, without 0x prefix"
              >
                <Input.TextArea
                  placeholder="e.g., 000000000000000000000000..."
                  rows={3}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                />
              </Form.Item>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <h4 style={{ color: "var(--text-primary)", marginBottom: 12 }}>
                  Verification Summary
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Contract:</span>
                    <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {form.getFieldValue("contractName")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Compiler:</span>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {form.getFieldValue("compilerVersion")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Optimization:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {form.getFieldValue("optimizationEnabled")
                        ? `Yes (${form.getFieldValue("optimizationRuns")} runs)`
                        : "No"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Source Files:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {Object.keys(sourceFiles).length}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert
                  type="error"
                  message="Verification Failed"
                  description={error}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
                The verifier will compile your source code and compare it with the
                deployed bytecode.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 32,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <Button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0 || submitting}
            >
              Back
            </Button>

            {currentStep < 3 ? (
              <Button
                type="primary"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                style={{
                  background: canProceed() ? "var(--flow-green)" : undefined,
                  borderColor: canProceed() ? "var(--flow-green)" : undefined,
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
                icon={submitting ? <LoadingOutlined /> : <SafetyCertificateOutlined />}
                style={{
                  background: "var(--flow-green)",
                  borderColor: "var(--flow-green)",
                }}
              >
                {submitting ? "Verifying..." : "Verify Contract"}
              </Button>
            )}
          </div>
        </Form>
      )}
    </Modal>
  );
}
