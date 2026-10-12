// Utilitários do módulo parceiros (modelo PF + corrida)

export const PARTNER_CATEGORIES = [
  "Ar Condicionado",
  "Geladeira",
  "Máquina de Lavar",
  "TV/Monitor",
  "Outros",
] as const;

export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const CATEGORY_OPTIONS: { value: PartnerCategory; label: string }[] =
  PARTNER_CATEGORIES.map((c) => ({ value: c, label: c }));

/**
 * Mapeia o nome de um serviço do catálogo para a categoria de parceiro correspondente.
 * Ex.: "AR CONDICIONADO INVERTER" → "Ar Condicionado"
 */
export function mapServiceToPartnerCategory(itemName: string | null | undefined): PartnerCategory {
  const n = (itemName || "").toLowerCase();
  if (n.includes("ar condicionado") || n.includes("climatizador"))
    return "Ar Condicionado";
  if (n.includes("geladeira") || n.includes("adega") || n.includes("refrigerador"))
    return "Geladeira";
  if (n.includes("máquina") || n.includes("maquina") || n.includes("lava") || n.includes("tanquinho"))
    return "Máquina de Lavar";
  if (n.includes("tv") || n.includes("monitor"))
    return "TV/Monitor";
  return "Outros";
}

export const SO_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  offered: "Ofertado",
  accepted: "Aceito",
  assigned_partner: "Parceiro designado",
  assigned_tech: "Técnico designado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcialmente pago",
  paid: "Pago",
  refunded: "Reembolsado",
};

export function validaCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(digits[10]);
}

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data: ViaCepResponse = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export function formatBRL(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

export function calcCommission(total: number, pct: number) {
  const commission = Math.round(((total * pct) / 100) * 100) / 100;
  return {
    commission,
    earnings: Math.round((total - commission) * 100) / 100,
  };
}

export function offerCountdown(expiresAt: string | null): {
  expired: boolean;
  label: string;
} {
  if (!expiresAt) return { expired: true, label: "—" };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: "Expirada" };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { expired: false, label: `${h}h ${m.toString().padStart(2, "0")}m` };
}

export function maskCPFDisplay(cpf: string | null | undefined): string {
  if (!cpf) return "***";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function maskAddressForOffer(address: string | null | undefined): string {
  if (!address) return "Local a definir";
  const parts = address.split(",");
  if (parts.length <= 1) {
    const dash = address.split(" - ");
    return dash[0]?.trim() || "Local a definir";
  }
  const street = parts[0].trim();
  const city = parts[parts.length - 1]?.trim();
  return city ? `${street}, ${city}` : street;
}

export function maskPhoneForOffer(phone: string | null | undefined): string {
  if (!phone) return "***";
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return "***";
  return `**${d.slice(-4)}`;
}
