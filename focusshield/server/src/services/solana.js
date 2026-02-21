import bs58 from "bs58";
import CryptoJS from "crypto-js";
import { Connection, Keypair, Transaction, PublicKey } from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function getKeypairFromEnv() {
  const pk58 = process.env.SOLANA_PRIVATE_KEY_BASE58;
  if (!pk58) throw new Error("SOLANA_PRIVATE_KEY_BASE58 missing");
  const secret = bs58.decode(pk58);
  return Keypair.fromSecretKey(secret);
}

function sha256Hex(input) {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

export async function writeReceipt({ interventionId, trigger }) {
  const rpc = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const payer = getKeypairFromEnv();

  const hash = sha256Hex(interventionId).slice(0, 24);
  const memo = `focusshield:v1:${hash}:${trigger}`;

  const ix = {
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8")
  };

  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;

  tx.sign(payer);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  await connection.confirmTransaction(sig, "confirmed");

  return { signature: sig };
}