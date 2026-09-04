import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos e condições de uso dos serviços e plataforma da AR Consertos em Itabaiana/SE.",
  alternates: {
    canonical: "https://ar-consertos.vercel.app/termos-de-uso",
  },
};

const sections = [
  {
    number: 1,
    title: "ACEITAÇÃO DOS TERMOS",
    content: `Ao acessar e utilizar o site e os serviços da AR Consertos, você concorda com estes Termos de Uso. Caso não concorde com algum dos termos, solicitamos que não utilize o site ou nossos serviços.`,
  },
  {
    number: 2,
    title: "DESCRIÇÃO DOS SERVIÇOS",
    content: `A AR Consertos oferece através deste site:

- Agendamento de serviços de conserto de eletrodomésticos (convencionais e inverter)
- Venda de produtos e acessórios revisados
- Acompanhamento de ordens de serviço e garantias
- Atendimento ao cliente via chat e formulários de contato`,
  },
  {
    number: 3,
    title: "CADASTRO E RESPONSABILIDADES DO USUÁRIO",
    content: `Ao criar uma conta no site, você declara que:

- É maior de 18 anos ou possui autorização de um responsável legal
- As informações fornecidas são verdadeiras e atualizadas
- É responsável pela manutenção da senha e da segurança da sua conta
- Notificará imediatamente sobre qualquer uso não autorizado da sua conta`,
  },
  {
    number: 4,
    title: "AGENDAMENTO E EXECUÇÃO DE SERVIÇOS",
    content: `O agendamento realizado através do site é uma solicitação de serviço. O valor final será definido após diagnóstico técnico presencial do equipamento.

- Os preços exibidos no site são referências com desconto sobre a tabela base
- O diagnóstico inicial é gratuito para novos clientes
- O prazo de execução varia conforme a complexidade do reparo (1 a 3 dias úteis em média)
- A AR Consertos se reserva o direito de recusar serviços que apresentem risco ao técnico`,
  },
  {
    number: 5,
    title: "GARANTIA",
    content: `Todos os serviços de reparo contam com garantia de 90 dias, contados a partir da data de conclusão da Ordem de Serviço, exceto:

- Danos causados por mau uso, quedas ou quedas de energia
- Defeitos não relacionados ao reparo executado
- Intervenções realizadas por terceiros após a conclusão do serviço
- Produtos recondicionados possuem garantia de 30 dias para defeitos de fabricação`,
  },
  {
    number: 6,
    title: "FORMAS DE PAGAMENTO",
    content: `Aceitamos as seguintes formas de pagamento:

- Dinheiro: pagamento na entrega do equipamento
- PIX: pagamento antecipado ou na entrega
- Cartão de Crédito/Débito: parcelamento em até 3x sem juros no cartão de crédito`,
  },
  {
    number: 7,
    title: "POLÍTICA DE CANCELAMENTO",
    content: `- O cancelamento antes da execução do serviço pode ser feito sem custos
- Após início da execução, será cobrado o valor do diagnóstico e deslocamento
- Produtos adquiridos podem ser devolvidos em até 7 dias corridos, desde que embalados e sem uso`,
  },
  {
    number: 8,
    title: "PROPRIEDADE INTELECTUAL",
    content: `Todo o conteúdo do site (textos, imagens, logotipos, ícones, código-fonte) é de propriedade da AR Consertos ou de seus licenciadores e é protegido pelas leis de propriedade intelectual.

É vedada a reprodução, distribuição, modificação ou qualquer uso não autorizado do conteúdo sem autorização prévia por escrito.`,
  },
  {
    number: 9,
    title: "LIMITAÇÃO DE RESPONSABILIDADE",
    content: `A AR Consertos não se responsabiliza por:

- Danos indiretos decorrentes do uso dos serviços
- Perdas de dados causadas por problemas técnicos alheios ao nosso controle
- Interrupções temporárias do site para manutenção
- Links para sites de terceiros acessíveis através do nosso site`,
  },
  {
    number: 10,
    title: "PRIVACIDADE",
    content: `O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, em conformidade com a LGPD (Lei nº 13.709/2018).`,
    isLink: true,
  },
  {
    number: 11,
    title: "FORO",
    content: `Fica eleito o foro da Comarca de Itabaiana, Estado de Sergipe, para dirimir quaisquer questões oriundas destes Termos de Uso, com renúncia a qualquer outro, por mais privilegiado que seja.`,
  },
  {
    number: 12,
    title: "CONTATO",
    content: null,
  },
];

export default function TermosDeUsoPage() {
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
              TERMOS DE USO
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: "#E30613" }}
            >
              AR Consertos
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
            A <span className="font-semibold text-white">AR Consertos</span>, com sede em
            Itabaiana/SE, estabelece estes Termos de Uso para regular a utilização do nosso
            site e dos serviços oferecidos. Ao utilizar nossos serviços, você concorda com
            os termos aqui descritos.
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
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: "#E30613" }}
                >
                  {section.number}
                </span>
                <h2
                  className="font-montserrat text-sm font-bold tracking-wide"
                  style={{ color: "#E30613" }}
                >
                  {section.title}
                </h2>
              </div>
              {section.isLink ? (
                <div className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>
                  O tratamento dos seus dados pessoais é regido pela nossa{" "}
                  <Link
                    href="/politica-de-privacidade"
                    className="underline transition-colors hover:text-white"
                    style={{ color: "#C9A84C" }}
                  >
                    Política de Privacidade
                  </Link>
                  , em conformidade com a LGPD.
                </div>
              ) : section.content ? (
                <div
                  className="whitespace-pre-line text-sm leading-relaxed"
                  style={{ color: "#a0a0a0" }}
                >
                  {section.content}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>
                    Para dúvidas sobre estes Termos de Uso:
                  </p>
                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="font-medium text-white">Anthony — AR Consertos</p>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: "#a0a0a0" }}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        <a
                          href="mailto:contato@arconsertos.com.br"
                          className="transition-colors hover:text-white hover:underline"
                        >
                          contato@arconsertos.com.br
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        <a
                          href="tel:+5579999446596"
                          className="transition-colors hover:text-white hover:underline"
                        >
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
