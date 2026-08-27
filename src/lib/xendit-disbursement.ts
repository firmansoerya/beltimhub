const XENDIT_SECRET = process.env.XENDIT_SECRET_KEY ?? "";
const XENDIT_BASE = "https://api.xendit.co";

function authHeader() {
  return "Basic " + Buffer.from(XENDIT_SECRET + ":").toString("base64");
}

export async function getXenditBalance(): Promise<{ balance: number }> {
  const res = await fetch(`${XENDIT_BASE}/balance`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xendit Balance API error: ${res.status} ${err}`);
  }
  return res.json();
}

export interface DisbursementParams {
  externalId: string;
  bankCode: string;
  accountHolderName: string;
  accountNumber: string;
  amount: number;
  description: string;
}

export interface DisbursementResult {
  id: string;
  external_id: string;
  amount: number;
  bank_code: string;
  account_holder_name: string;
  status: string;
}

export async function createDisbursement(params: DisbursementParams): Promise<DisbursementResult> {
  const res = await fetch(`${XENDIT_BASE}/disbursements`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: params.externalId,
      bank_code: params.bankCode,
      account_holder_name: params.accountHolderName,
      account_number: params.accountNumber,
      amount: params.amount,
      description: params.description,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xendit Disbursement API error: ${res.status} ${err}`);
  }
  return res.json();
}

// Map nama bank display ke kode Xendit disbursement
export const BANK_NAME_TO_CODE: Record<string, string> = {
  "Bank Rakyat Indonesia (BRI)": "BRI",
  "Bank Mandiri": "MANDIRI",
  "Bank Negara Indonesia (BNI)": "BNI",
  "Bank Tabungan Negara (BTN)": "BTN",
  "Bank Central Asia (BCA)": "BCA",
  "Bank CIMB Niaga": "CIMB",
  "Bank Danamon": "DANAMON",
  "Bank Panin": "PANIN",
  "Bank OCBC NISP": "OCBC_NISP",
  "Bank Permata": "PERMATA",
  "Bank Mega": "MEGA",
  "Bank Bukopin": "BUKOPIN",
  "Bank Sinarmas": "SINARMAS",
  "Bank Maybank Indonesia": "MAYBANK",
  "Bank Syariah Indonesia (BSI)": "BSI",
  "Bank Muamalat": "MUAMALAT",
  "Bank BTPN": "BTPN",
  "Jenius (Bank BTPN)": "BTPN",
  "Bank Jago": "JAGO",
  "Bank DKI": "DKI",
  "Bank BJB (Jabar Banten)": "BJB",
  "Bank Jateng": "JATENG",
  "Bank Jatim": "JATIM",
  "Bank Aceh": "ACEH",
  "Bank Sumut": "SUMUT",
  "Bank Sumsel Babel": "SUMSEL_BABEL",
  "Bank Riau Kepri": "RIAU_KEPRI",
  "Bank Lampung": "LAMPUNG",
  "Bank Kaltim Kaltara": "KALTIMTARA",
  "Bank Kalbar": "KALBAR",
  "Bank Kalsel": "KALSEL",
  "Bank Sulselbar": "SULSELBAR",
  "Bank Papua": "PAPUA",
  "Bank NTB Syariah": "NTB_SYARIAH",
  "Bank NTT": "NTT",
  "Bank Maluku Malut": "MALUKU",
  "Bank Bengkulu": "BENGKULU",
  "Bank Sultra": "SULTRA",
  "Bank Sulteng": "SULTENG",
  "Sea Bank Indonesia": "SEABANK",
  "Bank Neo Commerce": "NEO_COMMERCE",
  "Bank Digital BCA (Blu)": "BCA_DIGITAL",
};
