import crypto from "crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function loadKeypair(secretJson) {
  const arr = JSON.parse(secretJson);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export async function writeInterventionReceipt({ rpcUrl, secretKeyJson, interventionId, trigger }) {
  const conn = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(secretKeyJson);

  const hash = sha256Hex(interventionId);
  const memo = `focusshield:v1:${hash}:${trigger}`;

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(memo, "utf8")
  });

  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(conn, tx, [payer]);
  return { signature, memo };
}