import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade | AR Consertos",
  description:
    "Saiba como a AR Consertos coleta, usa e protege seus dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).",
};

const sections = [
  {
    number: 1,
    title: "DADOS QUE COLETAMOS",
    content: `Ao utilizar nosso site ou contratar nossos serviços, podemos coletar:

- Dados de identificação: nome completo, CPF, data de nascimento.
- Dados de contato: telefone, e-mail, endereço.
- Dados de uso: histórico de serviços contratados, produtos comprados, ordens de serviço (O.S.) e pagamentos realizados.
- Dados de acesso: endereço IP, tipo de navegador e páginas visitadas (coletados automaticamente para fins de segurança e melhoria do serviço).
- Foto de perfil: quando enviada voluntariamente pelo próprio usuário.`,
  },
  {
    number: 2,
    title: "FINALIDADE DO TRATAMENTO",
    content: `Utilizamos seus dados para:

- Cadastro e autenticação na plataforma.
- Emissão e controle de ordens de serviço.
- Comunicação sobre o status do seu aparelho e agendamentos.
- Envio de e-mails transacionais (confirmação de conta, recuperação de senha).
- Controle financeiro interno (pagamentos e garantias).
- Cumprimento de obrigações legais e regulatórias.
- Melhoria contínua dos nossos serviços.

Não utilizamos seus dados para envio de publicidade não solicitada (spam) nem os compartilhamos com terceiros para fins comerciais.`,
  },
  {
    number: 3,
    title: "BASE LEGAL",
    content: `O tratamento dos seus dados é fundamentado nas seguintes bases legais previstas na LGPD:

- Execução de contrato: para prestar os serviços contratados (Art. 7º, V).
- Legítimo interesse: para segurança da plataforma e melhoria do serviço (Art. 7º, IX).
- Consentimento: para dados fornecidos voluntariamente no cadastro (Art. 7º, I).
- Cumprimento de obrigação legal: quando exigido por lei (Art. 7º, II).`,
  },
  {
    number: 4,
    title: "COMPARTILHAMENTO DE DADOS",
    content: `Seus dados pessoais podem ser compartilhados apenas com:

- Supabase (supabase.com): plataforma de banco de dados e autenticação onde seus dados são armazenados com segurança.
- Resend (resend.com): serviço de envio de e-mails transacionais.
- Google (Gemini): processamento de mensagens enviadas ao chat de suporte com IA — apenas o conteúdo da mensagem é enviado, sem dados de identificação.
- Autoridades competentes: quando exigido por lei ou ordem judicial.

Todos os fornecedores são contratualmente obrigados a tratar seus dados com confidencialidade e segurança.`,
  },
  {
    number: 5,
    title: "ARMAZENAMENTO E SEGURANÇA",
    content: `Seus dados são armazenados em servidores seguros com:

- Criptografia em trânsito (HTTPS/TLS).
- Controle de acesso por autenticação (Row Level Security no Supabase).
- Acesso restrito apenas ao titular dos dados e ao administrador do sistema.

Os dados são mantidos pelo prazo necessário à prestação do serviço e ao cumprimento de obrigações legais, ou até que você solicite a exclusão.`,
  },
  {
    number: 6,
    title: "SEUS DIREITOS COMO TITULAR",
    content: `Conforme a LGPD, você tem direito a:

- Confirmação da existência de tratamento dos seus dados.
- Acesso aos dados que temos sobre você.
- Correção de dados incompletos, inexatos ou desatualizados.
- Anonimização, bloqueio ou eliminação de dados desnecessários.
- Portabilidade dos seus dados a outro fornecedor.
- Eliminação dos dados tratados com base no consentimento.
- Revogação do consentimento a qualquer momento.
- Oposição ao tratamento em caso de descumprimento da LGPD.

Para exercer qualquer um desses direitos, entre em contato:
📧 contato@arconsertos.com.br
📞 (79) 99944-6596

Também é possível solicitar a exclusão completa da sua conta e dados diretamente em "Minha Conta → Excluir minha conta" na plataforma.`,
  },
  {
    number: 7,
    title: "COOKIES",
    content: `Nosso site utiliza apenas cookies essenciais para o funcionamento da autenticação e do carrinho de compras. Não utilizamos cookies de rastreamento publicitário ou de terceiros para fins de marketing.`,
  },
  {
    number: 8,
    title: "MENORES DE IDADE",
    content: `Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Caso identifique que um menor realizou cadastro, entre em contato para que possamos excluir os dados.`,
  },
  {
    number: 9,
    title: "ALTERAÇÕES NESTA POLÍTICA",
    content: `Esta política pode ser atualizada periodicamente. Sempre que houver alterações relevantes, notificaremos os usuários cadastrados por e-mail e atualizaremos a data de "última atualização" no topo desta página.`,
  },
  {
    number: 10,
    title: "CONTATO E ENCARREGADO (DPO)",
    content: null,
  },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1a1a1a" }}>
      <div className="mx-auto max-w-[780px] px-4 py-12 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
          style={{ color: "#888888" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o início
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <h1 className="font-bebas text-4xl tracking-widest text-white sm:text-5xl">
              POLÍTICA DE PRIVACIDADE
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: "#8B5CF6" }}
            >
              LGPD — Lei nº 13.709/2018
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: "#C9A84C20", color: "#C9A84C" }}
            >
              Última atualização: julho de 2026
            </span>
          </div>
        </div>

        {/* Intro */}
        <div className="mb-8 rounded-xl border border-white/[0.06] bg-[#222222] p-6">
          <p className="text-sm leading-relaxed" style={{ color: "#d0d0d0" }}>
            A <span className="font-semibold text-white">AR Consertos</span>, com sede em Itabaiana/SE, está comprometida com a proteção dos seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações dos nossos clientes, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.number}
              className="rounded-xl border border-white/[0.06] bg-[#222222] p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "#E30613", color: "#fff" }}
                >
                  {section.number}
                </span>
                <h2 className="font-montserrat text-sm font-bold tracking-wide" style={{ color: "#E30613" }}>
                  {section.title}
                </h2>
              </div>
              {section.content ? (
                <div
                  className="whitespace-pre-line text-sm leading-relaxed"
                  style={{ color: "#a0a0a0" }}
                >
                  {section.content}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>
                    Responsável pelo tratamento de dados:
                  </p>
                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="font-medium text-white">Anthony — AR Consertos</p>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: "#a0a0a0" }}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        <a href="mailto:contato@arconsertos.com.br" className="hover:text-white hover:underline transition-colors">
                          contato@arconsertos.com.br
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        <a href="tel:+5579999446596" className="hover:text-white hover:underline transition-colors">
                          (79) 99944-6596
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        <span>Itabaiana/SE</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer back link */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] px-6 py-3 text-sm transition-colors hover:bg-white/[0.02]"
            style={{ color: "#888888" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
