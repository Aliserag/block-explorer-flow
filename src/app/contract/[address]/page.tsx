import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getCode } from "@/lib/rpc";
import { getContract } from "@/lib/ponder";
import { checkVerification, getVerifiedSources } from "@/lib/sourcify";
import ContractContent from "./ContractContent";

export const revalidate = 30;

export default async function ContractPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!isAddress(address)) notFound();

  const addr = address as Address;

  // Fetch all contract data in parallel
  const [code, contractData, verificationStatus] = await Promise.all([
    getCode(addr),
    getContract(address),
    checkVerification(address),
  ]);

  // Verify it's actually a contract
  const isContract = code !== "0x" && code.length > 2;
  if (!isContract) {
    notFound();
  }

  // Get verified sources if contract is verified
  let verifiedContract = null;
  if (verificationStatus !== "none") {
    verifiedContract = await getVerifiedSources(address);
  }

  return (
    <ContractContent
      address={address}
      bytecode={code}
      bytecodeSize={code ? (code.length - 2) / 2 : 0}
      contractData={contractData}
      verificationStatus={verificationStatus}
      verifiedContract={verifiedContract}
    />
  );
}
